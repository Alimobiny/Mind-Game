import { describe, expect, it } from 'vitest'
import { configForDifficulty, numberComparisonDefinition as def } from './engine'
import type { NumberComparisonConfig, NumberComparisonTrial } from './engine'

const SEED = 4242

/** پاسخ همیشه-درست برای یک مرحله */
const correctAnswer = (trial: NumberComparisonTrial): 'left' | 'right' =>
  trial.left > trial.right ? 'left' : 'right'

/** پاسخ همیشه-غلط (سمت کوچک‌تر) برای یک مرحله */
const wrongAnswer = (trial: NumberComparisonTrial): 'left' | 'right' =>
  trial.left > trial.right ? 'right' : 'left'

/** اجرای کامل یک جلسه با استراتژی پاسخ دلخواه (زمان تزریقی ۵۰۰+i) */
function runSession(
  config: NumberComparisonConfig,
  answer: (trial: NumberComparisonTrial, index: number) => 'left' | 'right' | null,
  seed: number = SEED,
) {
  let state = def.createSession('a', config, seed)
  for (let i = 0; i < config.totalTrials; i++) {
    const step = def.nextTrial(state)
    state = def.submitAnswer(step.state, answer(step.trial, i), 500 + i)
  }
  return state
}

/** همه محرک‌های یک جلسه با seed دلخواه (بدون ثبت پاسخ — موتور اجازه می‌دهد) */
function allTrials(config: NumberComparisonConfig, seed: number): NumberComparisonTrial[] {
  let state = def.createSession('a', config, seed)
  const trials: NumberComparisonTrial[] = []
  for (let i = 0; i < config.totalTrials; i++) {
    const step = def.nextTrial(state)
    trials.push(step.trial)
    state = step.state
  }
  return trials
}

