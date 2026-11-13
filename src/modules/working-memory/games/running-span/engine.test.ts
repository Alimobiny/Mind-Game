// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  configForDifficulty,
  expectedTail,
  runningSpanDefinition as def,
  tailMatchRate,
} from './engine'
import type { RunningSpanTrial } from './engine'

const SEED = 5150

describe('Running Span — engine', () => {
  it('دشواری بالاتر عمق یادآوری بیشتر و نمایش تندتری می‌دهد', () => {
    const l1 = configForDifficulty(1)
    const l3 = configForDifficulty(3)
    const l5 = configForDifficulty(5)
    expect(l1.recallDepth).toBe(3)
    expect(l3.recallDepth).toBe(4)
    expect(l5.recallDepth).toBe(5)
    expect(l1.displayMsPerDigit).toBeGreaterThan(l5.displayMsPerDigit)
    expect(l1.minLength).toBe(7)
    expect(l1.maxLength).toBe(12)
    expect(l1.totalTrials).toBe(10)
    expect(() => configForDifficulty(6)).toThrow(RangeError)
  })

  it('تولید جریان قطعی است؛ طول در بازهٔ ۷ تا ۱۲ و بدون تکرار مجاور', () => {
    const config = configForDifficulty(1)
    const s1 = def.createSession('a', config, SEED)
    const s2 = def.createSession('b', config, SEED)
    const t1 = def.nextTrial(s1).trial
    const t2 = def.nextTrial(s2).trial
    expect(t1).toEqual(t2)
    expect(t1.digits.length).toBeGreaterThanOrEqual(7)
    expect(t1.digits.length).toBeLessThanOrEqual(12)
    for (let i = 1; i < t1.digits.length; i += 1) {
      expect(t1.digits[i]).not.toBe(t1.digits[i - 1])
    }
    expect(t1.responseWindowMs).toBeNull()
  })

  it('طول جریان در جلسه متنوع است — نقطهٔ پایان واقعاً ناقطعیعیت دارد', () => {
    const config = configForDifficulty(2)
    let state = def.createSession('a', config, SEED)
    const lengths = new Set<number>()
    for (let i = 0; i < config.totalTrials; i += 1) {
      const step = def.nextTrial(state)
      lengths.add(step.trial.digits.length)
      const tail = expectedTail(step.trial.digits, step.trial.recallDepth)
      state = def.submitAnswer(step.state, tail, 2000)
    }
    expect(lengths.size).toBeGreaterThanOrEqual(3)
  })

  it('پاسخ دنبالهٔ انتظار درست، جابه‌جا و بی‌پاسخ درست ارزیابی می‌شود', () => {
    const state = def.createSession('a', configForDifficulty(1), SEED)
    const trial: RunningSpanTrial = {
      trialIndex: 0,
      digits: [4, 7, 1, 9, 2, 8, 3, 5],
      recallDepth: 4,
      displayMsPerDigit: 700,
      gapMs: 250,
      responseWindowMs: null,
    }
    // دنبالهٔ انتظار = ۴ رقم آخر: ۹ ۲ ۸ ۳ → به ترتیب [2, 8, 3, 5]
    expect(expectedTail(trial.digits, 4)).toEqual([2, 8, 3, 5])

    const hit = def.submitAnswer({ ...state, currentTrial: trial }, [2, 8, 3, 5], 1800)
    expect(hit.results[0]?.outcome).toBe('correct')

    const swapped = def.submitAnswer({ ...state, currentTrial: trial }, [2, 8, 5, 3], 1800)
    expect(swapped.results[0]?.outcome).toBe('incorrect')
    expect(swapped.results[0]?.correct).toBe(false)

    const wrongLength = def.submitAnswer({ ...state, currentTrial: trial }, [2, 8], 1800)
    expect(wrongLength.results[0]?.outcome).toBe('incorrect')

    const miss = def.submitAnswer({ ...state, currentTrial: trial }, null, 0)
    expect(miss.results[0]?.outcome).toBe('omission')
    expect(miss.results[0]?.reactionTimeMs).toBeNull()
  })

  it('tailMatchRate تطبیق جایگاهی را درست می‌شمارد', () => {
    expect(tailMatchRate([2, 8, 3, 5], [2, 8, 3, 5])).toBe(1)
    expect(tailMatchRate([2, 8, 3, 5], [2, 0, 3, 0])).toBe(0.5)
    expect(tailMatchRate([2, 8, 3, 5], [])).toBe(0)
  })

  it('summary متریک‌های تطبیق، خطای ترتیب/قلم و تهاجم آغازین را می‌سازد', () => {
    const config = configForDifficulty(1)
    let state = def.createSession('a', config, SEED)
    const trial: RunningSpanTrial = {
      trialIndex: 0,
      digits: [4, 7, 1, 9, 2, 8, 3, 5],
      recallDepth: 4,
      displayMsPerDigit: 700,
      gapMs: 250,
      responseWindowMs: null,
    }
    // دنبالهٔ انتظار: [2, 8, 3, 5]
    for (let i = 0; i < config.totalTrials; i += 1) {
      // ۵ مرحله تهاجم آغازین (۴ = رقم قدیمی فهرست) + ۵ مرحله جابه‌جایی ۳↔۵
      const answer = i % 2 === 0 ? [4, 8, 3, 5] : [2, 8, 5, 3]
      state = def.submitAnswer({ ...state, currentTrial: { ...trial, trialIndex: i } }, answer, 2000)
    }
    const summary = def.getSummary(state)
    expect(summary.totalTrials).toBe(10)
    // تهاجم: ۵ پاسخِ [4,…] هرکدام یک رقم قدیمی → ۵ از ۴۰ رقم = ۱۲٫۵٪
    expect(summary.metrics['primacyIntrusionRate']).toBe(12.5)
    expect(summary.metrics['itemErrors']).toBe(5)
    // جابه‌جایی: هر پاسخِ [2,8,5,3] دو خطای ترتیب (۵ و ۳)
    expect(summary.metrics['orderErrors']).toBe(10)
    // تطبیق: میانگین (۰٫۷۵ + ۰٫۵) / ۲
    expect(summary.metrics['lastNInOrderRate']).toBe(62.5)
    // اعتبار جزئی: میانگین (۳/۴ + ۴/۴) / ۲
    expect(summary.metrics['partialCreditScore']).toBe(87.5)
  })

  it('جلسهٔ بی‌نقص متریک‌های ۱۰۰ می‌دهد', () => {
    const config = configForDifficulty(3)
    let state = def.createSession('a', config, SEED)
    for (let i = 0; i < config.totalTrials; i += 1) {
      const step = def.nextTrial(state)
      state = def.submitAnswer(
        step.state,
        expectedTail(step.trial.digits, step.trial.recallDepth),
        2000,
      )
    }
    const summary = def.getSummary(state)
    expect(summary.accuracy).toBe(100)
    expect(summary.metrics['lastNInOrderRate']).toBe(100)
    expect(summary.metrics['itemErrors']).toBe(0)
    expect(summary.metrics['orderErrors']).toBe(0)
    expect(summary.metrics['primacyIntrusionRate']).toBe(0)
  })
})
