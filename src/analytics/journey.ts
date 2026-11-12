import type { CognitiveDomain, SessionRecord } from '../core/types'
import { COGNITIVE_DOMAINS } from '../core/types'
import { computeAdaptiveDifficulty, toLocalIsoDate } from '../core/difficulty/adaptive-difficulty'
import type { AdaptiveDifficultyResult } from '../core/difficulty/adaptive-difficulty'
import type { SessionRepository } from '../data/repositories/types'
import { groupSessionsByExercise } from './dashboard'

/**
 * «سیر پیشرفت» — مشتق‌سازی خالص از تاریخچهٔ جلسات (بدون ذخیرهٔ جدید).
 * همهٔ دادهٔ خام از قبل کامل ثبت می‌شود (هر جلسه + هر مرحله)؛ این ماژول
 * همان داده را به تقویم فعالیت، رکورد روزها و نشان‌ها تبدیل می‌کند.
 *
 * قاعدهٔ صادقانه: نشان‌ها فقط بازتاب «نظم و حجم تمرین»‌اند، نه سنجش
 * توانایی ذهنی (هم‌راستا با docs/SCIENTIFIC-VALIDATION.md).
 */

/** فعالیت یک روز تقویمی — از همهٔ وضعیت‌ها (ناتمام هم فعالیت است) */
export interface DayActivity {
  readonly isoDate: string
  readonly completedSessions: number
  readonly abortedSessions: number
  readonly activeMs: number
  readonly totalTrials: number
  readonly domains: readonly CognitiveDomain[]
}

export interface JourneyStreak {
  /** روزهای پیاپی فعال تا امروز (امروزِ خالی رکورد را نمی‌شکند — فرصت امروز) */
  readonly currentDays: number
  readonly bestDays: number
  readonly totalActiveDays: number
}

export type MilestoneKind =
  | 'first-session'
  | 'domain-coverage'
  | 'session-count'
  | 'streak-days'
  | 'level-up'

export interface MilestoneProgress {
  readonly current: number
  readonly goal: number
}

export interface JourneyMilestone {
  readonly id: string
  readonly kind: MilestoneKind
  /** تاریخ دست‌یابی (iso محلی) — null یعنی قفل */
  readonly achievedIsoDate: string | null
  /** پیشرفت برای نمایش حالت قفل — فقط وقتی achievedIsoDate === null */
  readonly progress: MilestoneProgress | null
  /** فقط برای level-up: نام بازی و از/به سطح */
  readonly levelUp?: { readonly exerciseName: string; readonly from: number; readonly to: number }
}

/** آستانه‌های نشان حجم جلسات و رکورد روزها — ثابت‌های طراحی */
export const SESSION_COUNT_MILESTONES = [10, 50, 100, 250] as const
export const STREAK_DAYS_MILESTONES = [3, 7, 30] as const

export interface JourneyTotals {
  readonly completedSessions: number
  readonly activeMs: number
  readonly totalTrials: number
}

export interface JourneyData {
  readonly days: readonly DayActivity[]
  readonly streak: JourneyStreak
  readonly milestones: readonly JourneyMilestone[]
  readonly totals: JourneyTotals
  /** جلسات اخیر (جدیدترین اول) برای خط زمانی */
  readonly recentSessions: readonly SessionRecord[]
}

/** فاصلهٔ روز بین دو تاریخ iso (مثبت = آینده) — مستقل از DST */
function isoDayDiff(a: string, b: string): number {
  const toUtcDays = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number) as [number, number, number]
    return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000)
  }
  return toUtcDays(a) - toUtcDays(b)
}