describe('مقایسه اعداد — engine', () => {
  it('configForDifficulty برای هر پنج سطح جدول درست دارد و خارج بازه خطا می‌دهد', () => {
    const levels = [1, 2, 3, 4, 5].map((d) => configForDifficulty(d))
    expect(levels.map((c) => c.totalTrials)).toEqual([36, 36, 36, 36, 36])
    expect(levels.map((c) => c.minDigits)).toEqual([1, 1, 2, 3, 4])
    expect(levels.map((c) => c.maxDigits)).toEqual([1, 2, 3, 5, 8])
    // فاصله نسبی با دشواری کم می‌شود (اعداد نزدیک‌تر = سخت‌تر)
    expect(levels.map((c) => c.minRatioDistance)).toEqual([0.4, 0.3, 0.2, 0.12, 0.06])
    // فرمت‌های سخت فقط از سطح ۳
    expect(levels.map((c) => c.mixedLengthRatio)).toEqual([0, 0, 0.3, 0.35, 0.4])
    expect(levels.map((c) => c.spacedDigitRatio)).toEqual([0, 0, 0.25, 0.35, 0.45])
    // مهلت پاسخ با دشواری کوتاه‌تر می‌شود
    expect(levels.map((c) => c.responseWindowMs)).toEqual([4000, 3500, 3000, 2600, 2200])
    expect(() => configForDifficulty(0)).toThrow(RangeError)
    expect(() => configForDifficulty(6)).toThrow(RangeError)
  })

  it('تولید مرحله با seed یکسان قطعی است — کل جلسه جفتِ یکسان می‌سازد', () => {
    const config = configForDifficulty(5)
    const t1 = allTrials(config, 777)
    const t2 = allTrials(config, 777)
    expect(t1).toEqual(t2)
    // خلاصه هم با پاسخ یکسان یکسان می‌ماند (sessionId فرق دارد، seed نه)
    const s1 = runSession(config, correctAnswer, 777)
    const s2 = def.getSummary(runSession(config, correctAnswer, 777))
    expect({ ...def.getSummary(s1), sessionId: 'x' }).toEqual({ ...s2, sessionId: 'x' })
  })

  it('هیچ جفتی برابر نیست، قید فاصله نسبی و حدود طول رقم در همه ۵ سطح برقرار است', () => {
    for (const difficulty of [1, 2, 3, 4, 5]) {
      const config = configForDifficulty(difficulty)
      for (const seed of [1, 42, SEED, 99999]) {
        for (const trial of allTrials(config, seed)) {
          expect(trial.left).not.toBe(trial.right)
          const larger = Math.max(trial.left, trial.right)
          const distance = Math.abs(trial.left - trial.right)
          // همان نامساوی مولد — بدون اپسیلون
          expect(distance).toBeGreaterThanOrEqual(config.minRatioDistance * larger)
          for (const n of [trial.left, trial.right]) {
            expect(n).toBeGreaterThanOrEqual(1)
            const digits = String(n).length
            expect(digits).toBeGreaterThanOrEqual(config.minDigits)
            expect(digits).toBeLessThanOrEqual(config.maxDigits)
          }
        }
      }
    }
  })

  it('سمت بزرگ‌تر بین چپ و راست توزیع می‌شود (هیچ سمت همیشه-درست نیست)', () => {
    const config = configForDifficulty(3)
    const trials = allTrials(config, SEED)
    const largerLeft = trials.filter((t) => t.left > t.right).length
    expect(largerLeft).toBeGreaterThan(0)
    expect(largerLeft).toBeLessThan(config.totalTrials)
  })

  it('سطح ۱ و ۲: هر دو طرف همیشه عددِ یک‌پارچه و هم‌طول هستند', () => {
    for (const difficulty of [1, 2] as const) {
      const config = configForDifficulty(difficulty)
      for (const trial of allTrials(config, SEED)) {
        expect(trial.leftFormat).toBe('numeral')
        expect(trial.rightFormat).toBe('numeral')
        expect(String(trial.left).length).toBe(String(trial.right).length)
      }
    }
  })

  it('سطح ۵: فرمت رشته‌رقم و اختلاف طول رقم هر دو رخ می‌دهند؛ رشته‌رقم فقط یک سمت است', () => {
    const config = configForDifficulty(5)
    // روی چند seed قطعی — با نسبت ۰٫۴۵/۰٫۴ و ۳۶ مرحله حتماً دیده می‌شوند
    const trials = [1, 2, 3, 4, 5].flatMap((seed) => allTrials(config, seed))
    expect(trials.some((t) => t.leftFormat === 'digits' || t.rightFormat === 'digits')).toBe(true)
    expect(trials.some((t) => String(t.left).length !== String(t.right).length)).toBe(true)
    // هرگز هر دو سمت هم‌زمان رشته‌رقم نمی‌شوند
    for (const t of trials) {
      expect(t.leftFormat === 'digits' && t.rightFormat === 'digits').toBe(false)
    }
  })

  it('پاسخ درست/غلط/null درست ثبت می‌شوند و expected از مقایسه دو طرف می‌آید', () => {
    const state = def.createSession('a', configForDifficulty(2), SEED)
    const trial: NumberComparisonTrial = {
      trialIndex: 0,
      left: 9,
      right: 4,
      leftFormat: 'numeral',
      rightFormat: 'numeral',
      responseWindowMs: 3500,
    }
    const withTrial = { ...state, currentTrial: trial }

    const right = def.submitAnswer(withTrial, 'left', 640)
    expect(right.results[0]?.outcome).toBe('correct')
    expect(right.results[0]?.expected).toBe('left')
    expect(right.results[0]?.given).toBe('left')
    expect(right.results[0]?.reactionTimeMs).toBe(640)

    const wrong = def.submitAnswer(withTrial, 'right', 700)
    expect(wrong.results[0]?.outcome).toBe('incorrect')
    expect(wrong.results[0]?.correct).toBe(false)
    expect(wrong.results[0]?.given).toBe('right')

    const none = def.submitAnswer(withTrial, null, 3500)
    expect(none.results[0]?.outcome).toBe('omission')
    expect(none.results[0]?.correct).toBe(false)
    expect(none.results[0]?.reactionTimeMs).toBeNull()
    expect(none.results[0]?.given).toBeNull()
    expect(none.results[0]?.stimulus).toEqual({
      left: 9,
      right: 4,
      leftFormat: 'numeral',
      rightFormat: 'numeral',
    })
  })

  it('جلسه کامل ۳۶ مرحله‌ای خلاصه می‌شود: دقت، انقضا و آمار سرعت مثبت', () => {
    const config = configForDifficulty(1)
    // ۹ پاسخ غلط، ۳ انقضای مهلت، ۲۴ پاسخ درست
    const state = runSession(config, (trial, i) => {
      if (i < 9) return wrongAnswer(trial)
      if (i < 12) return null
      return correctAnswer(trial)
    })
    expect(def.isComplete(state)).toBe(true)
    const summary = def.getSummary(state)
    expect(summary.totalTrials).toBe(36)
    expect(summary.exerciseId).toBe('number-comparison')
    expect(summary.domain).toBe('processing-speed')
    expect(summary.difficulty).toBe(1)
    expect(summary.correctTrials).toBe(24)
    expect(summary.incorrectTrials).toBe(12)
    expect(summary.accuracy).toBeCloseTo(66.7, 1)
    expect(summary.metrics['timeoutErrors']).toBe(3)
    // پاسخ‌های درست i=12..35 با زمان ۵۱۲..۵۳۵ (۲۴ عدد؛ تقارن حول ۵۲۳٫۵)
    expect(summary.metrics['meanReactionTimeMs']).toBe(524)
    expect(summary.metrics['medianReactionTimeMs']).toBe(524)
  })

  it('میانه و میانگین زمان فقط پاسخ‌های درست را می‌شمارد و بدون پاسخ درست صفر است', () => {
    const config = configForDifficulty(2)
    let state = def.createSession('a', config, SEED)
    for (let i = 0; i < config.totalTrials; i++) {
      const step = def.nextTrial(state)
      if (i < 10) {
        // غلطِ سریع — نباید در آمار سرعت بیاید
        state = def.submitAnswer(step.state, wrongAnswer(step.trial), 100)
      } else if (i < 13) {
        state = def.submitAnswer(step.state, null, 0)
      } else {
        state = def.submitAnswer(step.state, correctAnswer(step.trial), 400 + i * 10)
      }
    }
    const summary = def.getSummary(state)
    // پاسخ‌های درست: i=13..35 → rt=530,540,…,750 (۲۳ عدد؛ تقارن حول ۶۴۰)
    const correctRts: number[] = []
    for (let i = 13; i < 36; i++) correctRts.push(400 + i * 10)
    const mean = Math.round(correctRts.reduce((s, v) => s + v, 0) / correctRts.length)
    expect(summary.correctTrials).toBe(23)
    expect(summary.metrics['meanReactionTimeMs']).toBe(mean)
    expect(summary.metrics['medianReactionTimeMs']).toBe(640)
    expect(summary.metrics['timeoutErrors']).toBe(3)

    // جلسهٔ کاملاً بی‌پاسخ: آمار سرعت صفر و همه omission
    const nullSummary = def.getSummary(runSession(config, () => null))
    expect(nullSummary.correctTrials).toBe(0)
    expect(nullSummary.metrics['meanReactionTimeMs']).toBe(0)
    expect(nullSummary.metrics['medianReactionTimeMs']).toBe(0)
    expect(nullSummary.metrics['timeoutErrors']).toBe(36)
  })

  it('nextTrial پس از اتمام مرحله‌ها خطا می‌دهد و ثبت پاسخ بدون محرک خطا می‌دهد', () => {
    const config = configForDifficulty(2)
    let state = def.createSession('a', config, SEED)
    for (let i = 0; i < config.totalTrials; i++) {
      const step = def.nextTrial(state)
      state = def.submitAnswer(step.state, null, 0)
    }
    expect(def.isComplete(state)).toBe(true)
    expect(() => def.nextTrial(state)).toThrow()
    expect(() => def.submitAnswer(state, 'left', 100)).toThrow()
  })
})
