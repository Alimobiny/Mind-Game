// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  configForDifficulty,
  numberSequenceDefinition as def,
  positionMatchRate,
} from './engine'

const SEED = 777

describe('Number Sequence — engine', () => {
  it('configForDifficulty طول توالی و زمان نمایش را بر اساس دشواری تنظیم می‌کند', () => {
    expect(configForDifficulty(1).sequenceLength).toBe(3)
    expect(configForDifficulty(5).sequenceLength).toBe(7)
    expect(() => configForDifficulty(0)).toThrow(RangeError)
    expect(() => configForDifficulty(6)).toThrow(RangeError)
  })

  it('توالی تولیدشده قطعی است: seed و trialIndex یکسان → نتیجه یکسان', () => {
    const s1 = def.createSession('a', configForDifficulty(3), SEED)
    const s2 = def.createSession('b', configForDifficulty(3), SEED)
    const t1 = def.nextTrial(s1).trial
    const t2 = def.nextTrial(s2).trial
    expect(t1.digits).toEqual(t2.digits)
    expect(t1.trialIndex).toBe(0)
    expect(t1.responseWindowMs).toBeNull()
  })

  it('ارقام متمایز و در بازه ۰..۹ هستند و توالی‌های مختلف برای مراحل مختلف', () => {
    const state = def.createSession('a', configForDifficulty(5), SEED)
    const seen = new Set<string>()
    for (let i = 0; i < 6; i++) {
      let current = state
      for (let j = 0; j < i; j++) {
        const step = def.nextTrial(current)
        current = def.submitAnswer(step.state, step.trial.digits, 500)
      }
      const step = def.nextTrial(current)
      const digits = step.trial.digits
      expect(new Set(digits).size).toBe(digits.length)
      expect(digits.every((d) => d >= 0 && d <= 9)).toBe(true)
      expect(digits).toHaveLength(7)
      seen.add(digits.join(','))
    }
    // توالی‌ها بین مراحل تنوع دارند
    expect(seen.size).toBeGreaterThan(1)
  })

  it('پاسخ کاملاً درست → correct؛ پاسخ ناقص → incorrect با موقعیت‌های درست جزئی', () => {
    const state = def.createSession('a', configForDifficulty(2), SEED)
    const { trial } = def.nextTrial(state)
    const correct = def.submitAnswer({ ...state, currentTrial: trial }, trial.digits, 900)
    expect(correct.results[0]?.outcome).toBe('correct')
    expect(correct.results[0]?.expected).toEqual(trial.digits)
    expect(correct.results[0]?.reactionTimeMs).toBe(900)

    // فقط رقم اول درست
    const partial = def.submitAnswer(
      { ...state, currentTrial: trial },
      [trial.digits[0] as number, 0, 0, 0],
      950,
    )
    expect(partial.results[0]?.outcome).toBe('incorrect')
    expect(partial.results[0]?.correct).toBe(false)
  })

  it('پاسخ null به‌عنوان omission ثبت می‌شود', () => {
    const state = def.createSession('a', configForDifficulty(1), SEED)
    const { trial } = def.nextTrial(state)
    const result = def.submitAnswer({ ...state, currentTrial: trial }, null, 0)
    expect(result.results[0]?.outcome).toBe('omission')
    expect(result.results[0]?.reactionTimeMs).toBeNull()
  })

  it('جلسه بعد از ۱۰ مرحله کامل و summary متریک‌های اختصاصی دارد', () => {
    const config = configForDifficulty(3)
    let state = def.createSession('a', config, SEED)
    for (let i = 0; i < config.totalTrials; i++) {
      const step = def.nextTrial(state)
      state = def.submitAnswer(step.state, step.trial.digits, 1200)
    }
    expect(def.isComplete(state)).toBe(true)
    const summary = def.getSummary(state)
    expect(summary.totalTrials).toBe(10)
    expect(summary.correctTrials).toBe(10)
    expect(summary.accuracy).toBe(100)
    expect(summary.metrics['sequenceLength']).toBe(5)
    expect(summary.metrics['meanCorrectPositionRate']).toBe(100)
    expect(summary.exerciseVersion).toBe('1.0.0')
  })

  it('nextTrial بیش از حد مجاز خطا می‌دهد', () => {
    const config = configForDifficulty(1)
    let state = def.createSession('a', config, SEED)
    for (let i = 0; i < config.totalTrials; i++) {
      const step = def.nextTrial(state)
      state = def.submitAnswer(step.state, step.trial.digits, 500)
    }
    expect(() => def.nextTrial(state)).toThrow()
  })

  it('positionMatchRate درست محاسبه می‌شود', () => {
    expect(positionMatchRate([1, 2, 3], [1, 2, 3])).toBe(1)
    expect(positionMatchRate([1, 2, 3], [1, 9, 3])).toBeCloseTo(2 / 3)
    expect(positionMatchRate([1, 2], [3, 4, 5])).toBe(0)
    expect(positionMatchRate([], [])).toBe(0)
  })
})
