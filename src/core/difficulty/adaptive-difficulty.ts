import type { SessionRecord } from '../types'

/**
 * دشواری تطبیقی مبتنی بر قاعده (Rule-Based Adaptive)
 *
 * قوانین (مصوب کاربر):
 *  - جلسه «موفق» = completed با دقت ≥ ۸۰٪ در سطح پیشنهادیِ آن زمان
 *  - افزایش: ۳ روز تقویمی متوالی که هر کدام ≥۱ جلسه موفق دارند → +۱ سطح (تا سقف)
 *  - کاهش: روزِ تمرین که بهترین دقتش < ۵۰٪ است → −۱ سطح (تا کف ۱) + شکست رکورد
 *  - روز بی‌تمرین یا فقط-دستی → فقط رکورد می‌شکند
 *  - جلسات سطح دستی، در ارزیابی لحاظ نمی‌شوند
 *
 * این ماژول یک تابع خالص است: از تاریخچه خام جلسات (SessionRecord) سطح
 * فعلی را بازمیسازد — هیچ وضعیت جداگانه‌ای ذخیره نمی‌شود؛ بنابراین
 * تغییر سطح همیشه از داده خام قابل ردیابی است.
 */

export const ACCURACY_LEVEL_UP_THRESHOLD = 80
export const ACCURACY_LEVEL_DROP_THRESHOLD = 50
export const STREAK_DAYS_FOR_LEVEL_UP = 3
export const MIN_LEVEL = 1
export const MAX_LEVEL = 5

export type LevelChangeReason = 'streak-3-days' | 'weak-day'

export interface LevelChange {
  readonly isoDate: string
  readonly from: number
  readonly to: number
  readonly reason: LevelChangeReason
}

export interface AdaptiveDifficultyResult {
  readonly recommendedLevel: number
  /** روزهای متوالی موفقِ منتهی به آخرین روز تمرین (اگر فاصله تا امروز > ۱ روز شده، صفر) */
  readonly streakDays: number
  readonly streakNeededDays: number
  readonly levelHistory: readonly LevelChange[]
  readonly lastPlayedIsoDate: string | null
  readonly totalSessions: number
  /** آیا امروز در سطح پیشنهادی نهایی، جلسه موفق ثبت شده است؟ */
  readonly todayQualified: boolean
}

/** تاریخ local به شکل yyyy-mm-dd */
export function toLocalIsoDate(epochMs: number): string {
  const d = new Date(epochMs)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** تبدیل ISO به timestamp UTC برای محاسبه فاصله روزها (مستقل از DST) */
function isoToUtcDays(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number) as [number, number, number]
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000)
}

/**
 * محاسبه سطح پیشنهادی فعلی از تاریخچه جلسات یک بازی.
 * `todayIso` برای تست‌پذیری تزریق می‌شود (در اپ: toLocalIsoDate(Date.now())).
 */
export function computeAdaptiveDifficulty(
  sessions: readonly SessionRecord[],
  todayIso: string,
  maxLevel: number = MAX_LEVEL,
): AdaptiveDifficultyResult {
  const completed = sessions
    .filter((s) => s.status === 'completed')
    .sort((a, b) => a.startedAt - b.startedAt)

  // گروه‌بندی بر اساس روز — فقط اولین جلسه هر روز ملاک نیست؛ بهترین دقت روز ملاک است
  const days = new Map<string, SessionRecord[]>()
  for (const session of completed) {
    const iso = toLocalIsoDate(session.startedAt)
    const list = days.get(iso)
    if (list) list.push(session)
    else days.set(iso, [session])
  }

  let level = MIN_LEVEL
  let streak = 0
  let lastProcessedUtcDays: number | null = null
  const levelHistory: LevelChange[] = []

  for (const [isoDate, daySessions] of [...days.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const utcDays = isoToUtcDays(isoDate)

    // روز جاافتاده بین دو روز تمرین → رکورد می‌شکند
    if (lastProcessedUtcDays !== null && utcDays - lastProcessedUtcDays > 1) {
      streak = 0
    }
    lastProcessedUtcDays = utcDays

    // فقط جلسات هم‌سطح با سطح فعلیِ شبیه‌سازی در ارزیابی لحاظ می‌شوند
    const atCurrentLevel = daySessions.filter((s) => s.difficulty === level)
    if (atCurrentLevel.length === 0) {
      // روزِ فقط-دستی: مثل روز بی‌تمرین — سطح ثابت، ولی رکورد می‌شکند
      streak = 0
      continue
    }
    const bestAccuracy = Math.max(...atCurrentLevel.map((s) => s.summary?.accuracy ?? 0))

    if (bestAccuracy >= ACCURACY_LEVEL_UP_THRESHOLD) {
      streak += 1
      if (streak >= STREAK_DAYS_FOR_LEVEL_UP && level < maxLevel) {
        levelHistory.push({ isoDate, from: level, to: level + 1, reason: 'streak-3-days' })
        level += 1
        streak = 0
      }
    } else if (bestAccuracy < ACCURACY_LEVEL_DROP_THRESHOLD) {
      if (level > MIN_LEVEL) {
        levelHistory.push({ isoDate, from: level, to: level - 1, reason: 'weak-day' })
        level -= 1
      }
      streak = 0
    } else {
      // روز معمولی (۵۰ تا ۸۰): نه موفق، نه ضعیف — رکورد می‌شکند
      streak = 0
    }
  }

  // رکورد فقط تا دیروز معتبر می‌ماند؛ اگر آخرین تمرین ۲+ روز قبل بوده، شکسته است
  let lastPlayedIsoDate: string | null = null
  if (days.size > 0) {
    const lastIso = [...days.keys()].sort().at(-1) as string
    lastPlayedIsoDate = lastIso
    const gapToToday = isoToUtcDays(todayIso) - isoToUtcDays(lastIso)
    if (gapToToday > 1) streak = 0
  }

  // آیا امروز (در سطح نهایی) جلسه موفق بوده؟
  const todaySessions = (days.get(todayIso) ?? []).filter((s) => s.difficulty === level)
  const todayQualified =
    todaySessions.some((s) => (s.summary?.accuracy ?? 0) >= ACCURACY_LEVEL_UP_THRESHOLD)

  return {
    recommendedLevel: level,
    streakDays: streak,
    streakNeededDays: STREAK_DAYS_FOR_LEVEL_UP,
    levelHistory,
    lastPlayedIsoDate,
    totalSessions: completed.length,
    todayQualified,
  }
}

/** توصیف فارسی وضعیت رکورد برای UI */
export function describeStreakFa(result: AdaptiveDifficultyResult): string {
  if (result.recommendedLevel >= MAX_LEVEL && result.streakDays === 0) {
    return 'در بالاترین سطح هستی'
  }
  return `رکورد ${toFa(result.streakDays)} از ${toFa(result.streakNeededDays)} روز`
}

function toFa(n: number): string {
  return String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)] as string)
}
