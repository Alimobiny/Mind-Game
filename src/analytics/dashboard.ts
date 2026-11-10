import type { CognitiveDomain, SessionRecord } from '../core/types'
import { computeAdaptiveDifficulty, toLocalIsoDate } from '../core/difficulty/adaptive-difficulty'
import type { AdaptiveDifficultyResult } from '../core/difficulty/adaptive-difficulty'
import type { SessionRepository } from '../data/repositories/types'

export type { AdaptiveDifficultyResult }

/**
 * تجمیع داده‌های جلسه برای داشبورد — فقط روی داده خام ذخیره‌شده
 * کار می‌کند؛ هیچ امتیاز جدیدی بازمحاسبه نمی‌شود.
 */

export interface DashboardTotals {
  readonly completedSessions: number
  readonly totalTrials: number
  readonly correctTrials: number
  readonly accuracyPercent: number | null
  readonly totalActiveMs: number
  readonly activeDomains: CognitiveDomain[]
}

export interface ExerciseProgress {
  readonly exerciseId: string
  readonly sessionCount: number
  readonly bestAccuracy: number
  readonly lastAccuracy: number | null
  /** دقت هر جلسه به ترتیب زمان (٪) — برای نمودار روند */
  readonly accuracySeries: readonly number[]
}

export async function loadDashboard(
  sessions: SessionRepository,
  recentLimit = 20,
): Promise<{ totals: DashboardTotals; recent: readonly SessionRecord[]; byExercise: readonly ExerciseProgress[] }> {
  const all = await sessions.listRecent(Number.MAX_SAFE_INTEGER)
  const completed = all.filter((s) => s.status === 'completed')

  const totalTrials = completed.reduce((sum, s) => sum + s.trialCount, 0)
  const correctTrials = completed.reduce((sum, s) => sum + (s.summary?.correctTrials ?? 0), 0)
  const totalActiveMs = completed.reduce((sum, s) => sum + (s.durationMs ?? 0), 0)

  const progressMap = new Map<string, number[]>()
  for (const session of [...completed].sort((a, b) => a.startedAt - b.startedAt)) {
    const list = progressMap.get(session.exerciseId) ?? []
    if (session.summary) list.push(session.summary.accuracy)
    progressMap.set(session.exerciseId, list)
  }

  return {
    totals: {
      completedSessions: completed.length,
      totalTrials,
      correctTrials,
      accuracyPercent: totalTrials === 0 ? null : Math.round((correctTrials / totalTrials) * 1000) / 10,
      totalActiveMs,
      activeDomains: [...new Set(completed.map((s) => s.domain))],
    },
    recent: completed.slice(0, recentLimit),
    byExercise: [...progressMap.entries()].map(([exerciseId, series]) => ({
      exerciseId,
      sessionCount: series.length,
      bestAccuracy: Math.max(...series),
      lastAccuracy: series[series.length - 1] ?? null,
      accuracySeries: series,
    })),
  }
}

/** نمودار روند ساده SVG — بدون کتابخانه بیرونی */
export function accuracySparklinePath(series: readonly number[], width = 220, height = 48): string {
  if (series.length === 0) return ''
  if (series.length === 1) {
    // تک‌جلسه: خط افقی کوتاه به‌جای نقطه نامرئی
    const y = Math.round(height - ((series[0] as number) / 100) * height)
    const x = Math.round(width / 2)
    return `M ${x - 10} ${y} L ${x + 10} ${y}`
  }
  const stepX = width / (series.length - 1)
  return series
    .map((value, i) => {
      const x = i * stepX
      const y = height - (value / 100) * height
      return `${i === 0 ? 'M' : 'L'} ${Math.round(x)} ${Math.round(y)}`
    })
    .join(' ')
}

/**
 * وضعیت دشواری تطبیقی همه تمرین‌ها — مبنای UI پیشرفت
 * (سطح پیشنهادی، رکورد روزها و تاریخچه تغییر سطح هر بازی).
 */
export async function loadProgressForExercises(
  sessions: SessionRepository,
  exerciseIds: readonly string[],
): Promise<Record<string, AdaptiveDifficultyResult>> {
  const todayIso = toLocalIsoDate(Date.now())
  const entries = await Promise.all(
    exerciseIds.map(async (exerciseId) => {
      const history = await sessions.listByExercise(exerciseId)
      return [exerciseId, computeAdaptiveDifficulty(history, todayIso)] as const
    }),
  )
  return Object.fromEntries(entries)
}
