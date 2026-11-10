import type { CognitiveDomain } from './domain'

/**
 * خروجی استاندارد پایان جلسه؛ همه بازی‌ها همین شکل را تولید می‌کنند.
 * معیارهای اختصاصی هر بازی در metrics با کلیدهای خودش قرار می‌گیرند
 * تا امتیازدهی بازی از گزارش‌گیری سراسری جدا بماند.
 */
export interface ExerciseSummary {
  readonly exerciseId: string
  readonly sessionId: string
  readonly exerciseVersion: string
  readonly contentVersion: string
  readonly domain: CognitiveDomain
  readonly difficulty: number
  readonly totalTrials: number
  readonly correctTrials: number
  readonly incorrectTrials: number
  /** 0 تا 100 */
  readonly accuracy: number
  readonly medianReactionTimeMs: number | null
  /** معیارهای اختصاصی بازی (همیشه عدد) */
  readonly metrics: Readonly<Record<string, number>>
}
