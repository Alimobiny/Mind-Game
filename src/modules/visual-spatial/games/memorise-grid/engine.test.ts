// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { configForDifficulty, memoriseGridDefinition as def, overlapRate } from './engine'

const SEED = 31337

describe('Memorise Grid — engine', () => {
  it('سطح‌های دشواری درست پیکربندی می‌شوند', () => {
    const l1 = configForDifficulty(1)
    const l5 = configForDifficulty(5)
    expect(l1.gridSize).toBe(3)
    expect(l1.activeCells).toBe(3)
    expect(l5.gridSize).toBe(5)
    expect(l5.activeCells).toBe(9)
    expect(l5.memoriseMs).toBeLessThan(l1.memoriseMs)
    expect(() => configForDifficulty(0)).toThrow(RangeError)
  })

  it('الگوی تولیدشده قطعی است و تعداد خانه‌ها درست است', () => {
    const s1 = def.createSession('a', configForDifficulty(3), SEED)
    const s2 = def.createSession('b', configForDifficulty(3), SEED)
    const t1 = def.nextTrial(s1).trial
    const t2 = def.nextTrial(s2).trial
    expect(t1.activeCells).toEqual(t2.activeCells)
    expect(t1.activeCells).toHaveLength(6)
    expect(new Set(t1.activeCells).size).toBe(6)
    t1.activeCells.forEach((cell) => {
      expect(cell).toBeGreaterThanOrEqual(0)
      expect(cell).toBeLessThan(16)
    })
    expect(t1.responseWindowMs).toBeNull()
  })

  it('تطابق کامل → correct؛ جابه‌جایی خانه‌ها → incorrect', () => {
    const state = def.createSession('a', configForDifficulty(1), SEED)
    const { trial } = def.nextTrial(state)
    const perfect = def.submitAnswer({ ...state, currentTrial: trial }, [...trial.activeCells], 2200)
    expect(perfect.results[0]?.outcome).toBe('correct')

    const shifted = trial.activeCells.map((c) => (c + 1) % 9)
    const wrong = def.submitAnswer({ ...state, currentTrial: trial }, shifted, 2200)
    expect(wrong.results[0]?.outcome).toBe('incorrect')
  })

  it('انتخاب با خانه تکراری حتی با هم‌پوشانی کامل قبول نمی‌شود', () => {
    const state = def.createSession('a', configForDifficulty(2), SEED)
    const { trial } = def.nextTrial(state)
    const withDuplicate = [...trial.activeCells.slice(0, -1), trial.activeCells[0] as number]
    expect(withDuplicate.length).toBe(trial.activeCells.length)
    const result = def.submitAnswer({ ...state, currentTrial: trial }, withDuplicate, 1000)
    expect(result.results[0]?.correct).toBe(false)
  })

  it('overlapRate درست محاسبه می‌شود', () => {
    expect(overlapRate([1, 2, 3], [1, 2, 3])).toBe(1)
    expect(overlapRate([1, 2, 3], [1, 2, 9])).toBeCloseTo(2 / 3)
    expect(overlapRate([1, 2], [])).toBe(0)
  })

  it('جلسه ۱۰ مرحله‌ای کامل و متریک هم‌پوشانی دارد', () => {
    // سطح ۳: شبکه ۴×۴ با ۶ خانه → نصف = ۳ → هم‌پوشانی دقیقاً ۵۰٪
    const config = configForDifficulty(3)
    let state = def.createSession('a', config, SEED)
    for (let i = 0; i < config.totalTrials; i++) {
      const step = def.nextTrial(state)
      // نیمی از مراحل درست، نیمی نصف خانه‌ها
      const answer =
        i % 2 === 0
          ? step.trial.activeCells
          : step.trial.activeCells.slice(0, Math.floor(step.trial.activeCells.length / 2))
      state = def.submitAnswer(step.state, answer, 2000)
    }
    const summary = def.getSummary(state)
    expect(def.isComplete(state)).toBe(true)
    expect(summary.totalTrials).toBe(10)
    expect(summary.correctTrials).toBe(5)
    expect(summary.accuracy).toBe(50)
    // ۵ مرحله کامل + ۵ مرحله نصف → میانگین هم‌پوشانی ۷۵٪
    expect(summary.metrics['meanOverlapRate']).toBe(75)
    expect(summary.metrics['gridSize']).toBe(4)
    expect(summary.metrics['activeCells']).toBe(6)
  })
})
