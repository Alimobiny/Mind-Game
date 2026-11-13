// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { configForDifficulty, reactionTimeDefinition as def } from './engine'
import type { ReactionTimeConfig, ReactionTimeTrial } from './engine'

const SEED = 4242

/** پاسخ تستی: ضربه یا بی‌پاسخی + زمان سنجش‌شده از شروع مرحله */
interface TestAnswer {
  readonly given: 'tap' | null
  readonly rt: number
}

/** اجرای کامل یک جلسه با استراتژی پاسخ دلخواه */
function runSession(config: ReactionTimeConfig, answer: (trial: ReactionTimeTrial, index: number) => TestAnswer) {
  let state = def.createSession('a', config, SEED)
  for (let i = 0; i < config.totalTrials; i++) {
    const step = def.nextTrial(state)
    const { given, rt } = answer(step.trial, i)
    state = def.submitAnswer(step.state, given, rt)
  }
  return state
}

describe('زمان واکنش — engine', () => {
  it('configForDifficulty برای هر پنج سطح مقدار معتبر و خارج بازه خطا می‌دهد', () => {
    const levels = [1, 2, 3, 4, 5].map((d) => configForDifficulty(d))
    expect(levels.map((c) => c.totalTrials)).toEqual([10, 10, 10, 10, 10])
    // بازه jitter طبق جدول سطوح
    expect([levels[0]?.minJitterMs, levels[0]?.maxJitterMs]).toEqual([1500, 3000])
    expect([levels[2]?.minJitterMs, levels[2]?.maxJitterMs]).toEqual([1000, 4000])
    expect([levels[4]?.minJitterMs, levels[4]?.maxJitterMs]).toEqual([800, 5000])
    // پنجره پاسخ بعد از محرک با دشواری کوتاه‌تر می‌شود
    expect(levels.map((c) => c.windowAfterStimulusMs)).toEqual([1500, 1400, 1300, 1200, 1100])
    expect(() => configForDifficulty(0)).toThrow(RangeError)
    expect(() => configForDifficulty(6)).toThrow(RangeError)
  })

  it('تولید مرحله با seed یکسان قطعی است و پنجره پاسخ = تأخیر محرک + پنجره بعد از محرک', () => {
    const config = configForDifficulty(3)
    const s1 = def.createSession('a', config, SEED)
    const s2 = def.createSession('b', config, SEED)
    const t1 = def.nextTrial(s1).trial
    const t2 = def.nextTrial(s2).trial
    expect(t1.stimulusDelayMs).toBe(t2.stimulusDelayMs)
    expect(t1.responseWindowMs).toBe(t1.stimulusDelayMs + t1.windowAfterStimulusMs)
  })

  it('تأخیر محرک همه مراحل در بازه jitter همان سطح است', () => {
    const config = configForDifficulty(1)
    let state = def.createSession('a', config, SEED)
    for (let i = 0; i < config.totalTrials; i++) {
      const step = def.nextTrial(state)
      expect(step.trial.stimulusDelayMs).toBeGreaterThanOrEqual(config.minJitterMs)
      expect(step.trial.stimulusDelayMs).toBeLessThanOrEqual(config.maxJitterMs)
      state = def.submitAnswer(step.state, 'tap', step.trial.stimulusDelayMs + 300)
    }
  })

  it('تبدیل زمان واکنش درست است: ضربه ۲۵۰ms بعد از محرک → correct با rt=۲۵۰', () => {
    const state = def.createSession('a', configForDifficulty(1), SEED)
    const trial: ReactionTimeTrial = {
      trialIndex: 0,
      stimulusDelayMs: 2000,
      windowAfterStimulusMs: 1500,
      responseWindowMs: 3500,
    }
    const after = def.submitAnswer({ ...state, currentTrial: trial }, 'tap', trial.stimulusDelayMs + 250)
    const record = after.results[0]
    expect(record?.outcome).toBe('correct')
    expect(record?.correct).toBe(true)
    expect(record?.reactionTimeMs).toBe(250)
    expect(record?.given).toBe('tap')
    expect(record?.expected).toBe('tap')
    expect(record?.stimulus).toEqual({ stimulusDelayMs: 2000, windowAfterStimulusMs: 1500 })
  })

  it('ضربه در بازه انتظار = پیش‌دستی: incorrect، rt تهی و شمارش در متریک', () => {
    const state = def.createSession('a', configForDifficulty(1), SEED)
    const trial: ReactionTimeTrial = {
      trialIndex: 0,
      stimulusDelayMs: 2500,
      windowAfterStimulusMs: 1500,
      responseWindowMs: 4000,
    }
    // ضربه ۴۰۰ms پیش از ظاهرشدن محرک
    const after = def.submitAnswer({ ...state, currentTrial: trial }, 'tap', trial.stimulusDelayMs - 400)
    const record = after.results[0]
    expect(record?.outcome).toBe('incorrect')
    expect(record?.correct).toBe(false)
    expect(record?.reactionTimeMs).toBeNull()
    expect(record?.given).toBe('tap')
    expect(def.getSummary(after).metrics['anticipationErrors']).toBe(1)
  })

  it('عدم پاسخ تا پایان مهلت = omission و شمارش در tooSlowErrors', () => {
    const state = def.createSession('a', configForDifficulty(2), SEED)
    const trial: ReactionTimeTrial = {
      trialIndex: 0,
      stimulusDelayMs: 1800,
      windowAfterStimulusMs: 1400,
      responseWindowMs: 3200,
    }
    const after = def.submitAnswer({ ...state, currentTrial: trial }, null, trial.responseWindowMs ?? 0)
    const record = after.results[0]
    expect(record?.outcome).toBe('omission')
    expect(record?.correct).toBe(false)
    expect(record?.reactionTimeMs).toBeNull()
    expect(record?.given).toBeNull()
    expect(def.getSummary(after).metrics['tooSlowErrors']).toBe(1)
  })

  it('جلسه کامل ۱۰ مرحله‌ای با آمار زمان واکنش خلاصه می‌شود', () => {
    const config = configForDifficulty(2)
    const state = runSession(config, (trial, i): TestAnswer => ({ given: 'tap', rt: trial.stimulusDelayMs + 200 + i * 20 }))
    expect(def.isComplete(state)).toBe(true)
    const summary = def.getSummary(state)
    expect(summary.totalTrials).toBe(10)
    expect(summary.correctTrials).toBe(10)
    expect(summary.accuracy).toBe(100)
    expect(summary.exerciseId).toBe('reaction-time')
    expect(summary.domain).toBe('sensorimotor')
    const metrics = summary.metrics
    expect(metrics['medianReactionTimeMs']).toBe(290) // میانهٔ 200..380
    expect(metrics['bestReactionTimeMs']).toBe(200)
    expect(metrics['meanReactionTimeMs']).toBe(290)
    expect(metrics['anticipationErrors']).toBe(0)
    expect(metrics['tooSlowErrors']).toBe(0)
  })

  it('آمار زمان واکنش فقط مراحل درست را می‌شمارد و بدون پاسخ درست صفر است', () => {
    const config = configForDifficulty(1)
    // همه مراحل: ۳ پیش‌دستی، ۳ کندی، بقیه درست
    const state = runSession(config, (trial, i): TestAnswer => {
      if (i < 3) return { given: 'tap', rt: trial.stimulusDelayMs - 100 }
      if (i < 6) return { given: null, rt: trial.responseWindowMs ?? 0 }
      return { given: 'tap', rt: trial.stimulusDelayMs + 150 }
    })
    const summary = def.getSummary(state)
    expect(summary.correctTrials).toBe(4)
    expect(summary.metrics['anticipationErrors']).toBe(3)
    expect(summary.metrics['tooSlowErrors']).toBe(3)
    expect(summary.metrics['bestReactionTimeMs']).toBe(150)
    expect(summary.metrics['medianReactionTimeMs']).toBe(150)
    expect(summary.metrics['meanReactionTimeMs']).toBe(150)

    // جلسهٔ کاملاً کند: هیچ پاسخ درستی نیست → آمار صفر
    const allSlow = runSession(config, (trial): TestAnswer => ({ given: null, rt: trial.responseWindowMs ?? 0 }))
    const slowSummary = def.getSummary(allSlow)
    expect(slowSummary.correctTrials).toBe(0)
    expect(slowSummary.metrics['medianReactionTimeMs']).toBe(0)
    expect(slowSummary.metrics['bestReactionTimeMs']).toBe(0)
    expect(slowSummary.metrics['meanReactionTimeMs']).toBe(0)
    expect(slowSummary.metrics['tooSlowErrors']).toBe(10)
  })

  it('nextTrial پس از اتمام ۱۰ مرحله خطا می‌دهد', () => {
    const config = configForDifficulty(1)
    let state = def.createSession('a', config, SEED)
    for (let i = 0; i < config.totalTrials; i++) {
      const step = def.nextTrial(state)
      state = def.submitAnswer(step.state, null, 0)
    }
    expect(() => def.nextTrial(state)).toThrow()
  })
})
