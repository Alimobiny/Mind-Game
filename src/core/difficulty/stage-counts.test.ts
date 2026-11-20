// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createAppRegistry, createExerciseConfig } from '../../modules'
import {
  ENGINE_AUTHORED_STAGE_COUNTS,
  STAGE_COUNTS_BY_DIFFICULTY,
  clampCustomStageCount,
  isStageCountCustomizable,
  stageCountBounds,
  stageCountPresets,
  standardStageCount,
  policyStageCount,
} from './stage-counts'
import {
  DEFAULT_TRIAL_SECONDS,
  SESSION_OVERHEAD_SECONDS,
  TRIAL_SECONDS_BY_EXERCISE,
} from '../program/time-estimation'

/**
 * ناوردایی‌های جدول نردبان مرحله — مبنای کالیبراسیون (نشست ۱۶): باند ۱٫۵-۳
 * دقیقه در سطح ۱ و حداکثر ~۴ دقیقه در سطح ۵ (مدت شامل سربار جلسه). اعمالِ
 * جدول روی کل رجیستری در registry-invariants.test.ts قفل شده است.
 */
describe('نردبان تعداد مراحل', () => {
  const ladders: ReadonlyArray<[string, readonly number[]]> = [
    ...Object.entries(STAGE_COUNTS_BY_DIFFICULTY),
    ...Object.entries(ENGINE_AUTHORED_STAGE_COUNTS),
  ]

  it('هر نردبان: مثبت، صحیح و نابرِ کاهشی', () => {
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

  it('همهٔ idهای دو جدول یکتا و بدون هم‌پوشانی‌اند', () => {
    const ids = [
      ...Object.keys(STAGE_COUNTS_BY_DIFFICULTY),
      ...Object.keys(ENGINE_AUTHORED_STAGE_COUNTS),
    ]
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('مدت سطح ۱ داخل باند ۱٫۵-۳ دقیقه (استثناهای مستند: واحد درشت)', () => {
    for (const [id, ladder] of ladders) {
      const seconds = TRIAL_SECONDS_BY_EXERCISE[id] ?? DEFAULT_TRIAL_SECONDS
      const minutes = Math.ceil(((ladder[0] as number) * seconds + SESSION_OVERHEAD_SECONDS) / 60)
      if (id === 'reading-aloud') {
        // کفِ معناداری: ۲ متن = ۴ دقیقه — مستند در سرآیند ماژول
        expect(minutes).toBe(4)
        continue
      }
      if (id === 'associative-pairs') {
        // بلوک‌های جفت‌ساخت‌یافته: ۴ جفت × ۲ بلوک = ۸ مرحله ≈ ۱۸۲ث (۳ دقیقهٔ واقعی؛
        // گردِ سقف به ۴) — کوچک‌ترین ساختار معنادارِ این پارادایم
        expect(minutes).toBe(4)
        continue
      }
      expect(minutes, `${id}: سطح ۱ باید ≤ ۳ دقیقه باشد`).toBeLessThanOrEqual(3)
    }
  })

  it('مدت سطح ۵ حداکثر ۴ دقیقه', () => {
    for (const [id, ladder] of ladders) {
      const seconds = TRIAL_SECONDS_BY_EXERCISE[id] ?? DEFAULT_TRIAL_SECONDS
      const minutes = Math.ceil(
        ((ladder[ladder.length - 1] as number) * seconds + SESSION_OVERHEAD_SECONDS) / 60,
      )
      expect(minutes, `${id}: سطح ۵ باید ≤ ۴ دقیقه باشد`).toBeLessThanOrEqual(4)
    }
  })

  it('بازی‌های موتور-مولف: بدون override و بدون شخصی‌سازی', () => {
    for (const id of Object.keys(ENGINE_AUTHORED_STAGE_COUNTS)) {
      expect(policyStageCount(id, 1), `${id}: policyStageCount`).toBeNull()
      expect(isStageCountCustomizable(id), `${id}: customizable`).toBe(false)
    }
  })

  it('policyStageCount برای id ناشناخته null است؛ standardStageCount به fallback می‌رسد', () => {
    expect(policyStageCount('game-of-the-future', 3)).toBeNull()
    expect(standardStageCount('game-of-the-future', 3, 7)).toBe(7)
    expect(standardStageCount('game-of-the-future', 3)).toBe(0)
  })

  it('سطح خارج از بازه به نزدیک‌ترین لبه می‌چسبد', () => {
    expect(standardStageCount('stroop', 0, 18)).toBe(18)
    expect(standardStageCount('stroop', 99, 18)).toBe(27)
    expect(policyStageCount('stroop', 99)).toBe(27)
  })
})

describe('تعداد دلخواه (شخصی‌سازی)', () => {
  it('bounds: کف ۲؛ سقف ۱٫۵× بالاترین نردبان؛ میراث نام محاسبه‌ها زنده', () => {
    expect(stageCountBounds('stroop')).toEqual({ min: 2, max: Math.round(27 * 1.5) })
    expect(stageCountBounds('calculation-20')).toEqual({ min: 2, max: 20 })
    expect(stageCountBounds('calculation-100')).toEqual({ min: 2, max: 100 })
  })

  it('clamp: بازی غیرقابل‌تنظیم و مقدار تهی → null؛ خارج از بازه می‌چسبد', () => {
    expect(clampCustomStageCount('associative-pairs', 10)).toBeNull()
    expect(clampCustomStageCount('stroop', null)).toBeNull()
    expect(clampCustomStageCount('stroop', 1)).toBe(2)
    expect(clampCustomStageCount('calculation-100', 500)).toBe(100)
  })

  it('پیش‌تنظیم‌ها: استاندارد = نردبان؛ بلند ≤ سقف؛ کوتاه ≥ کف و ≤ استاندارد', () => {
    const p = stageCountPresets('stroop', 5)
    expect(p.standard).toBe(27)
    expect(p.short).toBeLessThanOrEqual(p.standard)
    expect(p.long).toBeLessThanOrEqual(stageCountBounds('stroop').max)
  })

  it('createExerciseConfig با stageCount دلخواه، نردبان را می‌پوشاند', () => {
    const config = createExerciseConfig('calculation-100', 1, { stageCount: 100 }) as {
      totalTrials?: number
    }
    expect(config.totalTrials).toBe(100)
    const standard = createExerciseConfig('calculation-100', 1) as { totalTrials?: number }
    expect(standard.totalTrials).toBe(22)
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
