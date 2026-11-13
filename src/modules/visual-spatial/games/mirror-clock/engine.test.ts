// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  MIRROR_AXIS_ANGLES,
  buildTrialOptions,
  configForDifficulty,
  handSeparationDeg,
  handSwapRead,
  mirrorAngle,
  mirrorClockDefinition as def,
  naiveMirrorRead,
  realHandAngles,
  reflectAngleAcrossAxis,
  type MirrorClockConfig,
  type MirrorClockTrial,
  type TimeOption,
} from './engine'
import { SeededRandom } from '../../../../core/randomization/seeded-random'

const SEED = 4242

/** اجرای کامل یک جلسه با پاسخ همیشه درست */
function collectTrials(config: MirrorClockConfig, seed: number): MirrorClockTrial[] {
  let state = def.createSession('t', config, seed)
  const trials: MirrorClockTrial[] = []
  for (let i = 0; i < config.totalTrials; i++) {
    const step = def.nextTrial(state)
    trials.push(step.trial)
    state = def.submitAnswer(step.state, { hour: step.trial.hour, minute: step.trial.minute }, 500)
  }
  return trials
}

const timeKey = (t: TimeOption): number => t.hour * 60 + t.minute

describe('ساعت آینه‌ای — engine', () => {
  it('تنظیمات دشواری ۱ تا ۵ درست ساخته می‌شود و خارج بازه خطا می‌دهد', () => {
    expect(configForDifficulty(1)).toEqual({
      difficulty: 1,
      totalTrials: 12,
      minuteGranularity: 5,
      mirrorAxes: ['vertical'],
      responseWindowMs: null,
      distractorKinds: ['mirror', 'delta'],
    })
    expect(configForDifficulty(3)).toEqual({
      difficulty: 3,
      totalTrials: 12,
      minuteGranularity: 5,
      mirrorAxes: ['vertical'],
      responseWindowMs: 10000,
      distractorKinds: ['mirror', 'swap', 'delta'],
    })
    expect(configForDifficulty(5)).toEqual({
      difficulty: 5,
      totalTrials: 12,
      minuteGranularity: 1,
      mirrorAxes: ['vertical', 'horizontal', 'diagonal'],
      responseWindowMs: 6000,
      distractorKinds: ['mirror', 'swap', 'delta'],
    })
    // نردبان پنجرهٔ پاسخ: بدون مهلت → ۱۰ → ۸ → ۶ ثانیه
    expect(configForDifficulty(1).responseWindowMs).toBeNull()
    expect(configForDifficulty(2).responseWindowMs).toBeNull()
    expect(configForDifficulty(3).responseWindowMs).toBe(10000)
    expect(configForDifficulty(4).responseWindowMs).toBe(8000)
    expect(configForDifficulty(5).responseWindowMs).toBe(6000)
    // گام دقیقه از ۵ به ۱ تنگ‌تر و محورها بیشتر می‌شوند
    expect(configForDifficulty(4).minuteGranularity).toBe(1)
    expect(configForDifficulty(4).mirrorAxes).toEqual(['vertical', 'horizontal'])
    expect(() => configForDifficulty(0)).toThrow(RangeError)
    expect(() => configForDifficulty(6)).toThrow(RangeError)
  })

  it('تولید محرک با seed یکسان قطعی است و seed متفاوت دنباله را عوض می‌کند', () => {
    const config = configForDifficulty(3)
    const runA = collectTrials(config, SEED)
    const runB = collectTrials(config, SEED)
    expect(runB).toEqual(runA)
    const runC = collectTrials(config, SEED + 1)
    expect(runC.map((t) => [t.hour, t.minute, t.mirrorAxis])).not.toEqual(
      runA.map((t) => [t.hour, t.minute, t.mirrorAxis]),
    )
  })

  it('زاویهٔ واقعی عقربه‌ها برای زمان‌های مرجع درست است', () => {
    expect(realHandAngles(12, 0)).toEqual({ hourAngle: 0, minuteAngle: 0 })
    expect(realHandAngles(3, 0)).toEqual({ hourAngle: 90, minuteAngle: 0 })
    expect(realHandAngles(3, 45)).toEqual({ hourAngle: 112.5, minuteAngle: 270 })
    expect(realHandAngles(6, 30)).toEqual({ hourAngle: 195, minuteAngle: 180 })
    expect(realHandAngles(11, 58)).toEqual({ hourAngle: 359, minuteAngle: 348 })
  })

  it('بازتاب زاویه دقیقاً تبدیل آینه است (راستی‌آزمایی مستقل با بازتاب برداری)', () => {
    const toRad = (deg: number) => (deg * Math.PI) / 180
    const norm = (deg: number) => ((deg % 360) + 360) % 360
    // فاصلهٔ زاویه‌ای دایره‌ای — سر و ته دایره (۳۵۹.۹۹° ≈ ۰°) یکی است
    const circularDiff = (a: number, b: number): number => {
      const diff = Math.abs(a - b) % 360
      return Math.min(diff, 360 - diff)
    }
    // زاویه‌ها ساعتگرد از ۱۲ هستند → بردار (sin θ, −cos θ) در دستگاه SVG
    for (let axis = 0; axis < 360; axis += 7) {
      for (let angle = 0; angle < 360; angle += 13) {
        const vx = Math.sin(toRad(angle))
        const vy = -Math.cos(toRad(angle))
        const dx = Math.sin(toRad(axis))
        const dy = -Math.cos(toRad(axis))
        const dot = vx * dx + vy * dy
        const rx = 2 * dot * dx - vx
        const ry = 2 * dot * dy - vy
        const expected = norm((Math.atan2(rx, -ry) * 180) / Math.PI)
        expect(circularDiff(reflectAngleAcrossAxis(angle, axis), expected)).toBeLessThan(1e-6)
        // دوبار آینه‌کردن = اثر همانی
        expect(circularDiff(reflectAngleAcrossAxis(reflectAngleAcrossAxis(angle, axis), axis), norm(angle))).toBeLessThan(1e-6)
      }
    }
    // موارد نمادین آینهٔ عمودی: ۳:۴۵ → عقربه‌ها به ۹:۱۵ می‌روند
    expect(mirrorAngle(112.5, 'vertical')).toBe(247.5)
    expect(mirrorAngle(270, 'vertical')).toBe(90)
    // آینهٔ افقی: ۱۲ → ۶
    expect(mirrorAngle(0, 'horizontal')).toBe(180)
    // آینهٔ قطری (φ=۴۵°): θ′ = ۹۰ − θ
    expect(mirrorAngle(0, 'diagonal')).toBe(90)
  })

  it('هر مرحله در همهٔ سطوح سالم است: ۴ گزینهٔ یکتا، دقیقاً یک درست، دست‌های بی‌ابهام', () => {
    for (const difficulty of [1, 2, 3, 4, 5]) {
      const config = configForDifficulty(difficulty)
      const trials = collectTrials(config, SEED)
      expect(trials).toHaveLength(12)
      for (const t of trials) {
        // گزینه‌ها
        expect(t.options).toHaveLength(4)
        const keys = t.options.map(timeKey)
        expect(new Set(keys).size).toBe(4)
        const correctCount = t.options.filter((o) => o.hour === t.hour && o.minute === t.minute).length
        expect(correctCount).toBe(1)
        for (const option of t.options) {
          expect(option.hour).toBeGreaterThanOrEqual(1)
          expect(option.hour).toBeLessThanOrEqual(12)
          expect(option.minute).toBeGreaterThanOrEqual(0)
          expect(option.minute).toBeLessThanOrEqual(59)
          expect(option.minute % config.minuteGranularity).toBe(0)
        }
        // محور و مهلت با کانفیگ
        expect(config.mirrorAxes).toContain(t.mirrorAxis)
        expect(t.responseWindowMs).toBe(config.responseWindowMs)
        // زمان روی شبکهٔ گام و با عقربه‌های تفکیک‌پذیر
        expect(t.minute % config.minuteGranularity).toBe(0)
        expect(handSeparationDeg(t.hour, t.minute)).toBeGreaterThanOrEqual(30)
        // زاویه‌های آینه‌شده = فرمول دقیق 2φ − θ
        const real = realHandAngles(t.hour, t.minute)
        const axisDeg = MIRROR_AXIS_ANGLES[t.mirrorAxis]
        expect(t.mirroredHourAngle).toBeCloseTo(reflectAngleAcrossAxis(real.hourAngle, axisDeg), 9)
        expect(t.mirroredMinuteAngle).toBeCloseTo(reflectAngleAcrossAxis(real.minuteAngle, axisDeg), 9)
      }
    }
  })

  it('گزینه‌های فریبنده: خوانش آینه‌ای و جابه‌جایی عقربه‌ها هر بار که معتبرند حاضرند', () => {
    const config = configForDifficulty(3) // هر سه نوع انحرافی
    const trials = collectTrials(config, SEED)
    expect(trials.length).toBeGreaterThan(0)
    for (const t of trials) {
      const correct: TimeOption = { hour: t.hour, minute: t.minute }
      const naive = naiveMirrorRead(correct, t.mirrorAxis, config.minuteGranularity)
      const swap = handSwapRead(correct, config.minuteGranularity)
      // «mirror» اولویت اول است: تا وقتی با پاسخ درست یکی نباشد، حاضر است
      if (timeKey(naive) !== timeKey(correct)) {
        expect(t.options).toContainEqual(naive)
      }
      // «swap» اولویت دوم: تا وقتی با درست یا naive یکی نباشد، حاضر است
      if (timeKey(swap) !== timeKey(correct) && timeKey(swap) !== timeKey(naive)) {
        expect(t.options).toContainEqual(swap)
      }
    }
  })

  it('خوانش ساده‌لوحانهٔ آینه و جابه‌جایی عقربه‌ها برای زمان‌های مرجع درست‌اند', () => {
    // آینهٔ عمودی: ۳:۴۵ ← ۸:۱۵ (خطای کلاسیک آینه)
    expect(naiveMirrorRead({ hour: 3, minute: 45 }, 'vertical', 5)).toEqual({ hour: 8, minute: 15 })
    // زمان متقارنِ ۶:۰۰ با آینهٔ عمودی خودش خوانده می‌شود
    expect(naiveMirrorRead({ hour: 6, minute: 0 }, 'vertical', 5)).toEqual({ hour: 6, minute: 0 })
    // جابه‌جایی نقش عقربه‌ها در ۳:۴۵ ← ۹:۲۰
    expect(handSwapRead({ hour: 3, minute: 45 }, 5)).toEqual({ hour: 9, minute: 20 })
  })

  it('زمان متقارن (خوانش آینه‌ای = پاسخ درست) هم چهار گزینهٔ یکتا با یک درست می‌سازد', () => {
    const rng = new SeededRandom(99)
    const options = buildTrialOptions({ hour: 6, minute: 0 }, 'vertical', 5, ['mirror', 'swap', 'delta'], rng)
    expect(options).toHaveLength(4)
    expect(new Set(options.map(timeKey)).size).toBe(4)
    expect(options.filter((o) => o.hour === 6 && o.minute === 0)).toHaveLength(1)
  })

  it('هر سه نوع نتیجه (درست/غلط/بی‌پاسخی) با محرک دست‌ساز درست ارزیابی می‌شود', () => {
    const config = configForDifficulty(1)
    let state = def.createSession('a', config, SEED)
    const trial: MirrorClockTrial = {
      trialIndex: 0,
      hour: 3,
      minute: 45,
      mirrorAxis: 'vertical',
      mirroredHourAngle: 247.5,
      mirroredMinuteAngle: 90,
      options: [
        { hour: 3, minute: 45 },
        { hour: 8, minute: 15 },
        { hour: 9, minute: 20 },
        { hour: 3, minute: 40 },
      ],
      responseWindowMs: null,
    }
    state = { ...state, currentTrial: trial }

    const hit = def.submitAnswer(state, { hour: 3, minute: 45 }, 420)
    expect(hit.results[0]?.outcome).toBe('correct')
    expect(hit.results[0]?.correct).toBe(true)
    expect(hit.results[0]?.reactionTimeMs).toBe(420)
    expect(hit.results[0]?.expected).toEqual({ hour: 3, minute: 45 })
    expect(hit.results[0]?.given).toEqual({ hour: 3, minute: 45 })
    expect(hit.results[0]?.stimulus).toEqual({ hour: 3, minute: 45, mirrorAxis: 'vertical' })

    // خطای کلاسیک: خوانش مستقیم صفحهٔ آینه‌ای (۸:۱۵)
    const wrong = def.submitAnswer(state, { hour: 8, minute: 15 }, 300)
    expect(wrong.results[0]?.outcome).toBe('incorrect')
    expect(wrong.results[0]?.correct).toBe(false)
    expect(wrong.results[0]?.given).toEqual({ hour: 8, minute: 15 })

    // انقضای مهلت: بی‌پاسخی با RT تهی
    const miss = def.submitAnswer(state, null, 0)
    expect(miss.results[0]?.outcome).toBe('omission')
    expect(miss.results[0]?.correct).toBe(false)
    expect(miss.results[0]?.given).toBeNull()
    expect(miss.results[0]?.reactionTimeMs).toBeNull()
  })

  it('ثبت پاسخ بدون محرک فعال خطا می‌دهد', () => {
    const state = def.createSession('a', configForDifficulty(1), SEED)
    expect(() => def.submitAnswer(state, { hour: 3, minute: 45 }, 100)).toThrow()
  })

  it('جلسهٔ کامل ۱۲ مرحله‌ای با پاسخ همیشه درست جمع می‌شود', () => {
    const config = configForDifficulty(2)
    let state = def.createSession('a', config, SEED)
    for (let i = 0; i < config.totalTrials; i++) {
      const step = def.nextTrial(state)
      state = def.submitAnswer(step.state, { hour: step.trial.hour, minute: step.trial.minute }, 700)
    }
    expect(def.isComplete(state)).toBe(true)
    const summary = def.getSummary(state)
    expect(summary.exerciseId).toBe('mirror-clock')
    expect(summary.domain).toBe('visual-spatial')
    expect(summary.totalTrials).toBe(12)
    expect(summary.accuracy).toBe(100)
    expect(summary.metrics['naiveMirrorErrorCount']).toBe(0)
    expect(summary.metrics['swapErrorCount']).toBe(0)
    expect(summary.medianReactionTimeMs).toBe(700)
    expect(() => def.nextTrial(state)).toThrow()
  })

  it('معیارهای خطای آینه‌ای/جابه‌جایی فقط پاسخ‌های منطبق را می‌شمارند', () => {
    const config = configForDifficulty(3)
    let state = def.createSession('m', config, SEED)
    const makeTrial = (trialIndex: number): MirrorClockTrial => ({
      trialIndex,
      hour: 3,
      minute: 45,
      mirrorAxis: 'vertical',
      mirroredHourAngle: 247.5,
      mirroredMinuteAngle: 90,
      options: [
        { hour: 3, minute: 45 },
        { hour: 8, minute: 15 },
        { hour: 9, minute: 20 },
        { hour: 3, minute: 40 },
      ],
      responseWindowMs: config.responseWindowMs,
    })
    state = def.submitAnswer({ ...state, currentTrial: makeTrial(0) }, { hour: 8, minute: 15 }, 900)
    state = def.submitAnswer({ ...state, currentTrial: makeTrial(1) }, { hour: 9, minute: 20 }, 950)
    // بی‌پاسخی در هیچ‌کدام از دو معیار خطا شمرده نمی‌شود
    state = def.submitAnswer({ ...state, currentTrial: makeTrial(2) }, null, 0)

    const summary = def.getSummary(state)
    expect(summary.totalTrials).toBe(3)
    expect(summary.correctTrials).toBe(0)
    expect(summary.accuracy).toBe(0)
    expect(summary.metrics['naiveMirrorErrorCount']).toBe(1)
    expect(summary.metrics['swapErrorCount']).toBe(1)
  })
})
