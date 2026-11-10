import type { RecordedTrial, TrialOutcome } from '../types'

/**
 * ابزارهای امتیازدهی مشترک.
 * نکته معماری: این ماژول فقط تجمیع داده خام را انجام می‌دهد؛
 * «معنی» درست/غلط را هر بازی در موتور خودش تعیین می‌کند
 * (مثلاً در Go/No-Go مهار موفق محرک No-Go «correct» است).
 */

/** دقت به درصد با یک رقم اعشار؛ total صفر → 0 */
export function accuracyPercent(correct: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((correct / total) * 1000) / 10
}

/** میانه؛ آرایه خالی → null (به‌جای NaN که داده را آلوده می‌کند) */
export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const lower = sorted[mid - 1]
  const upper = sorted[mid] as number
  return sorted.length % 2 === 1 ? upper : (lower! + upper) / 2
}

export function countOutcome(results: readonly RecordedTrial[], outcome: TrialOutcome): number {
  return results.reduce((count, r) => (r.outcome === outcome ? count + 1 : count), 0)
}

export interface OutcomeTotals {
  totalTrials: number
  correctTrials: number
  incorrectTrials: number
  /** 0 تا 100 */
  accuracy: number
  /** میانه زمان پاسخ مراحل پاسخ‌داده‌شده (ms) */
  medianReactionTimeMs: number | null
}

/** تجمیع استاندارد نتایج خام — مبنای ExerciseSummary همه بازی‌ها */
export function summarizeOutcomes(results: readonly RecordedTrial[]): OutcomeTotals {
  const totalTrials = results.length
  const correctTrials = results.reduce((count, r) => (r.correct ? count + 1 : count), 0)
  const reactionTimes = results
    .map((r) => r.reactionTimeMs)
    .filter((rt): rt is number => rt !== null)
  return {
    totalTrials,
    correctTrials,
    incorrectTrials: totalTrials - correctTrials,
    accuracy: accuracyPercent(correctTrials, totalTrials),
    medianReactionTimeMs: median(reactionTimes),
  }
}
