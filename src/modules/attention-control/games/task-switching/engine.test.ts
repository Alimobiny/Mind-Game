// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  configForDifficulty,
  correctSideForTrial,
  planCueSequence,
  taskSwitchingDefinition as def,
  type TaskDimension,
  type TaskSwitchingAnswer,
  type TaskSwitchingConfig,
  type TaskSwitchingState,
  type TaskSwitchingTrial,
} from './engine'
import type { RecordedTrial } from '../../../../core/types'

const SEED = 7373
const ALL_SEEDS = [1, 42, 7373]

/** اجرای کامل یک جلسه با تابع پاسخ دلخواه و RT دلخواه */
function runSession(
  config: TaskSwitchingConfig,
  seed: number,
  answerFor: (trial: TaskSwitchingTrial) => TaskSwitchingAnswer,
  rtFor: (trial: TaskSwitchingTrial) => number,
): { state: TaskSwitchingState; trials: TaskSwitchingTrial[] } {
  let state = def.createSession('a', config, seed)
  const trials: TaskSwitchingTrial[] = []
  for (let i = 0; i < config.totalTrials; i++) {
    const step = def.nextTrial(state)
    trials.push(step.trial)
    state = def.submitAnswer(step.state, answerFor(step.trial), rtFor(step.trial))
  }
  return { state, trials }
}

const alwaysCorrect = (t: TaskSwitchingTrial) => correctSideForTrial(t)
const constantRt = () => 1000

