import { describe, expect, it } from 'vitest'
import {
  fullRecallSetPercent,
  isFullRecall,
  isProcessingGateFailed,
  partialCreditUnitPercent,
  scoreSpanRecall,
} from './complex-span'

describe('scoreSpanRecall', () => {
  it('بازیابی کامل و به‌ترتیب = همه در جای درست', () => {
    const score = scoreSpanRecall(['آب', 'برف', 'باد'], ['آب', 'برف', 'باد'])
    expect(score.itemsInCorrectPosition).toBe(3)
    expect(score.orderErrors).toBe(0)
    expect(score.intrusionErrors).toBe(0)
    expect(isFullRecall(score)).toBe(true)
  })

  it('جابه‌جایی ترتیب = خطای ترتیب، نه تجاوز', () => {
    const score = scoreSpanRecall(['آب', 'برف', 'باد'], ['برف', 'آب', 'باد'])
    expect(score.itemsInCorrectPosition).toBe(1) // «باد» در جای درست
    expect(score.orderErrors).toBe(2)
    expect(score.intrusionErrors).toBe(0)
    expect(isFullRecall(score)).toBe(false)
  })

  it('آیتم خارج از دسته = خطای تجاوز؛ بازیابی ناقص فقط برای جای خالی امتیاز ندارد', () => {
    const score = scoreSpanRecall(['آب', 'برف', 'باد'], ['آب', 'خاک'])
    expect(score.itemsInCorrectPosition).toBe(1)
    expect(score.orderErrors).toBe(0)
    expect(score.intrusionErrors).toBe(1)
    expect(score.setLength).toBe(3)
  })

  it('تکرار آیتمِ دسته در جای غلط = خطای ترتیب', () => {
    const score = scoreSpanRecall(['آب', 'برف'], ['آب', 'آب'])
    expect(score.itemsInCorrectPosition).toBe(1)
    expect(score.orderErrors).toBe(1)
    expect(score.intrusionErrors).toBe(0)
  })

  it('بازیابی خالی = هیچ امتیازی', () => {
    const score = scoreSpanRecall(['آب', 'برف'], [])
    expect(score.itemsInCorrectPosition).toBe(0)
    expect(score.orderErrors).toBe(0)
    expect(score.intrusionErrors).toBe(0)
    expect(isFullRecall(score)).toBe(false)
  })

  it('خانهٔ عددی (دهانهٔ تقارن) هم همان تحلیل را می‌گیرد', () => {
    const score = scoreSpanRecall([3, 7, 12, 5], [3, 5, 7])
    expect(score.itemsInCorrectPosition).toBe(1)
    expect(score.orderErrors).toBe(2)
    expect(score.intrusionErrors).toBe(0)
  })
})

describe('partialCreditUnitPercent', () => {
  it('نسبت کل آیتم‌های درست در جای درست (٪) — نه میانگین سادهٔ دسته‌ها', () => {
    const scores = [
      scoreSpanRecall(['a', 'b', 'c'], ['a', 'b', 'c']), // ۳ از ۳
      scoreSpanRecall(['d', 'e'], ['d', 'x']), // ۱ از ۲
    ]
    expect(partialCreditUnitPercent(scores)).toBe(80) // ۴ از ۵
  })

  it('لیست خالی = صفر', () => {
    expect(partialCreditUnitPercent([])).toBe(0)
  })
})

describe('fullRecallSetPercent', () => {
  it('نسبت دسته‌های کامل (٪)', () => {
    const scores = [
      scoreSpanRecall(['a', 'b'], ['a', 'b']),
      scoreSpanRecall(['c', 'd'], ['d', 'c']),
      scoreSpanRecall(['e', 'f'], ['e', 'f']),
    ]
    expect(fullRecallSetPercent(scores)).toBe(67) // ۲ از ۳ → ۶۶٫۷ گرد به ۶۷
  })
})

describe('isProcessingGateFailed', () => {
  it('زیر آستانهٔ ۸۵٪ = جلسهٔ بی‌اعتبار', () => {
    expect(isProcessingGateFailed(84.9)).toBe(true)
    expect(isProcessingGateFailed(85)).toBe(false)
    expect(isProcessingGateFailed(100)).toBe(false)
  })
})
