// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { configForDifficulty, attentionalBlinkDefinition as def } from './engine'
import type { AttentionalBlinkTrial } from './engine'

const SEED = 909

describe('Attentional Blink — engine', () => {
  it('دشواری بالاتر جریان تندتری می‌دهد (۸ تا ~۱۲ آیتم بر ثانیه)', () => {
    const l1 = configForDifficulty(1)
    const l5 = configForDifficulty(5)
    expect(l1.itemMs).toBeGreaterThan(l5.itemMs)
    expect(l1.itemMs).toBe(125)
    expect(l5.itemMs).toBe(85)
    expect(l1.totalTrials).toBe(12)
    expect(l1.streamLength).toBe(16)
    expect(() => configForDifficulty(0)).toThrow(RangeError)
  })

  it('تولید جریان قطعی است؛ ساختار t1/t2 و lag درست است', () => {
    const config = configForDifficulty(2)
    const s1 = def.createSession('a', config, SEED)
    const s2 = def.createSession('b', config, SEED)
    const t1 = def.nextTrial(s1).trial
    const t2 = def.nextTrial(s2).trial
    expect(t1).toEqual(t2)

    expect(t1.stream).toHaveLength(config.streamLength)
    const i1 = t1.stream.findIndex((item) => item.role === 't1')
    const i2 = t1.stream.findIndex((item) => item.role === 't2')
    expect(i1).toBeGreaterThanOrEqual(3)
    expect(i1).toBeLessThanOrEqual(5)
    expect(i2 - i1).toBe(t1.lag)
    expect(t1.stream[i1]?.letter).toBe(t1.t1)
    expect(t1.stream[i2]?.letter).toBe(t1.t2)
    // حروف جریان یکتایند — بازیابی از جدول بدون ابهام است
    expect(new Set(t1.stream.map((item) => item.letter)).size).toBe(config.streamLength)
    expect(t1.responseWindowMs).toBeNull()
  })

  it('توزیع lag روی کل جلسه روی مقادیر ۱/۲/۳/۷ می‌ماند', () => {
    const config = configForDifficulty(1)
    let state = def.createSession('a', config, SEED)
    const lags = new Set<number>()
    for (let i = 0; i < config.totalTrials; i += 1) {
      const step = def.nextTrial(state)
      lags.add(step.trial.lag)
      state = def.submitAnswer(step.state, { t1: step.trial.t1, t2: step.trial.t2 }, 1500)
    }
    for (const lag of lags) expect([1, 2, 3, 7]).toContain(lag)
    // با ۱۲ مرحله و این توزیع، حداقل سه kind تأخیر باید دیده شود
    expect(lags.size).toBeGreaterThanOrEqual(3)
  })

  it('پاسخ کامل درست، ناقص و بی‌پاسخ درست ارزیابی می‌شود', () => {
    const state = def.createSession('a', configForDifficulty(1), SEED)
    const trial: AttentionalBlinkTrial = {
      trialIndex: 0,
      stream: [
        { letter: 'ب', role: 'distractor' },
        { letter: 'پ', role: 'distractor' },
        { letter: 'ت', role: 'distractor' },
        { letter: 'ث', role: 't1' },
        { letter: 'ج', role: 'distractor' },
        { letter: 'چ', role: 'distractor' },
        { letter: 'ح', role: 't2' },
      ],
      lag: 3,
      t1: 'ث',
      t2: 'ح',
      itemMs: 110,
      responseWindowMs: null,
    }
    const both = def.submitAnswer({ ...state, currentTrial: trial }, { t1: 'ث', t2: 'ح' }, 900)
    expect(both.results[0]?.outcome).toBe('correct')
    expect(both.results[0]?.correct).toBe(true)

    const onlyT1 = def.submitAnswer({ ...state, currentTrial: trial }, { t1: 'ث', t2: 'خ' }, 900)
    expect(onlyT1.results[0]?.outcome).toBe('incorrect')
    expect(onlyT1.results[0]?.correct).toBe(false)

    const none = def.submitAnswer({ ...state, currentTrial: trial }, null, 0)
    expect(none.results[0]?.outcome).toBe('omission')
    expect(none.results[0]?.reactionTimeMs).toBeNull()
  })

  it('summary متریک‌های t1/t2 و اندازهٔ پلک را درست می‌سازد', () => {
    const config = configForDifficulty(1)
    let state = def.createSession('a', config, SEED)
    for (let i = 0; i < config.totalTrials; i += 1) {
      const step = def.nextTrial(state)
      const trial = step.trial
      // استراتژی: هدف اول همیشه درست؛ هدف دوم فقط در lag 7 درست
      const t2 = trial.lag === 7 ? trial.t2 : 'غ'
      state = def.submitAnswer(step.state, { t1: trial.t1, t2 }, 1200)
    }
    const summary = def.getSummary(state)
    expect(summary.totalTrials).toBe(12)
    expect(summary.metrics['t1Accuracy']).toBe(100)
    expect(summary.metrics['t2GivenT1Accuracy']).toBeLessThan(100)
    // هر lag 7 درست و lag 3 غلط → پلک مثبت و برابر سهم lag7
    expect(summary.metrics['blinkMagnitude']).toBeGreaterThan(0)
    expect(() => def.nextTrial(state)).toThrow()
  })

  it('جلسهٔ بی‌نقص (هر دو هدف همیشه درست) متریک‌های ۱۰۰ می‌دهد', () => {
    const config = configForDifficulty(3)
    let state = def.createSession('a', config, SEED)
    for (let i = 0; i < config.totalTrials; i += 1) {
      const step = def.nextTrial(state)
      state = def.submitAnswer(
        step.state,
        { t1: step.trial.t1, t2: step.trial.t2 },
        1000,
      )
    }
    const summary = def.getSummary(state)
    expect(summary.accuracy).toBe(100)
    expect(summary.metrics['t1Accuracy']).toBe(100)
    expect(summary.metrics['t2GivenT1Accuracy']).toBe(100)
    expect(summary.metrics['blinkMagnitude']).toBe(0)
    expect(summary.metrics['lagOneSparing']).toBeLessThanOrEqual(0)
  })
})
