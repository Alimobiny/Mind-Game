import { describe, expect, it } from 'vitest'
import type { RecordedTrial } from '../types'
import { accuracyPercent, countOutcome, median, summarizeOutcomes } from './scoring'

function trial(partial: Partial<RecordedTrial>): RecordedTrial {
  return {
    trialIndex: 0,
    stimulus: null,
    expected: null,
    given: null,
    outcome: 'correct',
    correct: true,
    reactionTimeMs: 100,
    ...partial,
  }
}

describe('scoring utilities', () => {
  it('accuracyPercent درست محاسبه می‌کند و total صفر → 0', () => {
    expect(accuracyPercent(17, 20)).toBe(85)
    expect(accuracyPercent(1, 3)).toBe(33.3)
    expect(accuracyPercent(0, 5)).toBe(0)
    expect(accuracyPercent(0, 0)).toBe(0)
  })

  it('median با تعداد فرد و زوج درست است؛ خالی → null', () => {
    expect(median([5])).toBe(5)
    expect(median([3, 1, 2])).toBe(2)
    expect(median([4, 1, 3, 2])).toBe(2.5)
    expect(median([])).toBeNull()
  })

  it('countOutcome فقط نوع خواسته‌شده را می‌شمارد', () => {
    const results = [
      trial({ outcome: 'correct' }),
      trial({ outcome: 'correct' }),
      trial({ outcome: 'omission' }),
      trial({ outcome: 'commission' }),
    ]
    expect(countOutcome(results, 'correct')).toBe(2)
    expect(countOutcome(results, 'omission')).toBe(1)
    expect(countOutcome(results, 'commission')).toBe(1)
    expect(countOutcome(results, 'incorrect')).toBe(0)
  })

  it('summarizeOutcomes دقت و میانه RT مراحل پاسخ‌داده‌شده را می‌سازد', () => {
    const results = [
      trial({ trialIndex: 0, correct: true, reactionTimeMs: 300 }),
      trial({ trialIndex: 1, correct: true, reactionTimeMs: 500 }),
      trial({ trialIndex: 2, correct: false, outcome: 'incorrect', reactionTimeMs: 200 }),
      // omission بدون RT: در میانه لحاظ نمی‌شود
      trial({ trialIndex: 3, correct: false, outcome: 'omission', reactionTimeMs: null }),
    ]
    const totals = summarizeOutcomes(results)
    expect(totals.totalTrials).toBe(4)
    expect(totals.correctTrials).toBe(2)
    expect(totals.incorrectTrials).toBe(2)
    expect(totals.accuracy).toBe(50)
    expect(totals.medianReactionTimeMs).toBe(300)
  })

  it('summarizeOutcomes با لیست خالی مقدار امن برمی‌گرداند', () => {
    const totals = summarizeOutcomes([])
    expect(totals.totalTrials).toBe(0)
    expect(totals.accuracy).toBe(0)
    expect(totals.medianReactionTimeMs).toBeNull()
  })
})
