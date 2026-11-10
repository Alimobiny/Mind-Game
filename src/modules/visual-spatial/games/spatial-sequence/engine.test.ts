import { describe, expect, it } from 'vitest'
import {
  configForDifficulty,
  orderMatchRate,
  spatialSequenceDefinition as def,
} from './engine'

const SEED = 31337

/** جابه‌جایی جفت اول توالی — همیشه دست‌کم دو موقعیت را خراب می‌کند (خانه‌ها متمایزند) */
function swapFirstTwo(sequence: readonly number[]): number[] {
  return [sequence[1] as number, sequence[0] as number, ...sequence.slice(2)]
}

describe('Spatial Sequence — engine', () => {
  it('سطح‌های دشواری درست پیکربندی می‌شوند', () => {
    const l1 = configForDifficulty(1)
    const l3 = configForDifficulty(3)
    const l5 = configForDifficulty(5)
    expect(l1.gridSize).toBe(3)
    expect(l1.sequenceLength).toBe(3)
    expect(l1.displayMsPerCell).toBe(800)
    expect(l1.gapMs).toBe(250)
    expect(l1.totalTrials).toBe(10)
    expect(l3.gridSize).toBe(4)
    expect(l3.sequenceLength).toBe(5)
    expect(l5.sequenceLength).toBe(7)
    expect(l5.displayMsPerCell).toBeLessThan(l1.displayMsPerCell)
    expect(() => configForDifficulty(0)).toThrow(RangeError)
    expect(() => configForDifficulty(6)).toThrow(RangeError)
  })

  it('توالی تولیدشده قطعی است و خانه‌هایش متمایز و در محدوده شبکه‌اند', () => {
    const s1 = def.createSession('a', configForDifficulty(3), SEED)
    const s2 = def.createSession('b', configForDifficulty(3), SEED)
    const t1 = def.nextTrial(s1).trial
    const t2 = def.nextTrial(s2).trial
    // همان seed → همان ترتیب روشن‌شدن
    expect(t1.sequence).toEqual(t2.sequence)
    expect(t1.sequence).toHaveLength(5)
    expect(new Set(t1.sequence).size).toBe(5)
    t1.sequence.forEach((cell) => {
      expect(cell).toBeGreaterThanOrEqual(0)
      expect(cell).toBeLessThan(16)
    })
    expect(t1.responseWindowMs).toBeNull()
    expect(t1.displayMsPerCell).toBe(700)
    expect(t1.gapMs).toBe(250)
  })

  it('بازتولید کامل → correct؛ جابه‌جایی جفت → incorrect', () => {
    const state = def.createSession('a', configForDifficulty(1), SEED)
    const { trial } = def.nextTrial(state)
    const perfect = def.submitAnswer({ ...state, currentTrial: trial }, [...trial.sequence], 2400)
    expect(perfect.results[0]?.outcome).toBe('correct')

    const wrong = def.submitAnswer({ ...state, currentTrial: trial }, swapFirstTwo(trial.sequence), 2400)
    expect(wrong.results[0]?.outcome).toBe('incorrect')
    expect(wrong.results[0]?.correct).toBe(false)
  })

  it('بدون پاسخ → omission و در متریک امتیاز صفر می‌گیرد', () => {
    const state = def.createSession('a', configForDifficulty(2), SEED)
    const { trial } = def.nextTrial(state)
    const omitted = def.submitAnswer({ ...state, currentTrial: trial }, null, 0)
    expect(omitted.results[0]?.outcome).toBe('omission')
    expect(omitted.results[0]?.reactionTimeMs).toBeNull()
    const summary = def.getSummary(omitted)
    expect(summary.correctTrials).toBe(0)
    expect(summary.metrics['meanOrderMatchRate']).toBe(0)
  })

  it('orderMatchRate تطابق در همان جایگاه را می‌شمارد', () => {
    expect(orderMatchRate([4, 8, 2], [4, 8, 2])).toBe(1)
    // جابه‌جایی جفت اول: فقط خانه سوم در جای خودش است
    expect(orderMatchRate([4, 8, 2], [8, 4, 2])).toBeCloseTo(1 / 3)
    expect(orderMatchRate([4, 8, 2], [4, 8])).toBeCloseTo(2 / 3)
    expect(orderMatchRate([4, 8], [])).toBe(0)
    expect(orderMatchRate([], [1])).toBe(0)
  })

  it('جلسه ۱۰ مرحله‌ای کامل می‌شود و هم‌پوشانی جزئی در متریک اثر می‌گذارد', () => {
    // سطح ۳: شبکه ۴×۴، توالی ۵ خانه‌ای → جابه‌جایی جفت اول = ۳ تطابق از ۵ (۶۰٪)
    const config = configForDifficulty(3)
    let state = def.createSession('a', config, SEED)
    for (let i = 0; i < config.totalTrials; i++) {
      const step = def.nextTrial(state)
      // نیمی از مراحل درست، نیمی با جابه‌جایی جفت اول
      const answer = i % 2 === 0 ? step.trial.sequence : swapFirstTwo(step.trial.sequence)
      state = def.submitAnswer(step.state, answer, 3000)
    }
    expect(() => def.nextTrial(state)).toThrow('همه مراحل تولید شده‌اند')
    const summary = def.getSummary(state)
    expect(def.isComplete(state)).toBe(true)
    expect(summary.totalTrials).toBe(10)
    expect(summary.correctTrials).toBe(5)
    expect(summary.accuracy).toBe(50)
    // ۵ مرحله کامل (۱۰۰٪) + ۵ مرحله سه‌پنجم (۶۰٪) → میانگین ۸۰٪
    expect(summary.metrics['meanOrderMatchRate']).toBe(80)
    expect(summary.metrics['gridSize']).toBe(4)
    expect(summary.metrics['sequenceLength']).toBe(5)
  })

  it('فراخوانی nextTrial پس از پایان جلسه خطا می‌دهد', () => {
    const config = configForDifficulty(1)
    let state = def.createSession('a', config, SEED)
    for (let i = 0; i < config.totalTrials; i++) {
      state = def.nextTrial(state).state
    }
    expect(() => def.nextTrial(state)).toThrow('همه مراحل تولید شده‌اند')
  })
})
