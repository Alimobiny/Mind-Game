// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  FRAME_MS,
  configForDifficulty,
  objectTrackingDefinition as def,
  targetOverlapRate,
} from './engine'
import type { ObjectTrackingConfig, ObjectTrackingTrial } from './engine'

const SEED = 31337
const OTHER_SEED = 424242

/** مرحلهٔ index از جلسهٔ ساخت‌یافته با seed داده‌شده — زنجیرهٔ کامل nextTrial */
function trialAtIndex(seed: number, index: number, config: ObjectTrackingConfig): ObjectTrackingTrial {
  let state = def.createSession(`session-${seed}`, config, seed)
  for (let i = 0; i <= index; i++) {
    const step = def.nextTrial(state)
    state = step.state
    if (i === index) return step.trial
  }
  throw new Error('دسترسی غیرممکن')
}

describe('Object Tracking — engine', () => {
  it('سطح‌های دشواری درست پیکربندی می‌شوند', () => {
    const l1 = configForDifficulty(1)
    const l5 = configForDifficulty(5)
    expect(l1.objectCount).toBe(4)
    expect(l1.targetCount).toBe(2)
    expect(l1.motionMs).toBe(4000)
    expect(l5.objectCount).toBe(8)
    expect(l5.targetCount).toBe(4)
    expect(l5.motionMs).toBe(8000)
    expect(l5.speed).toBeGreaterThan(l1.speed)
    expect(l1.totalTrials).toBe(8)
    expect(() => configForDifficulty(0)).toThrow(RangeError)
    expect(() => configForDifficulty(6)).toThrow(RangeError)
    // هدف همیشه کمتر از تعداد اشیاست
    for (let d = 1; d <= 5; d++) {
      const c = configForDifficulty(d)
      expect(c.targetCount).toBeLessThan(c.objectCount)
    }
  })

  it('مسیر و اهداف کاملاً از seed قطعی‌اند (seed یکسان ← فریم یکسان)', () => {
    const config = configForDifficulty(3)
    for (const index of [0, 3, 7]) {
      const a = trialAtIndex(SEED, index, config)
      const b = trialAtIndex(SEED, index, config)
      expect(a.trajectory).toEqual(b.trajectory)
      expect(a.frames).toEqual(b.frames)
      expect(a.targetIndices).toEqual(b.targetIndices)
    }
  })

  it('seed متفاوت مسیر متفاوت می‌سازد', () => {
    const config = configForDifficulty(2)
    const a = trialAtIndex(SEED, 0, config)
    const b = trialAtIndex(OTHER_SEED, 0, config)
    expect(a.trajectory.startPositions).not.toEqual(b.trajectory.startPositions)
  })

  it('تعداد فریم‌ها و فریم صفر با پارامترهای حرکت سازگار است', () => {
    const config = configForDifficulty(4)
    const trial = trialAtIndex(SEED, 1, config)
    expect(trial.frames).toHaveLength(Math.ceil(config.motionMs / FRAME_MS))
    expect(trial.frames[0]).toEqual(trial.trajectory.startPositions)
    expect(trial.responseWindowMs).toBe(config.highlightMs + config.motionMs + config.answerWindowMs)
  })

  it('بازتاب از دیواره‌ها: همهٔ اشیا در همهٔ فریم‌ها داخل کادر می‌مانند', () => {
    const config = configForDifficulty(5) // سریع‌ترین سطح = بیشترین فراز دیواره
    const r = trialAtIndex(SEED, 0, config).trajectory.radius
    const eps = 1e-9
    for (const index of [0, 2, 5]) {
      const trial = trialAtIndex(SEED, index, config)
      for (const frame of trial.frames) {
        expect(frame).toHaveLength(config.objectCount)
        for (const p of frame) {
          expect(p.x).toBeGreaterThanOrEqual(r - eps)
          expect(p.x).toBeLessThanOrEqual(1 - r + eps)
          expect(p.y).toBeGreaterThanOrEqual(r - eps)
          expect(p.y).toBeLessThanOrEqual(1 - r + eps)
        }
      }
      // اشیا واقعاً جابه‌جا شده‌اند (آخرین فریم با شروع فرق دارد)
      const last = trial.frames[trial.frames.length - 1] as readonly { x: number; y: number }[]
      const moved = last.some((p, i) => p.x !== trial.trajectory.startPositions[i]!.x)
      expect(moved).toBe(true)
    }
  })

  it('نقاط شروع بدون هم‌پوشانی و اهداف معتبرند', () => {
    const config = configForDifficulty(5)
    const trial = trialAtIndex(SEED, 0, config)
    const r = trial.trajectory.radius
    // هیچ جفت شیئی روی هم شروع نمی‌شود
    for (let i = 0; i < trial.trajectory.startPositions.length; i++) {
      for (let j = i + 1; j < trial.trajectory.startPositions.length; j++) {
        const a = trial.trajectory.startPositions[i]!
        const b = trial.trajectory.startPositions[j]!
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(2 * r)
      }
    }
    // اهداف: تعداد درست، یکتا، در بازهٔ اندیس‌ها
    expect(trial.targetIndices).toHaveLength(config.targetCount)
    expect(new Set(trial.targetIndices).size).toBe(config.targetCount)
    for (const t of trial.targetIndices) {
      expect(t).toBeGreaterThanOrEqual(0)
      expect(t).toBeLessThan(config.objectCount)
    }
  })

  it('تطابق کامل (با هر ترتیبی) → correct؛ مجموعهٔ غلط → incorrect', () => {
    const config = configForDifficulty(2)
    const state = def.createSession('a', config, SEED)
    const { trial } = def.nextTrial(state)
    const reversed = [...trial.targetIndices].reverse()
    const correctState = def.submitAnswer({ ...state, currentTrial: trial }, reversed, 6500)
    expect(correctState.results[0]?.outcome).toBe('correct')
    expect(correctState.results[0]?.correct).toBe(true)
    expect(correctState.results[0]?.reactionTimeMs).toBe(6500)

    const wrong = trial.targetIndices.map((t, i) => (i === 0 ? (t + 1) % trial.objectCount : t))
    const wrongState = def.submitAnswer({ ...state, currentTrial: trial }, wrong, 7000)
    expect(wrongState.results[0]?.outcome).toBe('incorrect')
  })

  it('پاسخ null → omission با زمان پاسخ null', () => {
    const config = configForDifficulty(1)
    const state = def.createSession('a', config, SEED)
    const { trial } = def.nextTrial(state)
    const result = def.submitAnswer({ ...state, currentTrial: trial }, null, 9000)
    expect(result.results[0]?.outcome).toBe('omission')
    expect(result.results[0]?.reactionTimeMs).toBeNull()
    expect(result.results[0]?.given).toBeNull()
  })

  it('انتخاب با اندیس تکراری حتی با پوشش کامل رد می‌شود', () => {
    const config = configForDifficulty(1)
    const state = def.createSession('a', config, SEED)
    const { trial } = def.nextTrial(state)
    const withDuplicate = [...trial.targetIndices.slice(0, -1), trial.targetIndices[0] as number]
    expect(withDuplicate.length).toBe(trial.targetIndices.length)
    const result = def.submitAnswer({ ...state, currentTrial: trial }, withDuplicate, 5000)
    expect(result.results[0]?.correct).toBe(false)
  })

  it('targetOverlapRate درست محاسبه می‌شود', () => {
    expect(targetOverlapRate([1, 2], [1, 2])).toBe(1)
    expect(targetOverlapRate([1, 2, 3], [1, 9])).toBeCloseTo(1 / 3)
    expect(targetOverlapRate([1, 2], [3, 4])).toBe(0)
    expect(targetOverlapRate([1, 2], [1, 1])).toBeCloseTo(0.5)
  })

  it('جلسهٔ ۸ مرحله‌ای کامل می‌شود و متریک هم‌پوشانی دارد', () => {
    const config = configForDifficulty(3)
    let state = def.createSession('a', config, SEED)
    for (let i = 0; i < config.totalTrials; i++) {
      const step = def.nextTrial(state)
      // نیمی کامل، نیمی بی‌پاسخ → دقت ۵۰٪ و هم‌پوشانی ۵۰٪
      const answer = i % 2 === 0 ? step.trial.targetIndices : null
      state = def.submitAnswer(step.state, answer, 5000)
    }
    const summary = def.getSummary(state)
    expect(def.isComplete(state)).toBe(true)
    expect(summary.totalTrials).toBe(8)
    expect(summary.correctTrials).toBe(4)
    expect(summary.accuracy).toBe(50)
    expect(summary.metrics['targetOverlapRate']).toBe(50)
    expect(summary.metrics['objectCount']).toBe(6)
    expect(summary.metrics['targetCount']).toBe(3)
    expect(summary.medianReactionTimeMs).toBe(5000)
    // پس از تکمیل، تولید مرحلهٔ بعدی خطا می‌دهد
    expect(() => def.nextTrial(state)).toThrow()
  })
})
