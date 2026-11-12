import { describe, expect, it } from 'vitest'
import { AP_WORDS, associativePairsDefinition as def, configForDifficulty } from './engine'
import type { AssociativePairsState, AssociativePairsTrial } from './engine'

/**
 * تست‌های حافظهٔ انجمنی — قطعی؛ طرح جلسه یک‌جا از بذر نشست ساخته می‌شود.
 */

const SEED = 42

function fullSession(difficulty: number, answerOf: (t: AssociativePairsTrial) => number | null) {
  const config = configForDifficulty(difficulty)
  let state = def.createSession('s1', config, SEED)
  const trials: AssociativePairsTrial[] = []
  for (let i = 0; i < state.plan.length; i++) {
    const next = def.nextTrial(state)
    state = next.state as AssociativePairsState
    trials.push(next.trial)
    state = def.submitAnswer(state, answerOf(next.trial), 900) as AssociativePairsState
  }
  return { state, trials, config }
}

describe('configForDifficulty — حافظهٔ انجمنی', () => {
  it('نردبان جفت/گزینه/بازآزمون + خطای بازه', () => {
    expect(configForDifficulty(1)).toMatchObject({ pairCount: 4, choiceCount: 3, hasRetestBlock: false })
    expect(configForDifficulty(3)).toMatchObject({ pairCount: 6, choiceCount: 4, hasRetestBlock: true })
    expect(configForDifficulty(5)).toMatchObject({ pairCount: 8, choiceCount: 5, hasRetestBlock: true })
    expect(() => configForDifficulty(0)).toThrow(RangeError)
    expect(() => configForDifficulty(6)).toThrow(RangeError)
  })
})

describe('طرح جلسه', () => {
  it('ساختار: مطالعه K → آزمون K → (بازآزمون K در سطح ۳+)', () => {
    const { trials, config } = fullSession(3, () => null)
    expect(trials).toHaveLength(config.pairCount * 3)
    expect(trials.slice(0, config.pairCount).every((t) => t.item.phase === 'study')).toBe(true)
    expect(trials.slice(config.pairCount, config.pairCount * 2).every((t) => t.item.phase === 'test' && t.item.block === 1)).toBe(true)
    expect(trials.slice(config.pairCount * 2).every((t) => t.item.phase === 'test' && t.item.block === 2)).toBe(true)
  })

  it('قطعی: بذر یکسان → طرح یکسان', () => {
    const a = fullSession(2, () => null).trials
    const b = fullSession(2, () => null).trials
    expect(a.map((t) => [t.item.phase, t.item.cue, t.item.target])).toEqual(
      b.map((t) => [t.item.phase, t.item.cue, t.item.target]),
    )
  })

  it('جفت‌ها از استخر، بی‌تکرار؛ گزینه‌ها شامل هدف با حواس‌پرتی بیرون از جفت', () => {
    const { trials } = fullSession(4, () => null)
    const study = trials.filter((t) => t.item.phase === 'study')
    const words = study.flatMap((t) => [t.item.cue, t.item.target])
    expect(new Set(words).size).toBe(words.length)
    for (const w of words) expect(AP_WORDS).toContain(w)
    for (const t of trials.filter((x) => x.item.phase === 'test')) {
      expect(t.item.choices).toHaveLength(configForDifficulty(4).choiceCount)
      expect(t.item.choices[t.item.correctIndex]).toBe(t.item.target)
      expect(t.item.choices).not.toContain(t.item.cue)
    }
  })

  it('مطالعه پنجرهٔ زمان‌دار دارد؛ آزمون بی‌مهلت است', () => {
    const { trials, config } = fullSession(1, () => null)
    for (const t of trials) {
      expect(t.responseWindowMs).toBe(t.item.phase === 'study' ? config.studyDisplayMs : null)
    }
  })
})

describe('امتیازدهی و خلاصه', () => {
  it('همهٔ آزمون‌ها درست → دقت ۱۰۰ + متریک بلوک‌ها', () => {
    const { state, config } = fullSession(3, (t) => (t.item.phase === 'study' ? null : t.item.correctIndex))
    expect(def.isComplete(state)).toBe(true)
    const summary = def.getSummary(state)
    expect(summary.metrics).toMatchObject({
      studiedPairs: config.pairCount,
      firstBlockAccuracy: 100,
      secondBlockAccuracy: 100,
    })
    expect(summary.accuracy).toBe(100)
  })

  it('خطا فقط در بلوک دوباره → دقت بلوک‌ها جدا', () => {
    const { state } = fullSession(3, (t) =>
      t.item.phase === 'study' ? null : t.item.block === 2 ? ((t.item.correctIndex + 1) % t.item.choices.length) : t.item.correctIndex,
    )
    const summary = def.getSummary(state)
    expect(summary.metrics.firstBlockAccuracy).toBe(100)
    expect(summary.metrics.secondBlockAccuracy).toBe(0)
  })

  it('سطح ۱: متریک بلوک دوم صفر گزارش می‌شود (بدون بازآزمون)', () => {
    const { state } = fullSession(1, (t) => (t.item.phase === 'study' ? null : t.item.correctIndex))
    const summary = def.getSummary(state)
    expect(summary.metrics).toMatchObject({ firstBlockAccuracy: 100, secondBlockAccuracy: 0 })
  })

  it('مطالعه همیشه درست ثبت می‌شود (در دقت بی‌اثر)', () => {
    const { state } = fullSession(1, () => null) // همهٔ آزمون‌ها بی‌پاسخ
    const studyRecords = state.results.filter((r) => (r.stimulus as { phase: string }).phase === 'study')
    expect(studyRecords.every((r) => r.correct)).toBe(true)
    expect(state.results.filter((r) => r.outcome === 'omission').length).toBe(configForDifficulty(1).pairCount)
  })
})
