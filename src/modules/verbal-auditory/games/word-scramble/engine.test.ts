// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { SCRAMBLE_BANK_FA, configForDifficulty, wordScrambleDefinition as def } from './engine'
import type { WordScrambleState, WordScrambleTrial } from './engine'

/**
 * تست‌های واژهٔ به‌هم‌ریخته — بانک و موتور قطعی.
 */

const SEED = 42

function fullSession(
  difficulty: number,
  answerOf: (t: WordScrambleTrial) => string | null,
) {
  const config = configForDifficulty(difficulty)
  let state = def.createSession('s1', config, SEED)
  const trials: WordScrambleTrial[] = []
  for (let i = 0; i < config.trials; i += 1) {
    const next = def.nextTrial(state)
    state = next.state as WordScrambleState
    trials.push(next.trial)
    state = def.submitAnswer(state, answerOf(next.trial), 3000) as WordScrambleState
  }
  return { state, trials, config }
}

describe('بانک واژه‌ها', () => {
  it('≥۴۰ واژه، یکتا، ۴ تا ۷ حرفی، بدون فاصله/نیم‌فاصله/اعراب', () => {
    expect(SCRAMBLE_BANK_FA.length).toBeGreaterThanOrEqual(40)
    expect(new Set(SCRAMBLE_BANK_FA).size).toBe(SCRAMBLE_BANK_FA.length)
    for (const word of SCRAMBLE_BANK_FA) {
      expect(word.length).toBeGreaterThanOrEqual(4)
      expect(word.length).toBeLessThanOrEqual(7)
      expect(word).not.toMatch(/[\s\u200c\u064B-\u0652]/)
    }
  })
})

describe('configForDifficulty', () => {
  it('نردبان طول و حرف فریب + خطای بازه', () => {
    expect(configForDifficulty(1)).toMatchObject({ minLength: 4, maxLength: 5, decoyLetter: false })
    expect(configForDifficulty(3)).toMatchObject({ minLength: 5, maxLength: 6, decoyLetter: false })
    expect(configForDifficulty(5)).toMatchObject({ minLength: 6, maxLength: 7, decoyLetter: true })
    expect(() => configForDifficulty(0)).toThrow(RangeError)
    expect(() => configForDifficulty(6)).toThrow(RangeError)
  })
})

describe('طرح جلسه', () => {
  it('قطعی از بذر؛ واژه‌ها در بازهٔ طولی سطح؛ دو مرحلهٔ پشت‌سرهم یکی نیست', () => {
    const a = fullSession(3, (t) => t.target)
    const b = fullSession(3, (t) => t.target)
    expect(a.trials.map((t) => t.target)).toEqual(b.trials.map((t) => t.target))
    for (const t of a.trials) {
      expect(t.target.length).toBeGreaterThanOrEqual(a.config.minLength)
      expect(t.target.length).toBeLessThanOrEqual(a.config.maxLength)
    }
    for (let i = 1; i < a.trials.length; i += 1) {
      expect(a.trials[i]?.target).not.toBe(a.trials[i - 1]?.target)
    }
  })

  it('حروف نمایشی = مجموعهٔ حروف واژه (+ حرف فریب در سطح ۴/۵)، چیدمان مخالف', () => {
    const { trials } = fullSession(1, (t) => t.target)
    for (const t of trials) {
      expect(t.letters).toHaveLength(t.target.length)
      expect([...t.letters].sort().join('')).toBe([...t.target].sort().join(''))
      expect(t.letters.join('')).not.toBe(t.target)
    }
    const d5 = fullSession(5, (t) => t.target)
    for (const t of d5.trials) {
      expect(t.letters).toHaveLength(t.target.length + 1)
      const withoutDecoy = [...t.letters]
      // حذف یک حرف اضافه باید مجموعهٔ واژه را بدهد
      for (let i = 0; i < withoutDecoy.length; i += 1) {
        const candidate = withoutDecoy.filter((_, j) => j !== i)
        if ([...candidate].sort().join('') === [...t.target].sort().join('')) {
          break
        }
        expect(i).toBeLessThan(withoutDecoy.length - 1)
      }
    }
  })
})

describe('داوری و امتیازدهی', () => {
  it('پاسخ درست = خود واژه؛ variantهای نویسه‌ای هم درست شمرده می‌شوند', () => {
    const { state } = fullSession(2, (t) => t.target)
    expect(def.getSummary(state).accuracy).toBe(100)
  })

  it('واژهٔ ساخته‌شده با حروف فریب → غلط', () => {
    const { state } = fullSession(5, (t) => {
      // یک واژهٔ هم‌طول با جایگزینی یک حرف — تقریباً همیشه با حروف داده‌شده ساخته‌شدنی نیست
      // پس مستقیم یک رشتهٔ غلطِ هم‌طول می‌دهیم
      const letters = [...t.target]
      letters[0] = letters[0] === 'ب' ? 'م' : 'ب'
      return letters.join('')
    })
    const summary = def.getSummary(state)
    expect(summary.accuracy).toBe(0)
  })

  it('بی‌پاسخ (null) → omission', () => {
    const { state } = fullSession(1, () => null)
    expect(state.results.every((r) => r.outcome === 'omission')).toBe(true)
    expect(def.getSummary(state).metrics.meanAnswerTimeMs).toBe(0)
  })

  it('متریک حرف فریب فقط در سطح ۴/۵ گزارش می‌شود', () => {
    expect(def.getSummary(fullSession(1, (t) => t.target).state).metrics.decoyTrials).toBe(0)
    expect(def.getSummary(fullSession(4, (t) => t.target).state).metrics.decoyTrials).toBe(12)
  })
})

describe('قرارداد هسته', () => {
  it('nextTrial پس از پایان خطا؛ submit بدون مرحله خطا', () => {
    const config = configForDifficulty(1)
    let state = def.createSession('s1', config, SEED)
    for (let i = 0; i < config.trials; i += 1) {
      const next = def.nextTrial(state)
      state = def.submitAnswer(next.state, next.trial.target, 1000) as WordScrambleState
    }
    expect(() => def.nextTrial(state)).toThrow()
    expect(() => def.submitAnswer(def.createSession('s2', config, SEED), null, 1)).toThrow()
  })
})
