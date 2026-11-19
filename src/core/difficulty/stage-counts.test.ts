// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createAppRegistry, createExerciseConfig } from '../../modules'
import {
  ENGINE_AUTHORED_STAGE_COUNTS,
  STAGE_COUNTS_BY_DIFFICULTY,
  STAGE_MULTIPLIERS,
  policyStageCount,
  standardStageCount,
} from './stage-counts'

/**
 * ناوردایی‌های جدول نردبان مرحله — اعمالِ جدول در registry-invariants.test.ts
 * روی کل رجیستری قفل شده؛ این‌جا فقط ساختار خود سیاست تست می‌شود.
 */
describe('نردبان تعداد مراحل', () => {
  const ladders: ReadonlyArray<[string, readonly number[]]> = [
    ...Object.entries(STAGE_COUNTS_BY_DIFFICULTY),
    ...Object.entries(ENGINE_AUTHORED_STAGE_COUNTS),
  ]

  it('هر نردبان: مثبت، ناصافی و نابرِ کاهشی', () => {
    for (const [id, ladder] of ladders) {
      expect(ladder.length, `${id}: طول نردبان`).toBeGreaterThanOrEqual(1)
      for (const count of ladder) {
        expect(count, `${id}: تعداد مثبت`).toBeGreaterThan(0)
        expect(Number.isInteger(count), `${id}: تعداد صحیح`).toBe(true)
      }
      for (let i = 1; i < ladder.length; i += 1) {
        expect(
          (ladder[i] as number) >= (ladder[i - 1] as number),
          `${id}: سطح ${i + 1} نباید از سطح ${i} کمتر باشد`,
        ).toBe(true)
      }
    }
  })

  it('نردبان‌های اعمال‌شونده: سطح ۵ حداکثر ۱٫۵ برابر سطح ۱ (با تحمل گرد)', () => {
    for (const [id, ladder] of Object.entries(STAGE_COUNTS_BY_DIFFICULTY)) {
      const base = ladder[0] as number
      const top = ladder[ladder.length - 1] as number
      expect(top, `${id}: سقف ۱٫۵× پایه`).toBeLessThanOrEqual(Math.ceil(base * 1.5))
    }
  })

  it('ضرایب مرجع خودشان صعودی و در سقف ۱٫۵ هستند', () => {
    expect(STAGE_MULTIPLIERS[0]).toBe(1)
    expect(STAGE_MULTIPLIERS[STAGE_MULTIPLIERS.length - 1]).toBe(1.5)
    for (let i = 1; i < STAGE_MULTIPLIERS.length; i += 1) {
      expect(
        (STAGE_MULTIPLIERS[i] as number) > (STAGE_MULTIPLIERS[i - 1] as number),
      ).toBe(true)
    }
  })

  it('policyStageCount برای بازی‌های موتور-مولف null است (بدون override)', () => {
    for (const id of Object.keys(ENGINE_AUTHORED_STAGE_COUNTS)) {
      expect(policyStageCount(id, 1), `${id}`).toBeNull()
    }
  })

  it('policyStageCount برای id ناشناخته null است؛ standardStageCount به fallback می‌رسد', () => {
    expect(policyStageCount('game-of-the-future', 3)).toBeNull()
    expect(standardStageCount('game-of-the-future', 3, 7)).toBe(7)
    expect(standardStageCount('game-of-the-future', 3)).toBe(0)
  })

  it('سطح خارج از بازه به نزدیک‌ترین لبه می‌چسبد', () => {
    expect(standardStageCount('stroop', 0, 20)).toBe(20)
    expect(standardStageCount('stroop', 99, 20)).toBe(30)
    expect(policyStageCount('stroop', 99)).toBe(30)
  })
})

describe('دود-تست: هر بازی در بالاترین سطح جلسهٔ کامل می‌سازد', () => {
  /**
   * نردبان سیاست تعداد مرحله را در بدترین حالت (سطح ۵، بیشترین مراحل)
   * روی همهٔ موتورها اعمال می‌کند و جلسه را با بی‌پاسخ تا اتمام می‌راند —
   * هر موتوری که بانک محتوایش برای مراحل اضافی سوخت نداشته باشد یا
   * ایندکس ساختاری‌اش بشکند، همین‌جا خودش را نشان می‌دهد.
   */
  it('پیشروی تا isComplete در تعداد مرحلهٔ نردبان، برای هر ۳۷ بازی', () => {
    const registry = createAppRegistry()
    for (const { meta, definition } of registry.list()) {
      const topDifficulty = meta.difficultyLevels[meta.difficultyLevels.length - 1] as number
      const expected = standardStageCount(meta.id, topDifficulty, meta.plannedTrials)
      const config = createExerciseConfig(meta.id, topDifficulty)
      let state = definition.createSession('smoke', config, 7)
      let answered = 0
      // کمی بیشتر از انتظار تا حلقهٔ بی‌نهایت هم به‌عنوان خطا دیده شود
      while (!definition.isComplete(state) && answered <= expected + 2) {
        const next = definition.nextTrial(state)
        state = definition.submitAnswer(next.state, null, 1000)
        answered += 1
      }
      expect(
        definition.isComplete(state),
        `${meta.id} سطح ${topDifficulty}: جلسه باید پس از ${expected} مرحله کامل شود (پاسخ‌های ثبت‌شده: ${answered})`,
      ).toBe(true)
      expect(answered, `${meta.id}: تعداد پاسخ‌های ثبت‌شده`).toBe(expected)
    }
  })
})
