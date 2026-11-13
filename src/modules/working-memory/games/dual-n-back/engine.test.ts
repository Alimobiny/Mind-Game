// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { configForDifficulty, dualNBackDefinition as def } from './engine'
import type { DualNBackState } from './engine'
import type { DualNBackTrial } from './engine'

/**
 * تست‌های ان-بک دوگانه — همه قطعی (بذر ثابت، بدون زمان واقعی).
 * الگو: هر محرک مستقل از پاسخ تولید می‌شود (تاریخچه در nextTrial).
 */

const SEED = 101

function generateAll(seed: number, difficulty: number) {
  const config = configForDifficulty(difficulty)
  let state = def.createSession('s1', config, seed)
  const trials: DualNBackTrial[] = []
  for (let i = 0; i < config.totalTrials; i++) {
    const next = def.nextTrial(state)
    state = next.state as DualNBackState
    trials.push(next.trial)
  }
  return { trials, config, state }
}

describe('configForDifficulty — ان-بک دوگانه', () => {
  it('جدول n و زمان‌بندی هر سطح + خطای بازه', () => {
    expect(configForDifficulty(1)).toMatchObject({ n: 1, stimulusMs: 1000, interStimulusMs: 1100 })
    expect(configForDifficulty(3)).toMatchObject({ n: 2, stimulusMs: 700, interStimulusMs: 800 })
    expect(configForDifficulty(5)).toMatchObject({ n: 3, stimulusMs: 700, interStimulusMs: 800 })
    expect(() => configForDifficulty(0)).toThrow(RangeError)
    expect(() => configForDifficulty(6)).toThrow(RangeError)
  })
})

describe('تولید محرک‌های دوگانه', () => {
  it('قطعی: بذر یکسان → دنبالهٔ یکسان (حرف و خانه)', () => {
    const a = generateAll(SEED, 2)
    const b = generateAll(SEED, 2)
    expect(a.trials.map((t) => [t.letter, t.cell])).toEqual(b.trials.map((t) => [t.letter, t.cell]))
    expect(a.trials.map((t) => [t.isLetterTarget, t.isCellTarget])).toEqual(
      b.trials.map((t) => [t.isLetterTarget, t.isCellTarget]),
    )
  })

  it('پنجرهٔ پاسخ = نمایش + فاصله؛ خانه‌ها در بازهٔ ۰..۸', () => {
    const { trials, config } = generateAll(SEED, 1)
    for (const t of trials) {
      expect(t.responseWindowMs).toBe(config.stimulusMs + config.interStimulusMs)
      expect(t.cell).toBeGreaterThanOrEqual(0)
      expect(t.cell).toBeLessThanOrEqual(8)
    }
  })

  it('n اول هر جریان هرگز هدف نیست', () => {
    for (const difficulty of [1, 2, 3, 4, 5]) {
      const { trials } = generateAll(SEED, difficulty)
      const n = configForDifficulty(difficulty).n
      for (let i = 0; i < n; i++) {
        expect(trials[i]?.isLetterTarget, `difficulty=${difficulty} i=${i}`).toBe(false)
        expect(trials[i]?.isCellTarget, `difficulty=${difficulty} i=${i}`).toBe(false)
      }
    }
  })

  it('هدف = دقیقاً مقدار N مرحله قبل؛ غیرهدف هرگز برابر N-قبل نیست', () => {
    const { trials } = generateAll(SEED, 4) // n=3
    const n = 3
    for (let i = n; i < trials.length; i++) {
      const t = trials[i] as DualNBackTrial
      const prev = trials[i - n] as DualNBackTrial
      if (t.isLetterTarget) expect(t.letter).toBe(prev.letter)
      else expect(t.letter).not.toBe(prev.letter)
      if (t.isCellTarget) expect(t.cell).toBe(prev.cell)
      else expect(t.cell).not.toBe(prev.cell)
    }
  })

  it('نرخ هدف هر جریان نزدیک ۰.۳ است', () => {
    const { trials } = generateAll(SEED, 2)
    const n = 2
    const eligible = trials.slice(n)
    const letterTargets = eligible.filter((t) => t.isLetterTarget).length
    const cellTargets = eligible.filter((t) => t.isCellTarget).length
    expect(letterTargets / eligible.length).toBeGreaterThan(0.15)
    expect(letterTargets / eligible.length).toBeLessThan(0.45)
    expect(cellTargets / eligible.length).toBeGreaterThan(0.15)
    expect(cellTargets / eligible.length).toBeLessThan(0.45)
  })
})

