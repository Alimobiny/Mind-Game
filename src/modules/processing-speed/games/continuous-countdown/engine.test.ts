// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  computeRemainder,
  configForDifficulty,
  continuousCountdownDefinition as def,
} from './engine'
import type { ContinuousCountdownState } from './engine'

const SEED = 4242

/** اجرای کامل یک جلسه با پاسخ دلخواه برای هر مرحله */
function runSession(
  config: ReturnType<typeof configForDifficulty>,
  answer: (expected: number, trialIndex: number) => number | null,
): ContinuousCountdownState {
  let state = def.createSession('test-session', config, SEED)
  for (let i = 0; i < config.totalTrials; i++) {
    const step = def.nextTrial(state)
    const expected = computeRemainder(step.trial.startNumber, step.trial.subtractions)
    state = def.submitAnswer(step.state, answer(expected, i), 1500 + i)
  }
  return state
}

describe('Continuous Countdown — configForDifficulty', () => {
  it('گره‌های دشواری را درست تنظیم می‌کند و خارج از بازه خطا می‌دهد', () => {
    const c1 = configForDifficulty(1)
    expect(c1.stepCount).toBe(3)
    expect(c1.startRange).toEqual({ min: 20, max: 30 })
    expect(c1.stepRange).toEqual({ min: 1, max: 5 })

    const c5 = configForDifficulty(5)
    expect(c5.stepCount).toBe(7)
    expect(c5.startDisplayMs).toBeLessThan(c1.startDisplayMs)
    expect(c5.stepDisplayMs).toBeLessThan(c1.stepDisplayMs)
    expect(c5.totalTrials).toBe(10)

    // زمان‌بندی با سطح صریحاً سخت‌تر می‌شود (گره‌های میانی یکنواخت)
    for (let d = 2; d <= 5; d++) {
      const prev = configForDifficulty(d - 1)
      const curr = configForDifficulty(d)
      expect(curr.stepCount).toBeGreaterThan(prev.stepCount)
      expect(curr.stepDisplayMs).toBeLessThan(prev.stepDisplayMs)
    }

    expect(() => configForDifficulty(0)).toThrow(RangeError)
    expect(() => configForDifficulty(6)).toThrow(RangeError)
  })

  it('قید امکان‌پذیری همه سطح‌ها برقرار است: حداقل شروع ≥ تعداد × حداقل گام', () => {
    for (let d = 1; d <= 5; d++) {
      const c = configForDifficulty(d)
      expect(c.startRange.min).toBeGreaterThanOrEqual(c.stepCount * c.stepRange.min)
    }
  })
})

describe('Continuous Countdown — تولید قطعی مرحله', () => {
  it('seed و trialIndex یکسان → مرحله یکسان', () => {
    const s1 = def.createSession('a', configForDifficulty(3), SEED)
    const s2 = def.createSession('b', configForDifficulty(3), SEED)
    const t1 = def.nextTrial(s1).trial
    const t2 = def.nextTrial(s2).trial
    expect(t1.startNumber).toBe(t2.startNumber)
    expect(t1.subtractions).toEqual(t2.subtractions)
    expect(t1.trialIndex).toBe(0)
    expect(t1.responseWindowMs).toBeNull()
  })

  it('ریاضی باقیمانده درست است و نامنفی می‌ماند، در همهٔ سطح‌ها', () => {
    for (let d = 1; d <= 5; d++) {
      const config = configForDifficulty(d)
      let state = def.createSession('a', config, SEED)
      for (let i = 0; i < config.totalTrials; i++) {
        const step = def.nextTrial(state)
        const trial = step.trial
        state = def.submitAnswer(step.state, 0, 100)

        expect(trial.startNumber).toBeGreaterThanOrEqual(config.startRange.min)
        expect(trial.startNumber).toBeLessThanOrEqual(config.startRange.max)
        expect(trial.subtractions).toHaveLength(config.stepCount)

        // باقیماندهٔ در حال اجرا بعد از هر کم‌شدن نامنفی می‌ماند
        let running = trial.startNumber
        for (const stepValue of trial.subtractions) {
          expect(stepValue).toBeGreaterThanOrEqual(config.stepRange.min)
          expect(stepValue).toBeLessThanOrEqual(config.stepRange.max)
          running -= stepValue
          expect(running).toBeGreaterThanOrEqual(0)
        }
        expect(computeRemainder(trial.startNumber, trial.subtractions)).toBe(running)
        // باقیماندهٔ نهایی کوچک‌تر از عدد شروع است (بازی واقعاً کم کردن دارد)
        expect(running).toBeLessThan(trial.startNumber)
      }
    }
  })

  it('مراحل مختلف یک جلسه تنوع دارند (نه همه یکسان)', () => {
    const config = configForDifficulty(4)
    let state = def.createSession('a', config, SEED)
    const seen = new Set<string>()
    for (let i = 0; i < config.totalTrials; i++) {
      const step = def.nextTrial(state)
      seen.add(`${step.trial.startNumber}|${step.trial.subtractions.join(',')}`)
      state = def.submitAnswer(step.state, 0, 100)
    }
    expect(seen.size).toBeGreaterThan(1)
  })
})

