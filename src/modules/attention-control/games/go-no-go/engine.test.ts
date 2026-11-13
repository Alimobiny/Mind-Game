// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { configForDifficulty, goNoGoDefinition as def } from './engine'

const SEED = 4242

describe('Go/No-Go — engine', () => {
  it('دشواری بالاتر پنجره محرک و فاصله کوتاه‌تری می‌دهد', () => {
    const l1 = configForDifficulty(1)
    const l5 = configForDifficulty(5)
    expect(l1.stimulusMs).toBeGreaterThan(l5.stimulusMs)
    expect(l1.interStimulusMs).toBeGreaterThan(l5.interStimulusMs)
    expect(l1.totalTrials).toBe(40)
    expect(l1.goRatio).toBe(0.7)
    expect(() => configForDifficulty(6)).toThrow(RangeError)
  })

  it('تولید محرک قطعی است و پنجره پاسخ = محرک + فاصله', () => {
    const s1 = def.createSession('a', configForDifficulty(2), SEED)
    const s2 = def.createSession('b', configForDifficulty(2), SEED)
    const t1 = def.nextTrial(s1).trial
    const t2 = def.nextTrial(s2).trial
    expect(t1.kind).toBe(t2.kind)
    expect(t1.responseWindowMs).toBe(t1.stimulusMs + t1.interStimulusMs)
  })

  it('توزیع go/nogo در کل جلسه تقریباً ۷۰/۳۰ است', () => {
    const config = configForDifficulty(1)
    let state = def.createSession('a', config, SEED)
    let goCount = 0
    for (let i = 0; i < config.totalTrials; i++) {
      const step = def.nextTrial(state)
      if (step.trial.kind === 'go') goCount++
      state = def.submitAnswer(step.state, step.trial.kind === 'go' ? 'tap' : null, 400)
    }
    expect(goCount / config.totalTrials).toBeGreaterThan(0.55)
    expect(goCount / config.totalTrials).toBeLessThan(0.85)
  })

  it('هر چهار نوع نتیجه درست ارزیابی می‌شود', () => {
    const state = def.createSession('a', configForDifficulty(1), SEED)

    const goTrial: import('./engine').GoNoGoTrial = {
      trialIndex: 0,
      kind: 'go',
      stimulusMs: 1000,
      interStimulusMs: 700,
      responseWindowMs: 1700,
    }
    const hit = def.submitAnswer({ ...state, currentTrial: goTrial }, 'tap', 320)
    expect(hit.results[0]?.outcome).toBe('correct')
    expect(hit.results[0]?.reactionTimeMs).toBe(320)

    const miss = def.submitAnswer({ ...state, currentTrial: goTrial }, null, 0)
    expect(miss.results[0]?.outcome).toBe('omission')
    expect(miss.results[0]?.correct).toBe(false)

    const nogoTrial = { ...goTrial, kind: 'nogo' as const }
    const falseAlarm = def.submitAnswer({ ...state, currentTrial: nogoTrial }, 'tap', 200)
    expect(falseAlarm.results[0]?.outcome).toBe('commission')
    expect(falseAlarm.results[0]?.correct).toBe(false)

    const correctRejection = def.submitAnswer({ ...state, currentTrial: nogoTrial }, null, 0)
    expect(correctRejection.results[0]?.outcome).toBe('correct')
    expect(correctRejection.results[0]?.correct).toBe(true)
    expect(correctRejection.results[0]?.reactionTimeMs).toBeNull()
  })

  it('summary متریک‌های commission/omission و median RT را می‌سازد', () => {
    const config = configForDifficulty(1)
    let state = def.createSession('a', config, SEED)
    for (let i = 0; i < config.totalTrials; i++) {
      const step = def.nextTrial(state)
      // استراتژی: همیشه tap → روی go درست، روی nogo خطای commission
      state = def.submitAnswer(step.state, 'tap', 300 + (i % 5) * 50)
    }
    expect(def.isComplete(state)).toBe(true)
    const summary = def.getSummary(state)
    expect(summary.totalTrials).toBe(40)
    expect(summary.metrics['commissionErrors']).toBeGreaterThan(0)
    expect(summary.metrics['omissionErrors']).toBe(0)
    expect(summary.metrics['goTrials'] + summary.metrics['nogoTrials']).toBe(40)
    expect(summary.metrics['medianGoReactionTimeMs']).toBeGreaterThan(0)
    // دقت = goهای درست / کل (چون همه nogoها خطا شده‌اند)
    expect(summary.accuracy).toBe(summary.metrics['goTrials'] / 40 * 100)
  })

  it('nextTrial پس از اتمام ۴۰ محرک خطا می‌دهد', () => {
    const config = configForDifficulty(1)
    let state = def.createSession('a', config, SEED)
    for (let i = 0; i < config.totalTrials; i++) {
      const step = def.nextTrial(state)
      state = def.submitAnswer(step.state, null, 0)
    }
    expect(() => def.nextTrial(state)).toThrow()
  })
})
