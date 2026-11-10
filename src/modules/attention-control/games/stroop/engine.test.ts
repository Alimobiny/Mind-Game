import { describe, expect, it } from 'vitest'
import {
  configForDifficulty,
  STROOP_COLORS,
  stroopDefinition as def,
  type StroopConfig,
  type StroopTrial,
} from './engine'

const SEED = 7373

/** اجرای کامل یک جلسه و جمع‌آوری محرک‌ها با پاسخ همیشه درست */
function collectTrials(config: StroopConfig, seed: number): StroopTrial[] {
  let state = def.createSession('a', config, seed)
  const trials: StroopTrial[] = []
  for (let i = 0; i < config.totalTrials; i++) {
    const step = def.nextTrial(state)
    trials.push(step.trial)
    state = def.submitAnswer(step.state, step.trial.ink, 500)
  }
  return trials
}

describe('Stroop — engine', () => {
  it('تنظیمات دشواری ۱ تا ۵ درست ساخته می‌شود و خارج بازه خطا می‌دهد', () => {
    expect(configForDifficulty(1)).toEqual({
      difficulty: 1,
      totalTrials: 20,
      congruentRatio: 0.5,
      responseWindowMs: 3500,
    })
    expect(configForDifficulty(3).congruentRatio).toBe(0.3)
    expect(configForDifficulty(5)).toEqual({
      difficulty: 5,
      totalTrials: 20,
      congruentRatio: 0.1,
      responseWindowMs: 2000,
    })
    // دشواری بالاتر → هم‌خوانی کمتر و پنجره پاسخ کوتاه‌تر
    expect(configForDifficulty(1).congruentRatio).toBeGreaterThan(configForDifficulty(5).congruentRatio)
    expect(configForDifficulty(1).responseWindowMs).toBeGreaterThan(configForDifficulty(5).responseWindowMs)
    expect(() => configForDifficulty(0)).toThrow(RangeError)
    expect(() => configForDifficulty(6)).toThrow(RangeError)
  })

  it('تولید محرک با seed یکسان قطعی است و seed متفاوت دنباله را عوض می‌کند', () => {
    const config = configForDifficulty(2)
    const runA = collectTrials(config, SEED)
    const runB = collectTrials(config, SEED)
    // دنباله word/ink باید مو‌به‌مو یکی باشد
    expect(runB).toEqual(runA)
    expect(runA.map((t) => [t.word, t.ink])).toEqual(runB.map((t) => [t.word, t.ink]))
    const runC = collectTrials(config, SEED + 1)
    expect(runC).not.toEqual(runA)
  })

  it('در مراحل ناهم‌خوان، رنگ جوهر هرگز با کلمه یکی نیست', () => {
    for (const difficulty of [1, 3, 5]) {
      const trials = collectTrials(configForDifficulty(difficulty), SEED)
      expect(trials).toHaveLength(20)
      for (const t of trials) {
        expect(t.responseWindowMs).toBe(configForDifficulty(difficulty).responseWindowMs)
        expect(STROOP_COLORS).toContain(t.word)
        expect(STROOP_COLORS).toContain(t.ink)
        // پرچم isCongruent باید با محتوای واقعی محرک بخواند
        expect(t.isCongruent).toBe(t.word === t.ink)
        if (!t.isCongruent) {
          expect(t.ink).not.toBe(t.word)
        }
      }
    }
  })

  it('نسبت مراحل هم‌خوان در کل جلسه با تنظیمات سازگار است', () => {
    // دشواری ۱ → نسبت هدف ۰.۵؛ بازه پذیرفتنی ۲۰٪ تا ۸۰٪
    const easy = collectTrials(configForDifficulty(1), SEED)
    const congruentRatio = easy.filter((t) => t.isCongruent).length / easy.length
    expect(congruentRatio).toBeGreaterThan(0.2)
    expect(congruentRatio).toBeLessThan(0.8)
    // دشواری ۵ → نسبت هدف ۰.۱؛ اکثریت قاطع باید ناهم‌خوان باشد
    const hard = collectTrials(configForDifficulty(5), SEED)
    const congruentHard = hard.filter((t) => t.isCongruent).length / hard.length
    expect(congruentHard).toBeLessThan(0.35)
    expect(hard.filter((t) => !t.isCongruent).length).toBeGreaterThan(0)
  })

  it('هر سه نوع نتیجه (درست/غلط/بی‌پاسخی) با محرک دست‌ساز درست ارزیابی می‌شود', () => {
    const state = def.createSession('a', configForDifficulty(1), SEED)
    const trial: StroopTrial = {
      trialIndex: 0,
      word: 'red',
      ink: 'blue', // ناهم‌خوان: کلمه «قرمز» با جوهر آبی
      isCongruent: false,
      responseWindowMs: 3500,
    }

    const hit = def.submitAnswer({ ...state, currentTrial: trial }, 'blue', 420)
    expect(hit.results[0]?.outcome).toBe('correct')
    expect(hit.results[0]?.correct).toBe(true)
    expect(hit.results[0]?.reactionTimeMs).toBe(420)
    expect(hit.results[0]?.expected).toBe('blue')
    expect(hit.results[0]?.given).toBe('blue')
    expect(hit.results[0]?.stimulus).toEqual({ word: 'red', ink: 'blue' })

    // خطای کلاسیک استروپ: خواندن معنی کلمه به‌جای رنگ جوهر
    const wrong = def.submitAnswer({ ...state, currentTrial: trial }, 'red', 300)
    expect(wrong.results[0]?.outcome).toBe('incorrect')
    expect(wrong.results[0]?.correct).toBe(false)
    expect(wrong.results[0]?.given).toBe('red')

    const miss = def.submitAnswer({ ...state, currentTrial: trial }, null, 0)
    expect(miss.results[0]?.outcome).toBe('omission')
    expect(miss.results[0]?.correct).toBe(false)
    expect(miss.results[0]?.given).toBeNull()
    expect(miss.results[0]?.reactionTimeMs).toBeNull()
  })

  it('ثبت پاسخ بدون محرک فعال خطا می‌دهد', () => {
    const state = def.createSession('a', configForDifficulty(1), SEED)
    expect(() => def.submitAnswer(state, 'red', 100)).toThrow()
  })

  it('جلسه کامل ۲۰ مرحله‌ای با متریک‌های اختصاصی جمع می‌شود', () => {
    const config = configForDifficulty(1)
    let state = def.createSession('a', config, SEED)
    for (let i = 0; i < config.totalTrials; i++) {
      const step = def.nextTrial(state)
      // پاسخ همیشه درست؛ ناهم‌خوان‌ها ۲۰۰ms کندتر (هزینه استروپ مصنوعی)
      state = def.submitAnswer(step.state, step.trial.ink, step.trial.isCongruent ? 400 : 600)
    }
    expect(def.isComplete(state)).toBe(true)
    const summary = def.getSummary(state)
    expect(summary.exerciseId).toBe('stroop')
    expect(summary.domain).toBe('attention-control')
    expect(summary.totalTrials).toBe(20)
    expect(summary.accuracy).toBe(100)
    expect(summary.metrics['congruentAccuracy']).toBe(100)
    expect(summary.metrics['incongruentAccuracy']).toBe(100)
    expect(summary.metrics['stroopCostMs']).toBe(200)
    expect(summary.medianReactionTimeMs).not.toBeNull()
  })

  it('دقت زیرمجموعه‌های هم‌خوان/ناهم‌خوان جدا محاسبه می‌شود', () => {
    const config = configForDifficulty(1)
    let state = def.createSession('a', config, SEED)
    for (let i = 0; i < config.totalTrials; i++) {
      const step = def.nextTrial(state)
      // فقط مراحل هم‌خوان را درست جواب بده؛ در ناهم‌خوان‌ها معنی کلمه را بزن (غلط)
      const answer = step.trial.isCongruent ? step.trial.ink : step.trial.word
      state = def.submitAnswer(step.state, answer, 500)
    }
    const summary = def.getSummary(state)
    expect(summary.metrics['congruentAccuracy']).toBe(100)
    expect(summary.metrics['incongruentAccuracy']).toBe(0)
    // زیرمجموعه «ناهم‌خوان درست» خالی است → هزینه استروپ ۰
    expect(summary.metrics['stroopCostMs']).toBe(0)
  })

  it('nextTrial پس از اتمام ۲۰ مرحله خطا می‌دهد', () => {
    const config = configForDifficulty(1)
    let state = def.createSession('a', config, SEED)
    for (let i = 0; i < config.totalTrials; i++) {
      const step = def.nextTrial(state)
      state = def.submitAnswer(step.state, null, 0)
    }
    expect(() => def.nextTrial(state)).toThrow()
  })
})
