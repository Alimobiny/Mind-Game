// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { SeededRandom } from '../../../../core/randomization/seeded-random'
import { deriveTrialSeed } from '../../../../core/randomization/derive-seed'
import {
  configForDifficulty,
  generateFamilySequence,
  sequenceLogicDefinition as def,
  type SequenceLogicConfig,
  type SequenceLogicTrial,
} from './engine'

const SEED = 911

/** اجرای کامل یک جلسه و جمع‌آوری محرک‌ها با پاسخ همیشه درست */
function collectTrials(config: SequenceLogicConfig, seed: number): SequenceLogicTrial[] {
  let state = def.createSession('a', config, seed)
  const trials: SequenceLogicTrial[] = []
  for (let i = 0; i < config.totalTrials; i++) {
    const step = def.nextTrial(state)
    trials.push(step.trial)
    state = def.submitAnswer(step.state, step.trial.answer, 500)
  }
  return trials
}

describe('Sequence Logic — engine', () => {
  it('تنظیمات دشواری ۱ تا ۵ درست ساخته می‌شود و خارج بازه خطا می‌دهد', () => {
    expect(configForDifficulty(1)).toEqual({
      difficulty: 1,
      totalTrials: 12,
      families: ['arithmetic'],
      shownLength: 5,
      bigNumbers: false,
    })
    // هر سطح دقیقاً یک خانوازه تازه باز می‌کند
    expect(configForDifficulty(2).families).toEqual(['arithmetic', 'geometric'])
    expect(configForDifficulty(3).families).toEqual(['arithmetic', 'geometric', 'alternating'])
    expect(configForDifficulty(4).families).toEqual([
      'arithmetic',
      'geometric',
      'alternating',
      'quadratic',
    ])
    expect(configForDifficulty(5)).toEqual({
      difficulty: 5,
      totalTrials: 12,
      families: ['arithmetic', 'geometric', 'alternating', 'quadratic', 'fibonacci'],
      shownLength: 6,
      bigNumbers: true,
    })
    expect(() => configForDifficulty(0)).toThrow(RangeError)
    expect(() => configForDifficulty(6)).toThrow(RangeError)
  })

  it('تولید محرک با seed یکسان قطعی است و seed متفاوت دنباله را عوض می‌کند', () => {
    const config = configForDifficulty(5)
    const runA = collectTrials(config, SEED)
    const runB = collectTrials(config, SEED)
    expect(runB).toEqual(runA)
    const runC = collectTrials(config, SEED + 1)
    expect(runC).not.toEqual(runA)
  })

  it('مرحله اول سطح ۱ با seed ثابت، دقیقاً همان توالی از پیش دست‌حساب‌شده را می‌سازد', () => {
    const state = def.createSession('hand', configForDifficulty(1), SEED)
    const { trial } = def.nextTrial(state)
    expect(trial.trialIndex).toBe(0)
    expect(trial.responseWindowMs).toBeNull()
    // قاعده حسابی با a=۱۶ و k=۹؛ گزینه‌های انحرافی ۷۰ (=۶۱+۹)، ۶۰ (=۶۱−۱) و ۱۲۲ (=۲×۶۱)
    expect([...trial.shown, trial.answer]).toEqual([16, 25, 34, 43, 52, 61])
    expect(trial.options).toEqual([61, 70, 60, 122])
  })

  it('در کل جلسه ۱۲ مرحله‌ای سطح ۵ همه ناوردایی‌ها برقرارند', () => {
    const config = configForDifficulty(5)
    const trials = collectTrials(config, SEED)
    expect(trials).toHaveLength(12)
    for (const t of trials) {
      expect(t.responseWindowMs).toBeNull()
      // ۴ گزینه متمایز که پاسخ دقیقاً یک‌بار در آن‌هاست
      expect(t.options).toHaveLength(4)
      expect(new Set(t.options).size).toBe(4)
      expect(t.options.filter((o) => o === t.answer)).toHaveLength(1)
      // همه مقادیر (جمله‌ها، پاسخ و گزینه‌ها) صحیح و در بازه (۰، ۵۰۰)
      for (const v of [...t.shown, t.answer, ...t.options]) {
        expect(Number.isInteger(v)).toBe(true)
        expect(v).toBeGreaterThan(0)
        expect(v).toBeLessThan(500)
      }
      // جمله‌های نمایش‌داده‌شده متمایزند و با گزینه‌ها همپوشانی ندارند
      expect(new Set(t.shown).size).toBe(t.shown.length)
      for (const o of t.options) {
        expect(t.shown).not.toContain(o)
      }
      // طول پیشوند: ۶ در سطح ۵ (هندسی با نسبت ۳ حداکثر ۵ جمله نشان می‌دهد)
      expect(t.shown.length).toBeGreaterThanOrEqual(5)
      expect(t.shown.length).toBeLessThanOrEqual(6)
    }
  })

  it('مولد مستقیم خانواده حسابی: اختلاف متوالی‌ها ثابت و مثبت است', () => {
    const config = configForDifficulty(1)
    for (let i = 0; i < 20; i++) {
      const rng = new SeededRandom(deriveTrialSeed(SEED, i))
      const seq = generateFamilySequence(rng, 'arithmetic', config)
      const all = [...seq.shown, seq.answer]
      const d = (all[1] as number) - (all[0] as number)
      expect(d).toBeGreaterThan(0)
      expect(d).toBe(seq.step)
      for (let j = 1; j < all.length; j++) {
        expect((all[j] as number) - (all[j - 1] as number)).toBe(d)
      }
    }
  })

  it('مولد مستقیم خانواده هندسی: نسبت متوالی‌ها همیشه ۲ یا ۳ است', () => {
    const config = configForDifficulty(5)
    for (let i = 0; i < 20; i++) {
      const rng = new SeededRandom(deriveTrialSeed(SEED, i))
      const seq = generateFamilySequence(rng, 'geometric', config)
      const all = [...seq.shown, seq.answer]
      expect(seq.step).toBe(all.length > 1 ? (all[1] as number) / (all[0] as number) : seq.step)
      expect([2, 3]).toContain(seq.step)
      for (let j = 1; j < all.length; j++) {
        expect((all[j] as number) / (all[j - 1] as number)).toBe(seq.step)
      }
      // پاسخ همیشه زیر سقف ۴۹۹ می‌ماند (با نسبت ۳ پیشوند کوتاه‌تر است)
      expect(seq.answer).toBeLessThan(500)
    }
  })

  it('مولد مستقیم خانواده متناوب: گام‌ها +k1 و −k2 تکرار می‌شوند', () => {
    const config = configForDifficulty(3)
    for (let i = 0; i < 20; i++) {
      const rng = new SeededRandom(deriveTrialSeed(SEED, i))
      const seq = generateFamilySequence(rng, 'alternating', config)
      const all = [...seq.shown, seq.answer]
      const diffs = all.slice(1).map((v, idx) => v - (all[idx] as number))
      // گام‌های فرد +k1 (مثبت) و گام‌های زوج −k2 (منفی)
      for (let j = 0; j < diffs.length; j++) {
        const d = diffs[j] as number
        expect(d > 0).toBe(j % 2 === 0)
      }
      const k1 = diffs[0] as number
      const k2 = -(diffs[1] as number)
      expect(k1).not.toBe(k2)
      expect(k1).toBe(seq.step)
      for (let j = 2; j < diffs.length; j++) {
        expect(diffs[j]).toBe(j % 2 === 0 ? k1 : -k2)
      }
    }
  })

  it('مولد مستقیم خانواده درجه‌دومی: اختلافِ اختلاف‌ها همیشه ۱ است', () => {
    const config = configForDifficulty(4)
    for (let i = 0; i < 20; i++) {
      const rng = new SeededRandom(deriveTrialSeed(SEED, i))
      const seq = generateFamilySequence(rng, 'quadratic', config)
      const all = [...seq.shown, seq.answer]
      const diffs = all.slice(1).map((v, idx) => v - (all[idx] as number))
      for (let j = 1; j < diffs.length; j++) {
        expect((diffs[j] as number) - (diffs[j - 1] as number)).toBe(1)
      }
      expect((diffs[diffs.length - 1] as number)).toBe(seq.step)
    }
  })

  it('مولد مستقیم خانواده فیبوناچی‌گونه: هر جمله مجموع دو جمله قبل است', () => {
    const config = configForDifficulty(5)
    for (let i = 0; i < 20; i++) {
      const rng = new SeededRandom(deriveTrialSeed(SEED, i))
      const seq = generateFamilySequence(rng, 'fibonacci', config)
      const all = [...seq.shown, seq.answer]
      // دو جمله اول متمایز (وگرنه توالی تکراری می‌شد)
      expect(all[0]).not.toBe(all[1])
      for (let j = 2; j < all.length; j++) {
        expect(all[j]).toBe((all[j - 1] as number) + (all[j - 2] as number))
      }
    }
  })

  it('هر سه نوع نتیجه (درست/غلط/بی‌پاسخی) با محرک دست‌ساز درست ارزیابی می‌شود', () => {
    const state = def.createSession('a', configForDifficulty(1), SEED)
    // +۵، −۳ تکرار می‌شود → جمله بعدی ۱۱
    const trial: SequenceLogicTrial = {
      trialIndex: 0,
      shown: [2, 7, 4, 9, 6],
      answer: 11,
      options: [8, 11, 14, 17],
      responseWindowMs: null,
    }

    const hit = def.submitAnswer({ ...state, currentTrial: trial }, 11, 420)
    expect(hit.results[0]?.outcome).toBe('correct')
    expect(hit.results[0]?.correct).toBe(true)
    expect(hit.results[0]?.reactionTimeMs).toBe(420)
    expect(hit.results[0]?.expected).toBe(11)
    expect(hit.results[0]?.given).toBe(11)
    expect(hit.results[0]?.stimulus).toEqual({ shown: [2, 7, 4, 9, 6] })

    const wrong = def.submitAnswer({ ...state, currentTrial: trial }, 8, 300)
    expect(wrong.results[0]?.outcome).toBe('incorrect')
    expect(wrong.results[0]?.correct).toBe(false)
    expect(wrong.results[0]?.given).toBe(8)

    const miss = def.submitAnswer({ ...state, currentTrial: trial }, null, 0)
    expect(miss.results[0]?.outcome).toBe('omission')
    expect(miss.results[0]?.correct).toBe(false)
    expect(miss.results[0]?.given).toBeNull()
    expect(miss.results[0]?.reactionTimeMs).toBeNull()
  })

  it('ثبت پاسخ بدون محرک فعال خطا می‌دهد', () => {
    const state = def.createSession('a', configForDifficulty(1), SEED)
    expect(() => def.submitAnswer(state, 5, 100)).toThrow()
  })

  it('جلسه کامل ۱۲ مرحله‌ای با متریک‌های اختصاصی جمع می‌شود', () => {
    const config = configForDifficulty(3)
    let state = def.createSession('a', config, SEED)
    for (let i = 0; i < config.totalTrials; i++) {
      const step = def.nextTrial(state)
      // مرحله‌های زوج درست، مرحله‌های فرد غلط (یکی بیش از پاسخ)
      const answer = i % 2 === 0 ? step.trial.answer : step.trial.answer + 1
      state = def.submitAnswer(step.state, answer, 500)
    }
    expect(def.isComplete(state)).toBe(true)
    const summary = def.getSummary(state)
    expect(summary.exerciseId).toBe('sequence-logic')
    expect(summary.domain).toBe('reasoning')
    expect(summary.totalTrials).toBe(12)
    expect(summary.correctTrials).toBe(6)
    expect(summary.accuracy).toBe(50)
    // ۶ پاسخ درست × سطح ۳ و میانگین طول پیشوند ۵ (سطح ۳ همیشه ۵ جمله)
    expect(summary.metrics['difficultyWeightedScore']).toBe(18)
    expect(summary.metrics['avgShownLength']).toBe(5)
    expect(summary.medianReactionTimeMs).toBe(500)
  })

  it('جلسه همه‌درست سطح ۵ امتیاز وزن‌دار کامل می‌گیرد', () => {
    const config = configForDifficulty(5)
    let state = def.createSession('a', config, SEED)
    for (let i = 0; i < config.totalTrials; i++) {
      const step = def.nextTrial(state)
      state = def.submitAnswer(step.state, step.trial.answer, 400)
    }
    const summary = def.getSummary(state)
    expect(summary.accuracy).toBe(100)
    expect(summary.metrics['difficultyWeightedScore']).toBe(60)
    // سطح ۵ پیشوند ۶ جمله دارد (به‌جز هندسی با نسبت ۳ که ۵ جمله نشان می‌دهد)
    expect(summary.metrics['avgShownLength']).toBeGreaterThan(5)
    expect(summary.metrics['avgShownLength']).toBeLessThanOrEqual(6)
  })

  it('nextTrial پس از اتمام ۱۲ مرحله خطا می‌دهد', () => {
    const config = configForDifficulty(1)
    let state = def.createSession('a', config, SEED)
    for (let i = 0; i < config.totalTrials; i++) {
      const step = def.nextTrial(state)
      state = def.submitAnswer(step.state, null, 0)
    }
    expect(() => def.nextTrial(state)).toThrow()
  })
})