function dayKeyAdd(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number]
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`
}

/** گروه‌بندی جلسات بر اساس روز تقویمی محلی — صعودی بر اساس تاریخ */
export function groupSessionsByDay(sessions: readonly SessionRecord[]): DayActivity[] {
  const byDate = new Map<string, DayActivity & { domains: CognitiveDomain[] }>()
  for (const session of sessions) {
    const iso = toLocalIsoDate(session.startedAt)
    const existing = byDate.get(iso)
    if (existing) {
      byDate.set(iso, {
        isoDate: iso,
        completedSessions: existing.completedSessions + (session.status === 'completed' ? 1 : 0),
        abortedSessions: existing.abortedSessions + (session.status === 'aborted' ? 1 : 0),
        activeMs: existing.activeMs + (session.durationMs ?? 0),
        totalTrials: existing.totalTrials + session.trialCount,
        domains: existing.domains.includes(session.domain)
          ? existing.domains
          : [...existing.domains, session.domain],
      })
    } else {
      byDate.set(iso, {
        isoDate: iso,
        completedSessions: session.status === 'completed' ? 1 : 0,
        abortedSessions: session.status === 'aborted' ? 1 : 0,
        activeMs: session.durationMs ?? 0,
        totalTrials: session.trialCount,
        domains: [session.domain],
      })
    }
  }
  return [...byDate.values()].sort((a, b) => (a.isoDate < b.isoDate ? -1 : 1))
}

/** روز فعال = حداقل یک جلسهٔ «کامل» — مبنای رکورد (سبک Duolingo) */
export function computeJourneyStreak(
  days: readonly DayActivity[],
  todayIso: string,
): JourneyStreak {
  const active = new Set(days.filter((d) => d.completedSessions > 0).map((d) => d.isoDate))
  if (active.size === 0) {
    return { currentDays: 0, bestDays: 0, totalActiveDays: 0 }
  }

  // بهترین رکورد: طولانی‌ترین دنبالهٔ پیاپی
  const sorted = [...active].sort()
  let best = 1
  let run = 1
  for (let i = 1; i < sorted.length; i++) {
    run = isoDayDiff(sorted[i] as string, sorted[i - 1] as string) === 1 ? run + 1 : 1
    if (run > best) best = run
  }

  // رکورد جاری: از امروز به عقب؛ اگر امروز خالی است، از دیروز (فرصت امروز حفظ می‌شود)
  let cursor = active.has(todayIso) ? todayIso : dayKeyAdd(todayIso, -1)
  let current = 0
  while (active.has(cursor)) {
    current += 1
    cursor = dayKeyAdd(cursor, -1)
  }

  return { currentDays: current, bestDays: best, totalActiveDays: active.size }
}

/**
 * نشان‌ها از دادهٔ خام بازسازی می‌شوند:
 * اولین جلسه · پوشش هر ۷ حوزه · آستانه‌های حجم جلسه · رکورد روزها · ارتقاهای سطح.
 * ارتقاها از levelHistory دشواری تطبیقی هر بازی می‌آیند (بازسازی از داده خام).
 */
export function computeJourneyMilestones(
  sessions: readonly SessionRecord[],
  adaptiveResults: Readonly<Record<string, AdaptiveDifficultyResult>>,
  resolveExerciseName: (exerciseId: string) => string,
  bestStreakDays: number,
  activeDays: readonly DayActivity[],
): JourneyMilestone[] {
  const completed = sessions
    .filter((s) => s.status === 'completed')
    .sort((a, b) => a.startedAt - b.startedAt)
  const milestones: JourneyMilestone[] = []

  // ۱) اولین جلسه
  const first = completed[0]
  milestones.push({
    id: 'first-session',
    kind: 'first-session',
    achievedIsoDate: first ? toLocalIsoDate(first.startedAt) : null,
    progress: first ? null : { current: 0, goal: 1 },
  })

  // ۲) پوشش هر ۷ حوزه
  const seenDomains = new Set(completed.map((s) => s.domain))
  milestones.push({
    id: 'domain-coverage',
    kind: 'domain-coverage',
    achievedIsoDate:
      seenDomains.size === COGNITIVE_DOMAINS.length
        ? toLocalIsoDate((completed[completed.length - 1] as SessionRecord).startedAt)
        : null,
    progress: { current: seenDomains.size, goal: COGNITIVE_DOMAINS.length },
  })

  // ۳) آستانه‌های حجم — تاریخ دست‌یابی = روزِ جلسهٔ n-اُم
  for (const threshold of SESSION_COUNT_MILESTONES) {
    const nth = completed[threshold - 1]
    milestones.push({
      id: `session-count-${threshold}`,
      kind: 'session-count',
      achievedIsoDate: nth ? toLocalIsoDate(nth.startedAt) : null,
      progress: { current: Math.min(completed.length, threshold), goal: threshold },
    })
  }

  // ۴) رکورد روزهای پیاپی — تاریخ = روزی که دنباله برای اولین‌بار به آستانه رسید
  const sortedActive = [...activeDays].filter((d) => d.completedSessions > 0).sort((a, b) => (a.isoDate < b.isoDate ? -1 : 1))
  for (const threshold of STREAK_DAYS_MILESTONES) {
    let reachedOn: string | null = null
    let run = 0
    let prev: string | null = null
    for (const day of sortedActive) {
      run = prev !== null && isoDayDiff(day.isoDate, prev) === 1 ? run + 1 : 1
      prev = day.isoDate
      if (run >= threshold) {
        reachedOn = day.isoDate
        break
      }
    }
    milestones.push({
      id: `streak-days-${threshold}`,
      kind: 'streak-days',
      achievedIsoDate: reachedOn,
      progress: { current: Math.min(bestStreakDays, threshold), goal: threshold },
    })
  }

  // ۵) ارتقاهای سطح — هر رویداد levelHistory همهٔ بازی‌ها
  for (const [exerciseId, result] of Object.entries(adaptiveResults)) {
    for (const change of result.levelHistory) {
      if (change.reason !== 'streak-3-days') continue
      milestones.push({
        id: `level-up-${exerciseId}-${change.isoDate}`,
        kind: 'level-up',
        achievedIsoDate: change.isoDate,
        progress: null,
        levelUp: {
          exerciseName: resolveExerciseName(exerciseId),
          from: change.from,
          to: change.to,
        },
      })
    }
  }

  return milestones
}

/** سطح شدت سلول تقویم فعالیت — 0 (خالی) تا 3 (۴+ جلسه) */
export function heatLevel(completedSessions: number): 0 | 1 | 2 | 3 {
  if (completedSessions <= 0) return 0
  if (completedSessions === 1) return 1
  if (completedSessions <= 3) return 2
  return 3
}

export interface HeatCell {
  readonly isoDate: string
  readonly level: 0 | 1 | 2 | 3
  readonly completedSessions: number
}

/** ستون‌های تقویم فعالیت — هر ستون یک هفته (کهنه‌ترین اول)، ۷ سطر روز هفته */
export function buildHeatmapWeeks(
  days: readonly DayActivity[],
  todayIso: string,
  weeks = 12,
): ReadonlyArray<ReadonlyArray<HeatCell>> {
  const byDate = new Map(days.map((d) => [d.isoDate, d]))
  // هفتهٔ جاری از شنبهٔ محلی شروع می‌شود (getDay: 0=یکشنبه) — ستون آخر تا امروز
  const today = new Date(`${todayIso}T12:00:00`)
  const weekdayOffset = (today.getDay() + 1) % 7 // شنبه = 0
  const totalCells = (weeks - 1) * 7 + weekdayOffset + 1
  const columns: Array<Array<HeatCell>> = []
  for (let i = 0; i < totalCells; i++) {
    const iso = dayKeyAdd(todayIso, i - (totalCells - 1))
    const day = byDate.get(iso)
    const cell: HeatCell = {
      isoDate: iso,
      level: heatLevel(day?.completedSessions ?? 0),
      completedSessions: day?.completedSessions ?? 0,
    }
    const col = Math.floor(i / 7)
    ;(columns[col] ??= []).push(cell)
  }
  return columns
}

/** جمع‌بندی کامل سیر — هم‌سبک loadDashboard در همین پوشه.
 *  یک خواندن کامل + گروه‌بندی در حافظه؛ حلقهٔ سریالیِ listByExercise
 *  به‌ازای هر بازی (N+1) حذف شده است. */
export async function loadJourney(
  sessions: SessionRepository,
  resolveExerciseName: (exerciseId: string) => string,
  todayIso: string,
): Promise<JourneyData> {
  const all = await sessions.listRecent(Number.MAX_SAFE_INTEGER)
  const days = groupSessionsByDay(all)
  const streak = computeJourneyStreak(days, todayIso)

  const byExercise = groupSessionsByExercise(all)
  const adaptiveResults: Record<string, AdaptiveDifficultyResult> = {}
  for (const id of byExercise.keys()) {
    adaptiveResults[id] = computeAdaptiveDifficulty(
      byExercise.get(id) as SessionRecord[],
      todayIso,
    )
  }

  const milestones = computeJourneyMilestones(
    all,
    adaptiveResults,
    resolveExerciseName,
    streak.bestDays,
    days,
  )

  const completed = all.filter((s) => s.status === 'completed')
  const totals: JourneyTotals = {
    completedSessions: completed.length,
    activeMs: completed.reduce((acc, s) => acc + (s.durationMs ?? 0), 0),
    totalTrials: completed.reduce((acc, s) => acc + s.trialCount, 0),
  }

  const recentSessions = [...all].sort((a, b) => b.startedAt - a.startedAt).slice(0, 40)

  return { days, streak, milestones, totals, recentSessions }
}