describe('Continuous Countdown — داوری پاسخ', () => {
  it('پاسخ دقیق → correct؛ پاسخ نزدیک/غلط → incorrect', () => {
    const config = configForDifficulty(2)
    const state = def.createSession('a', config, SEED)
    const { trial } = def.nextTrial(state)
    const expected = computeRemainder(trial.startNumber, trial.subtractions)

    const right = def.submitAnswer({ ...state, currentTrial: trial }, expected, 2200)
    expect(right.results[0]?.outcome).toBe('correct')
    expect(right.results[0]?.expected).toBe(expected)
    expect(right.results[0]?.reactionTimeMs).toBe(2200)

    const nearMiss = def.submitAnswer({ ...state, currentTrial: trial }, expected + 1, 2400)
    expect(nearMiss.results[0]?.outcome).toBe('incorrect')
    expect(nearMiss.results[0]?.correct).toBe(false)
  })

  it('پاسخ null (انقضا / بی‌پاسخی) به‌عنوان omission ثبت می‌شود', () => {
    const config = configForDifficulty(1)
    const state = def.createSession('a', config, SEED)
    const { trial } = def.nextTrial(state)
    const result = def.submitAnswer({ ...state, currentTrial: trial }, null, 0)
    expect(result.results[0]?.outcome).toBe('omission')
    expect(result.results[0]?.reactionTimeMs).toBeNull()
    expect(result.results[0]?.given).toBeNull()
  })

  it('ثبت پاسخ بدون مرحله فعال خطا می‌دهد', () => {
    const state = def.createSession('a', configForDifficulty(1), SEED)
    expect(() => def.submitAnswer(state, 5, 100)).toThrow()
  })
})

describe('Continuous Countdown — تکمیل و خلاصه', () => {
  it('جلسهٔ تمام‌درست: دقت ۱۰۰٪، انحراف مطلق صفر، متریک‌ها سالم', () => {
    const config = configForDifficulty(3)
    const state = runSession(config, (expected) => expected)
    expect(def.isComplete(state)).toBe(true)

    const summary = def.getSummary(state)
    expect(summary.totalTrials).toBe(10)
    expect(summary.correctTrials).toBe(10)
    expect(summary.accuracy).toBe(100)
    expect(summary.metrics['meanAbsoluteDeviation']).toBe(0)
    expect(summary.metrics['stepsPerTrial']).toBe(config.stepCount)
    // میانگین زمان پاسخ با RTهای تزریقی (1500..1599) هم‌خوان است
    expect(summary.metrics['meanAnswerTimeMs']).toBeGreaterThanOrEqual(1500)
    expect(summary.metrics['meanAnswerTimeMs']).toBeLessThanOrEqual(1600)
    expect(summary.exerciseVersion).toBe('1.0.0')
    expect(summary.exerciseId).toBe('continuous-countdown')
    expect(summary.domain).toBe('processing-speed')
  })

  it('خلاصهٔ جلسه با پاسخ‌های غلط: انحراف مطلق و omission درست حساب می‌شود', () => {
    const config = configForDifficulty(2)
    const state = runSession(config, (expected, i) => (i % 2 === 0 ? expected + 2 : null))
    const summary = def.getSummary(state)
    expect(summary.totalTrials).toBe(10)
    expect(summary.correctTrials).toBe(0)
    expect(summary.accuracy).toBe(0)
    // ۵ پاسخ غلط با انحراف +۲ → میانگین انحراف مطلق ۲
    expect(summary.metrics['meanAbsoluteDeviation']).toBe(2)
    // omissionها RT ندارند؛ میانگین فقط روی ۵ پاسخ عددی حساب شده است
    expect(summary.medianReactionTimeMs).not.toBeNull()
  })

  it('nextTrial پس از پایان جلسه خطا می‌دهد', () => {
    const config = configForDifficulty(1)
    const state = runSession(config, () => 0)
    expect(() => def.nextTrial(state)).toThrow()
  })

  it('computeRemainder: جمع خالی → عدد شروع؛ ترتیب گام‌ها بی‌تأثیر', () => {
    expect(computeRemainder(50, [])).toBe(50)
    expect(computeRemainder(50, [5, 10, 3])).toBe(32)
    expect(computeRemainder(50, [3, 10, 5])).toBe(32)
  })
})