describe('امتیازدهی دو جریان', () => {
  function stateWith(trial: DualNBackTrial): DualNBackState {
    const config = configForDifficulty(1)
    return {
      sessionId: 's1',
      config,
      seed: 1,
      nextTrialIndex: trial.trialIndex + 1,
      currentTrial: trial,
      letters: [],
      cells: [],
      results: [],
    }
  }

  function makeTrial(overrides: Partial<DualNBackTrial>): DualNBackTrial {
    return {
      trialIndex: 1,
      letter: 'ب',
      cell: 4,
      n: 1,
      isLetterTarget: false,
      isCellTarget: false,
      stimulusMs: 1000,
      interStimulusMs: 1100,
      responseWindowMs: 2100,
      ...overrides,
    }
  }

  it('هر چهار نتیجهٔ جریان حرف + outcome ترکیبی', () => {
    // hit حرف + correctRejection مکان → correct
    let s = def.submitAnswer(
      stateWith(makeTrial({ isLetterTarget: true })),
      { letterClaimed: true, cellClaimed: false, letterRtMs: 500, cellRtMs: null },
      600,
    )
    expect(s.results[0]?.outcome).toBe('correct')
    expect(s.results[0]?.given).toMatchObject({ letterClaimed: true, cellClaimed: false })

    // miss حرف → omission
    s = def.submitAnswer(stateWith(makeTrial({ isLetterTarget: true })), null, 2100)
    expect(s.results[0]?.outcome).toBe('omission')

    // falseAlarm مکان (حرف درست) → commission مقدم است
    s = def.submitAnswer(
      stateWith(makeTrial({ isLetterTarget: true, isCellTarget: false })),
      { letterClaimed: true, cellClaimed: true, letterRtMs: 400, cellRtMs: 500 },
      600,
    )
    expect(s.results[0]?.outcome).toBe('commission')

    // هر دو خودداری درست → correct
    s = def.submitAnswer(stateWith(makeTrial({})), null, 2100)
    expect(s.results[0]?.outcome).toBe('correct')
    expect(s.results[0]?.correct).toBe(true)
  })

  it('پاسخ null = هیچ ادعایی ثبت نشده', () => {
    const s = def.submitAnswer(stateWith(makeTrial({ isLetterTarget: false })), null, 2100)
    expect(s.results[0]?.given).toMatchObject({ letterClaimed: false, cellClaimed: false })
  })
})

describe('جلسهٔ کامل', () => {
  it('۲۴ مرحله پاسخ‌داده → تکمیل + متریک‌های هشت‌گانهٔ دو جریان', () => {
    const { trials, config } = generateAll(SEED, 2)
    let state = def.createSession('s1', config, SEED)
    for (const t of trials) {
      const withTrial = { ...state, currentTrial: t, nextTrialIndex: t.trialIndex + 1 }
      const answer = {
        letterClaimed: t.isLetterTarget,
        cellClaimed: t.isCellTarget,
        letterRtMs: t.isLetterTarget ? 600 : null,
        cellRtMs: t.isCellTarget ? 700 : null,
      }
      state = def.submitAnswer(withTrial, answer, 900) as DualNBackState
    }
    expect(def.isComplete(state)).toBe(true)
    const summary = def.getSummary(state)
    expect(summary.metrics).toMatchObject({
      letterHits: trials.filter((t) => t.isLetterTarget).length,
      letterMisses: 0,
      letterFalseAlarms: 0,
      cellHits: trials.filter((t) => t.isCellTarget).length,
      cellMisses: 0,
      cellFalseAlarms: 0,
    })
    expect(summary.accuracy).toBe(100)
    expect(() => def.nextTrial(state)).toThrow('همه محرک‌ها تولید شده‌اند')
  })
})