describe('Task-Switching — engine', () => {
  it('تنظیمات دشواری ۱ تا ۵ درست ساخته می‌شود و خارج بازه خطا می‌دهد', () => {
    expect(configForDifficulty(1)).toEqual({
      difficulty: 1,
      totalTrials: 40,
      switchRatio: 0.2,
      cueStimulusIntervalMs: 900,
      responseWindowMs: 4000,
      dimensions: ['color', 'shape'],
    })
    expect(configForDifficulty(3)).toEqual({
      difficulty: 3,
      totalTrials: 40,
      switchRatio: 0.35,
      cueStimulusIntervalMs: 550,
      responseWindowMs: 3100,
      dimensions: ['color', 'shape'],
    })
    expect(configForDifficulty(5)).toEqual({
      difficulty: 5,
      totalTrials: 40,
      switchRatio: 0.5,
      cueStimulusIntervalMs: 200,
      responseWindowMs: 2200,
      dimensions: ['color', 'shape', 'size'],
    })
    // دشواری بالاتر → جابه‌جایی بیشتر، CSI و پنجرهٔ کوتاه‌تر
    expect(configForDifficulty(1).switchRatio).toBeLessThan(configForDifficulty(5).switchRatio)
    expect(configForDifficulty(1).cueStimulusIntervalMs).toBeGreaterThan(
      configForDifficulty(5).cueStimulusIntervalMs,
    )
    expect(configForDifficulty(1).responseWindowMs).toBeGreaterThan(
      configForDifficulty(5).responseWindowMs,
    )
    expect(() => configForDifficulty(0)).toThrow(RangeError)
    expect(() => configForDifficulty(6)).toThrow(RangeError)
  })

  it('مولد دنبالهٔ نشانه نسبت جابه‌جایی را دقیقاً می‌گیرد و طولش درست است', () => {
    const twoDims: readonly TaskDimension[] = ['color', 'shape']
    const threeDims: readonly TaskDimension[] = ['color', 'shape', 'size']
    for (const seed of ALL_SEEDS) {
      // نسبت ۰.۲ روی ۴۰ مرحله → دقیقاً ۸ جابه‌جایی
      const easy = planCueSequence(seed, 40, twoDims, 0.2)
      expect(easy).toHaveLength(40)
      expect(easy.slice(1).filter((d, i) => d !== easy[i]).length).toBe(8)
      // نسبت ۰.۵ → دقیقاً ۲۰ جابه‌جایی (اجراهای ۲تایی: رنگ،رنگ،شکل،شکل،…)
      const hard = planCueSequence(seed, 40, twoDims, 0.5)
      expect(hard.slice(1).filter((d, i) => d !== hard[i]).length).toBe(20)
      // سه‌بُعدی هم همان نسبت دقیق
      const threeD = planCueSequence(seed, 40, threeDims, 0.5)
      expect(threeD.slice(1).filter((d, i) => d !== threeD[i]).length).toBe(20)
      // هر دو بُعد (هر سه بُعد) در جلسه استفاده می‌شوند
      expect(new Set(easy).size).toBe(2)
      expect(new Set(threeD).size).toBe(3)
    }
  })

  it('مولد نشانه با seed یکسان قطعی است و seed متفاوت دنباله را عوض می‌کند', () => {
    const a = planCueSequence(SEED, 40, ['color', 'shape'], 0.35)
    const b = planCueSequence(SEED, 40, ['color', 'shape'], 0.35)
    expect(b).toEqual(a)
    // حداقل یک seed متفاوت دنبالهٔ متفاوت بدهد (پخش طول اجراها/انتخاب بُعد)
    const different = ALL_SEEDS.some((s) => {
      const other = planCueSequence(s, 40, ['color', 'shape'], 0.35)
      return !other.every((d, i) => d === a[i])
    })
    expect(different).toBe(true)
  })

  it('تولید مراحل با seed یکسان مو‌به‌مو قطعی است و seed متفاوت محرک را عوض می‌کند', () => {
    const config = configForDifficulty(2)
    const runA = runSession(config, SEED, alwaysCorrect, constantRt).trials
    const runB = runSession(config, SEED, alwaysCorrect, constantRt).trials
    expect(runB).toEqual(runA)
    const runC = runSession(config, SEED + 1, alwaysCorrect, constantRt).trials
    expect(runC).not.toEqual(runA)
  })

  it('پرچم isSwitch با دنبالهٔ نشانه می‌خواند و نسبت هر سطح دقیقاً هدف است', () => {
    const expectedSwitches = [8, 12, 14, 16, 20] // round(40 × نسبت) برای دشواری ۱..۵
    for (let difficulty = 1; difficulty <= 5; difficulty++) {
      const config = configForDifficulty(difficulty)
      for (const seed of ALL_SEEDS) {
        const trials = runSession(config, seed, alwaysCorrect, constantRt).trials
        expect(trials).toHaveLength(40)
        // مرحلهٔ اول هرگز جابه‌جایی نیست
        expect(trials[0]?.isSwitch).toBe(false)
        let switches = 0
        for (let i = 1; i < trials.length; i++) {
          const prev = trials[i - 1] as TaskSwitchingTrial
          const curr = trials[i] as TaskSwitchingTrial
          expect(curr.isSwitch).toBe(prev.dimension !== curr.dimension)
          if (curr.isSwitch) switches++
        }
        expect(switches).toBe(expectedSwitches[difficulty - 1])
        // نشانهٔ هر مرحله از ابعاد فعال همان سطح است
        for (const t of trials) {
          expect(config.dimensions).toContain(t.dimension)
        }
      }
    }
  })

  it('سطح ۵ هر سه بُعد را به‌کار می‌گیرد و مهلت پاسخ = CSI + پنجرهٔ محرک است', () => {
    const config = configForDifficulty(5)
    const trials = runSession(config, SEED, alwaysCorrect, constantRt).trials
    expect(new Set(trials.map((t) => t.dimension)).size).toBe(3)
    for (const t of trials) {
      expect(t.responseWindowMs).toBe(t.cueStimulusIntervalMs + config.responseWindowMs)
      expect(['blue', 'red']).toContain(t.color)
      expect(['circle', 'triangle']).toContain(t.shape)
      expect(['small', 'large']).toContain(t.size)
    }
  })

  it('پاسخ درست هر مرحله از نگاشت ثابت قابل استنتاج است؛ پاسخ معکوس غلط است', () => {
    const config = configForDifficulty(3)
    let state = def.createSession('a', config, SEED)
    for (let i = 0; i < config.totalTrials; i++) {
      const step = def.nextTrial(state)
      const trial = step.trial
      const correctSide = correctSideForTrial(trial)
      expect(['right', 'left']).toContain(correctSide)
      const record = def.submitAnswer(step.state, correctSide, 600).results[i] as RecordedTrial
      expect(record.outcome).toBe('correct')
      expect(record.correct).toBe(true)
      expect(record.expected).toBe(correctSide)
      const wrongSide = correctSide === 'right' ? 'left' : 'right'
      const wrongRecord = def.submitAnswer(step.state, wrongSide, 600).results[i] as RecordedTrial
      expect(wrongRecord.outcome).toBe('incorrect')
      expect(wrongRecord.correct).toBe(false)
      expect(wrongRecord.expected).toBe(correctSide)
      state = def.submitAnswer(step.state, correctSide, 600)
    }
  })

  it('انقضای مهلت (null) به omission ثبت می‌شود — الگوی برو/نرو', () => {
    const config = configForDifficulty(1)
    const state = def.createSession('a', config, SEED)
    const step = def.nextTrial(state)
    const miss = def.submitAnswer(step.state, null, 0)
    const record = miss.results[0] as RecordedTrial
    expect(record.outcome).toBe('omission')
    expect(record.correct).toBe(false)
    expect(record.given).toBeNull()
    expect(record.reactionTimeMs).toBeNull()
    expect(record.expected).toBe(correctSideForTrial(step.trial))
    // محرک خام با پرچم isSwitch ثبت می‌شود تا داده خام قابل تحلیل بماند
    expect(record.stimulus).toEqual({
      dimension: step.trial.dimension,
      color: step.trial.color,
      shape: step.trial.shape,
      size: step.trial.size,
      isSwitch: step.trial.isSwitch,
    })
  })

  it('ثبت پاسخ بدون محرک فعال و تولید مرحله پس از اتمام خطا می‌دهد', () => {
    const config = configForDifficulty(1)
    const empty = def.createSession('a', config, SEED)
    expect(() => def.submitAnswer(empty, 'right', 100)).toThrow()
    const { state } = runSession(config, SEED, () => null, constantRt)
    expect(def.isComplete(state)).toBe(true)
    expect(() => def.nextTrial(state)).toThrow()
  })

  it('ریاضی خلاصه: RT قفل‌شده بر محرک، هزینهٔ جابه‌جایی و تفکیک دقت', () => {
    const config = configForDifficulty(1) // CSI = 900 · دقیقاً ۸ جابه‌جایی
    const { state } = runSession(
      config,
      SEED,
      alwaysCorrect,
      (t) => (t.isSwitch ? 1700 : 1300), // cue-locked → stimulus-locked: 800 / 400
    )
    const summary = def.getSummary(state)
    expect(summary.exerciseId).toBe('task-switching')
    expect(summary.domain).toBe('attention-control')
    expect(summary.totalTrials).toBe(40)
    expect(summary.accuracy).toBe(100)
    expect(summary.metrics['rtRepeatMs']).toBe(400)
    expect(summary.metrics['rtSwitchMs']).toBe(800)
    // switchCostMs = rtSwitchMs − rtRepeatMs
    expect(summary.metrics['switchCostMs']).toBe(400)
    expect(summary.metrics['switchAccuracy']).toBe(100)
    expect(summary.metrics['repeatAccuracy']).toBe(100)
    expect(summary.metrics['switchTrials']).toBe(8)
    expect(summary.metrics['repeatTrials']).toBe(32)
    expect(summary.medianReactionTimeMs).not.toBeNull()
  })

  it('تفکیک دقت: پاسخ درست فقط در مراحل تکراری، غلط در مراحل جابه‌جایی', () => {
    const config = configForDifficulty(1)
    const { state } = runSession(
      config,
      SEED,
      (t) => (t.isSwitch ? (correctSideForTrial(t) === 'right' ? 'left' : 'right') : correctSideForTrial(t)),
      constantRt,
    )
    const summary = def.getSummary(state)
    expect(summary.metrics['repeatAccuracy']).toBe(100)
    expect(summary.metrics['switchAccuracy']).toBe(0)
    // هیچ پاسخ درستی در مراحل جابه‌جایی نیست → هزینهٔ جابه‌جایی تعریف‌شده نیست → 0
    expect(summary.metrics['switchCostMs']).toBe(0)
    expect(summary.metrics['rtSwitchMs']).toBe(0)
    expect(summary.accuracy).toBe(80) // ۳۲ درست از ۴۰
  })

  it('پاسخِ پیش از محرک (RT < CSI) به صفر محدود می‌شود و زیرمجموعهٔ خالی هزینه ۰ می‌دهد', () => {
    const config = configForDifficulty(1) // CSI = 900
    const base = def.createSession('handcrafted', config, SEED)
    const mk = (
      isSwitch: boolean,
      rt: number | null,
      correct: boolean,
    ): RecordedTrial => ({
      trialIndex: 0,
      stimulus: { dimension: 'color', color: 'blue', shape: 'circle', size: 'small', isSwitch },
      expected: 'right',
      given: correct ? 'right' : 'left',
      outcome: correct ? 'correct' : 'incorrect',
      correct,
      reactionTimeMs: rt,
    })
    // سه تکراری درست: 1300→400، 1500→600، 400→0 (پیش‌دستی) → میانه 400
    // دو جابه‌جایی درست: 1700→800، 2100→1200 → میانه 1000 → هزینه 600
    const state: TaskSwitchingState = {
      ...base,
      results: [
        mk(false, 1300, true),
        mk(false, 1500, true),
        mk(false, 400, true),
        mk(true, 1700, true),
        mk(true, 2100, true),
      ],
    }
    const summary = def.getSummary(state)
    expect(summary.metrics['rtRepeatMs']).toBe(400)
    expect(summary.metrics['rtSwitchMs']).toBe(1000)
    expect(summary.metrics['switchCostMs']).toBe(600)

    // زیرمجموعهٔ جابه‌جایی بدون پاسخ درست → هزینه 0
    const stateNoSwitchCorrect: TaskSwitchingState = {
      ...base,
      results: [mk(false, 1300, true), mk(false, 1500, true), mk(true, 1400, false)],
    }
    const summary2 = def.getSummary(stateNoSwitchCorrect)
    expect(summary2.metrics['rtRepeatMs']).toBe(500)
    expect(summary2.metrics['rtSwitchMs']).toBe(0)
    expect(summary2.metrics['switchCostMs']).toBe(0)
  })
})
