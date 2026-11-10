import type { CognitiveDomain } from './domain'
import type { ExerciseSummary } from './summary'

export type SessionStatus = 'in_progress' | 'completed' | 'aborted'

/**
 * رکورد جلسه در IndexedDB — یک اجرای کامل یک تمرین.
 * دقت، زمان و دشواری جداگانه ذخیره می‌شوند؛ امتیاز نهایی جایگزین
 * داده خام نمی‌شود.
 */
export interface SessionRecord {
  readonly id: string
  readonly exerciseId: string
  readonly exerciseVersion: string
  readonly contentVersion: string
  readonly domain: CognitiveDomain
  readonly difficulty: number
  readonly seed: number
  readonly status: SessionStatus
  /** epoch milliseconds */
  readonly startedAt: number
  readonly endedAt: number | null
  /** زمان فعال جلسه بدون احتساب pause — توسط SessionManager محاسبه می‌شود */
  readonly durationMs: number | null
  readonly trialCount: number
  readonly summary: ExerciseSummary | null
}
