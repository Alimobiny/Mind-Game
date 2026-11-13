// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { configForDifficulty, nBackDefinition as def, NBACK_LETTERS, type NBackTrial } from './engine'

const SEED = 77

/** تولید همه ۲۵ محرک یک جلسه بدون ثبت پاسخ (محرک‌ها مستقل از پاسخ‌ها هستند) */
function generateAll(seed: number, difficulty: number) {
  const config = configForDifficulty(difficulty)
  let state = def.createSession(`session-${seed}-${difficulty}`, config, seed)
  const trials: NBackTrial[] = []
  for (let i = 0; i < config.totalTrials; i++) {
    const step = def.nextTrial(state)
    trials.push(step.trial)
    state = step.state
  }
  return { trials, config, finalState: state }
}

describe('N-Back — engine', () => {
  it('تنظیمات هر سطح دشواری درست است و خارج از ۱..۵ خطا می‌دهد', () => {
    expect(configForDifficulty(1)).toMatchObject({
      n: 1,
      stimulusMs: 900,
      interStimulusMs: 1000,
      totalTrials: 25,
      targetRate: 0.3,
    })
    expect(configForDifficulty(2)).toMatchObject({ n: 2, stimulusMs: 800, interStimulusMs: 900 })
    expect(configForDifficulty(3)).toMatchObject({ n: 2, stimulusMs: 600, interStimulusMs: 700 })
    expect(configForDifficulty(4)).toMatchObject({ n: 3, stimulusMs: 800, interStimulusMs: 900 })
    expect(configForDifficulty(5)).toMatchObject({ n: 3, stimulusMs: 600, interStimulusMs: 700 })
    expect(() => configForDifficulty(0)).toThrow(RangeError)
    expect(() => configForDifficulty(6)).toThrow(RangeError)
  })

  it('تولید با seed یکسان قطعی است — توالی حروف و تطبیق‌ها یکسان', () => {
    const first = generateAll(SEED, 2)
    const second = generateAll(SEED, 2)
    expect(first.trials).toEqual(second.trials)
    expect(JSON.stringify(first.trials.map((t) => t.letter))).toBe(
      JSON.stringify(second.trials.map((t) => t.letter)),
    )
    expect(JSON.stringify(first.trials.map((t) => t.isTarget))).toBe(
      JSON.stringify(second.trials.map((t) => t.isTarget)),
    )
    // تاریخچه state هم همان حروف به همان ترتیب است
    expect(first.finalState.letters).toEqual(first.trials.map((t) => t.letter))
    // همه حروف از استخر مجازند و پنجره پاسخ = محرک + فاصله
    for (const t of first.trials) {
      expect(NBACK_LETTERS).toContain(t.letter)
      expect(t.responseWindowMs).toBe(t.stimulusMs + t.interStimulusMs)
    }
  })

  it('n مرحله اول هرگز تطبیقی نیستند', () => {
    for (const difficulty of [1, 2, 3, 4, 5]) {
      const { trials, config } = generateAll(SEED, difficulty)
      for (let i = 0; i < config.n; i++) {
        expect(trials[i]?.isTarget).toBe(false)
      }
    }
  })

  it('مراحل تطبیقی دقیقاً حرف n مرحله قبل را دارند', () => {
    for (const difficulty of [1, 2, 3, 4, 5]) {
      const { trials, config } = generateAll(SEED, difficulty)
      for (let i = config.n; i < trials.length; i++) {
        const t = trials[i] as NBackTrial
        if (t.isTarget) {
          expect(t.letter).toBe((trials[i - config.n] as NBackTrial).letter)
        }
      }
    }
  })

  it('مراحل غیرتطبیقی هرگز برابر حرف n مرحله قبل نیستند', () => {
    for (const difficulty of [1, 2, 3, 4, 5]) {
      const { trials, config } = generateAll(SEED, difficulty)
      for (let i = config.n; i < trials.length; i++) {
        const t = trials[i] as NBackTrial
        if (!t.isTarget) {
          expect(t.letter).not.toBe((trials[i - config.n] as NBackTrial).letter)
        }
      }
    }
  })

  it('نرخ تطبیق در کل جلسه حدود ۳۰٪ است', () => {
    for (const difficulty of [1, 2, 3, 4, 5]) {
      const { trials, config } = generateAll(SEED, difficulty)
      const eligible = trials.slice(config.n)
      const targets = eligible.filter((t) => t.isTarget).length
      const rate = targets / eligible.length
      expect(rate).toBeGreaterThan(0.2)
      expect(rate).toBeLessThan(0.4)
    }
  })

  it('هر چهار نوع نتیجه درست ارزیابی می‌شود', () => {
    const state = def.createSession('a', configForDifficulty(2), SEED)

    const targetTrial: NBackTrial = {
      trialIndex: 3,
      letter: 'س',
      n: 2,
      isTarget: true,
      stimulusMs: 800,
      interStimulusMs: 900,
      responseWindowMs: 1700,
    }
    const hit = def.submitAnswer({ ...state, currentTrial: targetTrial }, 'match', 410)
    expect(hit.results[0]?.outcome).toBe('correct')
    expect(hit.results[0]?.correct).toBe(true)
    expect(hit.results[0]?.reactionTimeMs).toBe(410)
    expect(hit.results[0]?.expected).toBe('match')
    expect(hit.results[0]?.given).toBe('match')
    expect(hit.results[0]?.stimulus).toEqual({ letter: 'س', n: 2, isTarget: true })

    const miss = def.submitAnswer({ ...state, currentTrial: targetTrial }, null, 0)
    expect(miss.results[0]?.outcome).toBe('omission')
    expect(miss.results[0]?.correct).toBe(false)
    expect(miss.results[0]?.reactionTimeMs).toBeNull()

    const nonTargetTrial: NBackTrial = { ...targetTrial, letter: 'م', isTarget: false }
    const falseAlarm = def.submitAnswer({ ...state, currentTrial: nonTargetTrial }, 'match', 200)
    expect(falseAlarm.results[0]?.outcome).toBe('commission')
    expect(falseAlarm.results[0]?.correct).toBe(false)
    expect(falseAlarm.results[0]?.expected).toBeNull()

    const correctRejection = def.submitAnswer({ ...state, currentTrial: nonTargetTrial }, null, 0)
    expect(correctRejection.results[0]?.outcome).toBe('correct')
    expect(correctRejection.results[0]?.correct).toBe(true)
    expect(correctRejection.results[0]?.reactionTimeMs).toBeNull()
    expect(correctRejection.results[0]?.given).toBeNull()
  })

  it('جلسه کامل ۲۵ مرحله‌ای با چهار متریک خلاصه می‌شود', () => {
    const config = configForDifficulty(1)
    let state = def.createSession('n-back-full', config, SEED)
    let targetCount = 0
    for (let i = 0; i < config.totalTrials; i++) {
      const step = def.nextTrial(state)
      if (step.trial.isTarget) targetCount++
      // بازیِ کامل: تطبیقی‌ها زده می‌شوند، غیرتطبیقی‌ها مهار می‌شوند
      state = def.submitAnswer(step.state, step.trial.isTarget ? 'match' : null, 300 + i)
    }
    expect(def.isComplete(state)).toBe(true)
    expect(state.letters.length).toBe(25)

    const summary = def.getSummary(state)
    expect(summary.exerciseId).toBe('n-back')
    expect(summary.domain).toBe('working-memory')
    expect(summary.totalTrials).toBe(25)
    expect(summary.metrics['hits']).toBe(targetCount)
    expect(summary.metrics['misses']).toBe(0)
    expect(summary.metrics['falseAlarms']).toBe(0)
    expect(summary.metrics['correctRejections']).toBe(25 - targetCount)
    expect(summary.accuracy).toBe(100)
    expect(summary.medianReactionTimeMs).not.toBeNull()
  })

  it('nextTrial پس از اتمام ۲۵ محرک خطا می‌دهد', () => {
    const config = configForDifficulty(1)
    let state = def.createSession('a', config, SEED)
    for (let i = 0; i < config.totalTrials; i++) {
      const step = def.nextTrial(state)
      state = def.submitAnswer(step.state, null, 0)
    }
    expect(() => def.nextTrial(state)).toThrow()
  })
})
