// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  blockHeightDefinition as def,
  configForDifficulty,
  solveTotal,
  visibleFromTrial,
  type BlockHeightTrial,
} from './engine'

const SEED = 4242
/** چند seed مختلف → پوشش چیدمان‌های متنوع برای تست‌های ساختاری */
const SEEDS = [SEED, SEED + 1, SEED + 7]

/** اجرای کامل یک جلسه و جمع‌آوری مراحل (بدون ثبت پاسخ) */
function collectTrials(level: number, seed: number): BlockHeightTrial[] {
  const config = configForDifficulty(level)
  let state = def.createSession('t', config, seed)
  const trials: BlockHeightTrial[] = []
  for (let i = 0; i < config.totalTrials; i += 1) {
    const step = def.nextTrial(state)
    trials.push(step.trial)
    state = def.submitAnswer(step.state, step.trial.totalBlocks, 100)
  }
  return trials
}

describe('Block Height — engine', () => {
  it('نگاشت دشواری ۱..۵ درست است و خارج از بازه خطا می‌دهد', () => {
    for (let level = 1; level <= 5; level += 1) {
      const config = configForDifficulty(level)
      expect(config.difficulty).toBe(level)
      expect(config.totalTrials).toBe(12)
      expect(config.columns).toBeGreaterThanOrEqual(3)
      expect(config.columns).toBeLessThanOrEqual(6)
      expect(config.maxTotal).toBeLessThanOrEqual(30)
      expect(config.maxFront + 1).toBeLessThanOrEqual(config.maxBack)
      expect(config.columns * 3).toBeLessThanOrEqual(config.minTotal)
      expect(config.columns * (config.maxFront + config.maxBack)).toBeGreaterThanOrEqual(
        config.maxTotal,
      )
    }
    expect(configForDifficulty(1).columns).toBe(3)
    expect(configForDifficulty(1).minTotal).toBeGreaterThanOrEqual(8)
    expect(configForDifficulty(5).columns).toBe(6)
    expect(configForDifficulty(5).maxTotal).toBe(30)
    // پنهان‌کاری با سطح بالا زیاد می‌شود
    expect(configForDifficulty(5).maxFront).toBeGreaterThan(configForDifficulty(1).maxFront)
    expect(() => configForDifficulty(0)).toThrow(RangeError)
    expect(() => configForDifficulty(6)).toThrow(RangeError)
  })

  it('قاعدهٔ مستند برای هر مرحلهٔ همهٔ سطح‌ها دقیقاً یک پاسخ می‌دهد (= ground truth)', () => {
    for (let level = 1; level <= 5; level += 1) {
      const config = configForDifficulty(level)
      for (const seed of SEEDS) {
        for (const trial of collectTrials(level, seed)) {
          // ساختار سالم: تعداد لَن، سقف‌ها و قاعدهٔ b ≥ f+1 (بدون ستون کاملاً پنهان)
          expect(trial.columns.length, `سطح ${level} seed ${seed} مرحله ${trial.trialIndex}`).toBe(
            config.columns,
          )
          for (const col of trial.columns) {
            expect(col.frontHeight).toBeGreaterThanOrEqual(1)
            expect(col.frontHeight).toBeLessThanOrEqual(config.maxFront)
            expect(col.backHeight).toBeGreaterThan(col.frontHeight)
            expect(col.backHeight).toBeLessThanOrEqual(config.maxBack)
          }
          // مجموع در بازهٔ هدف
          expect(trial.totalBlocks).toBeGreaterThanOrEqual(config.minTotal)
          expect(trial.totalBlocks).toBeLessThanOrEqual(config.maxTotal)
          expect(trial.hiddenBlocks).toBe(
            trial.columns.reduce((sum, c) => sum + c.frontHeight, 0),
          )
          // حل‌کنندهٔ دیداری (فقط f و بیرون‌زدگی p) ⇒ همان پاسخ واحد
          expect(solveTotal(visibleFromTrial(trial))).toBe(trial.totalBlocks)
        }
      }
    }
  })

  it('همهٔ ستون‌های پشتی دست‌کم یک بلوک بیرون‌زده دارند (پنهان کامل ممنوع)', () => {
    for (let level = 1; level <= 5; level += 1) {
      for (const seed of SEEDS) {
        for (const trial of collectTrials(level, seed)) {
          for (const [i, col] of trial.columns.entries()) {
            expect(
              col.backHeight - col.frontHeight,
              `سطح ${level} مرحله ${trial.trialIndex} لَن ${i}`,
            ).toBeGreaterThanOrEqual(1)
          }
        }
      }
    }
  })

  it('با seed یکسان، دو جلسه محرک‌های عین هم تولید می‌کنند (قطعیت)', () => {
    for (let level = 1; level <= 5; level += 1) {
      const a = collectTrials(level, SEED)
      const b = collectTrials(level, SEED)
      expect(a.map((t) => t.columns)).toEqual(b.map((t) => t.columns))
      expect(a.map((t) => t.totalBlocks)).toEqual(b.map((t) => t.totalBlocks))
    }
  })

  it('هیچ دو شکل پشت‌سرهمی عین هم نیستند', () => {
    for (let level = 1; level <= 5; level += 1) {
      const trials = collectTrials(level, SEED)
      let prev: string | null = null
      for (const trial of trials) {
        const key = JSON.stringify(trial.columns)
        if (prev !== null) {
          expect(key, `سطح ${level} مرحله ${trial.trialIndex}`).not.toBe(prev)
        }
        prev = key
      }
    }
  })

  it('پاسخ درست/غلط/null درست ثبت می‌شوند', () => {
    const state = def.createSession('a', configForDifficulty(1), SEED)
    const { trial, state: s1 } = def.nextTrial(state)
    // درست
    const right = def.submitAnswer(s1, trial.totalBlocks, 900)
    expect(right.results[0]?.outcome).toBe('correct')
    expect(right.results[0]?.reactionTimeMs).toBe(900)
    // غلط — خطای مطلق ثبت‌شده در خلاصه استفاده می‌شود
    const wrong = def.submitAnswer(s1, trial.totalBlocks - 1, 800)
    expect(wrong.results[0]?.outcome).toBe('incorrect')
    expect(wrong.results[0]?.correct).toBe(false)
    expect(wrong.results[0]?.reactionTimeMs).toBe(800)
    // بی‌پاسخ (اگرچه مهلتی وجود ندارد، قرارداد باید پاسخ null را هم بسپارد)
    const none = def.submitAnswer(s1, null, 0)
    expect(none.results[0]?.outcome).toBe('omission')
    expect(none.results[0]?.reactionTimeMs).toBeNull()
  })

  it('جلسهٔ ۱۲ مرحله‌ای کامل می‌شود و خلاصهٔ درست می‌دهد', () => {
    const config = configForDifficulty(3)
    let state = def.createSession('a', config, SEED)
    // سه پاسخ اول عمداً غلط با خطای مطلق ۲ و ۱ و ۳؛ بقیه درست
    // ⇒ ۹ درست از ۱۲ = ۷۵٪ و میانگین خطای مطلق (۲+۱+۳)/۱۲ = ۰٫۵
    const offsets = [2, 1, 3]
    for (let i = 0; i < config.totalTrials; i += 1) {
      const step = def.nextTrial(state)
      const wrong = i < offsets.length
      const answer = step.trial.totalBlocks + (wrong ? offsets[i]! : 0)
      state = def.submitAnswer(step.state, answer, 4000)
      if (i === config.totalTrials - 2) expect(def.isComplete(state)).toBe(false)
    }
    expect(def.isComplete(state)).toBe(true)
    const summary = def.getSummary(state)
    expect(summary.exerciseId).toBe('block-height')
    expect(summary.domain).toBe('visual-spatial')
    expect(summary.totalTrials).toBe(12)
    expect(summary.correctTrials).toBe(9)
    expect(summary.accuracy).toBe(75)
    expect(summary.metrics['exactAnswerRate']).toBe(75)
    expect(summary.metrics['meanAbsoluteError']).toBe(0.5)
    expect(summary.medianReactionTimeMs).toBe(4000)
  })

  it('بعد از ۱۲ مرحله، تولید مرحله جدید خطا می‌دهد', () => {
    const config = configForDifficulty(1)
    let state = def.createSession('a', config, SEED)
    for (let i = 0; i < config.totalTrials; i += 1) {
      const step = def.nextTrial(state)
      state = def.submitAnswer(step.state, step.trial.totalBlocks, 100)
    }
    expect(() => def.nextTrial(state)).toThrow('همه مراحل تولید شده‌اند')
  })

  it('مرحله بی‌مهلت است (شمارش نیازمند آرامش است)', () => {
    const state = def.createSession('a', configForDifficulty(2), SEED)
    const { trial } = def.nextTrial(state)
    expect(trial.responseWindowMs).toBeNull()
  })
})
