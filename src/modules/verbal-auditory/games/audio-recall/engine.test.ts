// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { AUDIO_WORDS_FA, audioRecallDefinition as def, configForDifficulty } from './engine'
import type { AudioRecallState, AudioRecallTrial } from './engine'

/**
 * تست‌های یادآوری شنیداری — موتور قطعی؛ ارائه (صدا/نمایش) در کامپوننت است.
 */

const SEED = 42

function fullSession(
  difficulty: number,
  answerOf: (t: AudioRecallTrial) => readonly string[] | null,
) {
  const config = configForDifficulty(difficulty)
  let state = def.createSession('s1', config, SEED)
  const trials: AudioRecallTrial[] = []
  for (let i = 0; i < config.trials; i += 1) {
    const next = def.nextTrial(state)
    state = next.state as AudioRecallState
    trials.push(next.trial)
    state = def.submitAnswer(state, answerOf(next.trial), 4000) as AudioRecallState
  }
  return { state, trials, config }
}

describe('configForDifficulty', () => {
  it('نردبان دهانه و زمان ارائه + خطای بازه', () => {
    expect(configForDifficulty(1)).toMatchObject({ spanCount: 3, wordDisplayMs: 1300 })
    expect(configForDifficulty(3)).toMatchObject({ spanCount: 5 })
    expect(configForDifficulty(5)).toMatchObject({ spanCount: 7, wordDisplayMs: 900 })
    expect(() => configForDifficulty(0)).toThrow(RangeError)
    expect(() => configForDifficulty(6)).toThrow(RangeError)
  })
})

describe('طرح جلسه', () => {
  it('هر مرحله: N واژهٔ یکتا از بانک + N حواس‌پرتی؛ گزینه‌ها ۲N و بدون تکرار', () => {
    const { trials } = fullSession(3, (t) => t.studyWords)
    for (const t of trials) {
      expect(t.studyWords).toHaveLength(5)
      expect(new Set(t.studyWords).size).toBe(5)
      expect(t.recallOptions).toHaveLength(10)
      expect(new Set(t.recallOptions).size).toBe(10)
      for (const w of [...t.studyWords, ...t.recallOptions]) {
        expect(AUDIO_WORDS_FA).toContain(w)
      }
      for (const w of t.studyWords) expect(t.recallOptions).toContain(w)
    }
  })

  it('قطعی از بذر؛ مرحله بی‌مهلت', () => {
    const a = fullSession(2, (t) => t.studyWords)
    const b = fullSession(2, (t) => t.studyWords)
    expect(a.trials.map((t) => t.studyWords)).toEqual(b.trials.map((t) => t.studyWords))
    expect(a.trials.every((t) => t.responseWindowMs === null)).toBe(true)
  })
})

describe('داوری و امتیازدهی', () => {
  it('بازیابی کامل و به‌ترتیب → دقت ۱۰۰ و جایگاه ۱۰۰', () => {
    const { state } = fullSession(1, (t) => t.studyWords)
    expect(def.isComplete(state)).toBe(true)
    const summary = def.getSummary(state)
    expect(summary.accuracy).toBe(100)
    expect(summary.metrics).toMatchObject({
      spanCount: 3,
      positionMatchRate: 100,
      exactSequences: 6,
    })
  })

  it('ترتیب جابه‌جا → فقط جایگاه‌های درست امتیاز می‌گیرند، مرحله غلط', () => {
    const { state } = fullSession(1, (t) => [t.studyWords[1] as string, t.studyWords[0] as string, ...t.studyWords.slice(2)])
    const summary = def.getSummary(state)
    expect(summary.accuracy).toBeLessThan(100)
    // در هر مرحله، دو جایگاه اول جابه‌جا شده‌اند؛ بقیه درست‌اند
    expect(summary.metrics.positionMatchRate).toBeGreaterThan(0)
    expect(summary.metrics.positionMatchRate).toBeLessThan(100)
  })

  it('انتخاب ناقص (کوتاه‌تر از دهانه) → درست‌های همان جایگاه شمرده می‌شوند', () => {
    const { state } = fullSession(1, (t) => t.studyWords.slice(0, 1))
    const summary = def.getSummary(state)
    expect(summary.metrics.positionMatchRate).toBeLessThan(100)
    expect(summary.metrics.exactSequences).toBe(0)
  })

  it('بی‌پاسخ (null) → omission', () => {
    const { state } = fullSession(1, () => null)
    expect(state.results.every((r) => r.outcome === 'omission')).toBe(true)
  })
})

describe('قرارداد هسته', () => {
  it('nextTrial پس از پایان خطا؛ submit بدون مرحله خطا', () => {
    const config = configForDifficulty(1)
    let state = def.createSession('s1', config, SEED)
    for (let i = 0; i < config.trials; i += 1) {
      const next = def.nextTrial(state)
      state = def.submitAnswer(next.state, next.trial.studyWords, 1000) as AudioRecallState
    }
    expect(() => def.nextTrial(state)).toThrow()
    expect(() => def.submitAnswer(def.createSession('s2', config, SEED), null, 1)).toThrow()
  })
})
