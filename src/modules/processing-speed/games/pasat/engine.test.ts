import { describe, expect, it } from 'vitest'
import { configForDifficulty, pasatDefinition as def } from './engine'
import type { PasatState, PasatTrial } from './engine'

/**
 * تست‌های پاسات — همه قطعی. نکتهٔ الگو: تولید رقم بعدی پس از ثبت پاسخ
 * رقم قبل است (قرارداد advanceTrial)، پس تست‌ها هم حلقهٔ تولید-ثبت دارند.
 */

const SEED = 55

/** اجرای کامل جلسه با استراتژی پاسخ دلخواه */
function runSession(
  seed: number,
  difficulty: number,
  answerOf: (t: PasatTrial) => number | null,
) {
  const config = configForDifficulty(difficulty)
  let state = def.createSession('s1', config, seed)
  const trials: PasatTrial[] = []
  for (let i = 0; i < config.totalTrials; i++) {
    const next = def.nextTrial(state)
    state = next.state as PasatState
    trials.push(next.trial)
    state = def.submitAnswer(state, answerOf(next.trial), 900) as PasatState
  }
  return { state, trials, config }
}

describe('configForDifficulty — پاسات', () => {
  it('بازهٔ ارقام با دشواری تنگ‌تر می‌شود + خطای بازه', () => {
    expect(configForDifficulty(1).intervalMs).toBe(3000)
    expect(configForDifficulty(3).intervalMs).toBe(2400)
    expect(configForDifficulty(5).intervalMs).toBe(1800)
    expect(() => configForDifficulty(0)).toThrow(RangeError)
    expect(() => configForDifficulty(6)).toThrow(RangeError)
  })
})

describe('تولید ارقام و جمع‌های موردانتظار', () => {
  it('قطعی: بذر یکسان → دنبالهٔ یکسان', () => {
    const a = runSession(SEED, 1, () => null)
    const b = runSession(SEED, 1, () => null)
    expect(a.trials.map((t) => t.digit)).toEqual(b.trials.map((t) => t.digit))
    expect(a.trials.map((t) => t.expected)).toEqual(b.trials.map((t) => t.expected))
  })

  it('رقم اول تماشاست (expected=null)؛ بقیه = جمع دو رقم متوالی', () => {
    const { trials } = runSession(SEED, 2, () => null)
    expect(trials[0]?.expected).toBeNull()
    for (let i = 1; i < trials.length; i++) {
      expect(trials[i]?.expected).toBe((trials[i]?.digit ?? 0) + (trials[i - 1]?.digit ?? 0))
    }
    for (const t of trials) {
      expect(t.digit).toBeGreaterThanOrEqual(1)
      expect(t.digit).toBeLessThanOrEqual(9)
      expect(t.responseWindowMs).toBe(t.intervalMs)
    }
  })
})

describe('امتیازدهی', () => {
  it('جمع درست = correct؛ نادرست = incorrect؛ بی‌پاسخ = omission؛ رقم اول همیشه درست', () => {
    const { state, trials } = runSession(SEED, 1, (t) => (t.expected === null ? null : t.expected))
    const results = state.results
    expect(results[0]?.outcome).toBe('correct') // تماشا
    expect(results[0]?.correct).toBe(true)
    for (let i = 1; i < results.length; i++) {
      expect(results[i]?.outcome).toBe('correct')
    }
    expect(trials.length).toBe(20)
  })

  it('پاسخ غلط و بی‌پاسخ جدا ثبت می‌شوند', () => {
    const { state } = runSession(SEED, 1, (t) => (t.expected === null ? null : (t.expected ?? 1) + 1))
    expect(state.results.filter((r) => r.outcome === 'incorrect').length).toBe(19)

    const omitted = runSession(SEED, 1, () => null).state
    expect(omitted.results.filter((r) => r.outcome === 'omission').length).toBe(19)
    // رقم اول تماشا درست است و دقت را آلوده نمی‌کند
    expect(omitted.results[0]?.outcome).toBe('correct')
  })
})

describe('جلسهٔ کامل و خلاصه', () => {
  it('۲۰ مرحله → تکمیل + متریک‌ها', () => {
    const { state } = runSession(SEED, 3, (t) => (t.expected === null ? null : t.expected))
    expect(def.isComplete(state)).toBe(true)
    const summary = def.getSummary(state)
    expect(summary.metrics).toMatchObject({ correctSums: 19, omissions: 0, meanAnswerTimeMs: 900 })
    expect(() => def.nextTrial(state)).toThrow('همه ارقام تولید شده‌اند')
  })
})
