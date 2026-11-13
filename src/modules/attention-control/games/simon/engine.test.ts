// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { configForDifficulty, mappedSide, simonDefinition as def } from './engine'
import type { SimonTrial } from './engine'

const SEED = 1717

describe('Simon Task — engine', () => {
  it('دشواری بالاتر ناسازگاری بیشتر و پنجرهٔ کوتاه‌تری می‌دهد؛ وارونه‌سازی فقط سطح ۵', () => {
    const l1 = configForDifficulty(1)
    const l5 = configForDifficulty(5)
    expect(l1.incongruentRatio).toBeLessThan(l5.incongruentRatio)
    expect(l1.stimulusMs).toBeGreaterThan(l5.stimulusMs)
    expect(l1.interStimulusMs).toBeGreaterThan(l5.interStimulusMs)
    expect(l1.totalTrials).toBe(40)
    expect(l1.invertMappingMidBlock).toBe(false)
    expect(l5.invertMappingMidBlock).toBe(true)
    expect(() => configForDifficulty(6)).toThrow(RangeError)
  })

  it('تولید محرک قطعی است؛ سازگاری با نگاشت درست حساب می‌شود', () => {
    const config = configForDifficulty(1)
    const s1 = def.createSession('a', config, SEED)
    const s2 = def.createSession('b', config, SEED)
    const t1 = def.nextTrial(s1).trial
    const t2 = def.nextTrial(s2).trial
    expect(t1).toEqual(t2)
    expect(t1.responseWindowMs).toBe(t1.stimulusMs + t1.interStimulusMs)
    // سازگار یعنی سمتِ محرک = سمتِ دکمهٔ رنگِ آن زیر نگاشت جاری
    expect(t1.congruent).toBe(t1.side === mappedSide(t1.color, t1.mappingInverted))
  })

  it('وارونه‌سازی نگاشت در میانهٔ بلوک سطح ۵ رخ می‌دهد و سازگاری دوباره محاسبه می‌شود', () => {
    const config = configForDifficulty(5)
    let state = def.createSession('a', config, SEED)
    const firstHalfInverted: boolean[] = []
    const secondHalfInverted: boolean[] = []
    for (let i = 0; i < config.totalTrials; i += 1) {
      const step = def.nextTrial(state)
      const trial = step.trial
      if (i < 20) firstHalfInverted.push(trial.mappingInverted)
      else secondHalfInverted.push(trial.mappingInverted)
      expect(trial.congruent).toBe(trial.side === mappedSide(trial.color, trial.mappingInverted))
      state = def.submitAnswer(step.state, trial.color, 400)
    }
    expect(firstHalfInverted.every((v) => !v)).toBe(true)
    expect(secondHalfInverted.every((v) => v)).toBe(true)
  })

  it('توزیع ناسازگاری در کل جلسه نزدیک نسبت تنظیم است', () => {
    const config = configForDifficulty(1)
    let state = def.createSession('a', config, SEED)
    let incongruent = 0
    for (let i = 0; i < config.totalTrials; i += 1) {
      const step = def.nextTrial(state)
      if (!step.trial.congruent) incongruent += 1
      state = def.submitAnswer(step.state, step.trial.color, 400)
    }
    const ratio = incongruent / config.totalTrials
    expect(ratio).toBeGreaterThan(0.15)
    expect(ratio).toBeLessThan(0.6)
  })

  it('پاسخ درست/غلط/بی‌پاسخ درست ارزیابی می‌شود', () => {
    const state = def.createSession('a', configForDifficulty(1), SEED)
    const trial: SimonTrial = {
      trialIndex: 0,
      color: 'blue',
      side: 'right',
      congruent: false,
      mappingInverted: false,
      stimulusMs: 900,
      interStimulusMs: 700,
      responseWindowMs: 1600,
    }
    const hit = def.submitAnswer({ ...state, currentTrial: trial }, 'blue', 320)
    expect(hit.results[0]?.outcome).toBe('correct')
    expect(hit.results[0]?.reactionTimeMs).toBe(320)

    const wrong = def.submitAnswer({ ...state, currentTrial: trial }, 'red', 300)
    expect(wrong.results[0]?.outcome).toBe('incorrect')
    expect(wrong.results[0]?.correct).toBe(false)

    const miss = def.submitAnswer({ ...state, currentTrial: trial }, null, 0)
    expect(miss.results[0]?.outcome).toBe('omission')
    expect(miss.results[0]?.reactionTimeMs).toBeNull()
  })

  it('summary اثر سایمون و دقت جداگانهٔ سازگار/ناسازگار را می‌سازد', () => {
    const config = configForDifficulty(1)
    let state = def.createSession('a', config, SEED)
    for (let i = 0; i < config.totalTrials; i += 1) {
      const step = def.nextTrial(state)
      const trial = step.trial
      // سازگارها سریع و درست؛ ناسازگارها کند و درست — اثر سایمون مثبت
      const rt = trial.congruent ? 350 : 500
      state = def.submitAnswer(step.state, trial.color, rt)
    }
    expect(def.isComplete(state)).toBe(true)
    const summary = def.getSummary(state)
    expect(summary.totalTrials).toBe(40)
    expect(summary.metrics['rtCongruentMs']).toBe(350)
    expect(summary.metrics['rtIncongruentMs']).toBe(500)
    expect(summary.metrics['simonEffectMs']).toBe(150)
    expect(summary.metrics['congruentTrials'] + summary.metrics['incongruentTrials']).toBe(40)
    expect(summary.metrics['accuracyCongruent']).toBe(100)
    expect(summary.metrics['accuracyIncongruent']).toBe(100)
    expect(summary.metrics['omissionErrors']).toBe(0)
    expect(() => def.nextTrial(state)).toThrow()
  })
})
