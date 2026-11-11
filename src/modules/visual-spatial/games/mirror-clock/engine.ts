import type {
  ExerciseConfig,
  ExerciseDefinition,
  ExerciseState,
  ExerciseSummary,
  ExerciseTrial,
  RecordedTrial,
  TrialOutcome,
} from '../../../../core/types'
import { outcomeIsCorrect } from '../../../../core/types'
import { SeededRandom } from '../../../../core/randomization/seeded-random'
import { deriveTrialSeed } from '../../../../core/randomization/derive-seed'
import { summarizeOutcomes } from '../../../../core/scoring/scoring'

/**
 * ساعت آینه‌ای — چرخش ذهنی و تصویرسازی دیداری
 *
 * یک ساعت آنالوگ به‌همراه صفحه و اعدادش «در آینه» دیده می‌شود (بازتاب
 * کامل صفحه حول یک محور گذرنده از مرکز). کاربر باید زمان واقعی را در
 * ذهن بازسازی کند و از میان چهار گزینه «ساعت:دقیقه» انتخاب کند.
 *
 * ریاضی آینه (حقیقت موتور): زاویه‌ها «ساعتگرد از ۱۲» اند. بازتاب یک
 * راستا با زاویهٔ θ حول محوری با زاویهٔ φ دقیقاً θ′ = 2φ − θ است
 * (اثبات با بازتاب برداری v′ = 2(v·d)d − v قابل راستی‌آزمایی است؛
 * تست‌های engine.test.ts همین را مستقل چک می‌کنند). کامپوننت هم کل
 * صفحه را با transform معادل SVG آینه می‌کند، پس رندر و موتور یکی‌اند.
 *
 * گزینه‌های انحرافی از خطاهای رایج خوانش آینه می‌آیند:
 *  ۱) خوانش ساده‌لوحانهٔ صفحهٔ آینه‌ای (زمانی که کاربر آینه را «نادیده»
 *     می‌گیرد و مستقیم می‌خواند) — دقیقاً محاسبه‌پذیر است؛
 *  ۲) جابه‌جایی نقش عقربه‌ها (عقربهٔ دقیقه به‌عنوان ساعت خوانده می‌شود)؛
 *  ۳) ±۵ دقیقه (اشتباه در یک تیک عقربهٔ دقیقه).
 *
 * دشواری ۱..۵: گام دقیقه (۵ → ۱)، محور آینه (عمودی → افقی/قطری)،
 * تنوع گزینه‌های فریبنده و پنجرهٔ پاسخ (بدون مهلت → ۱۰ → ۶ ثانیه).
 *
 * اقتباس نرم‌افزاری از تکلیف کلاسیک Mirror Reading/Clock في حوزهٔ
 * دیداری-فضایی؛ نمایش اعداد فارسی، بدون دارایی بصری هیچ محصول تجاری.
 */

/** محور آینه — راستایی که صفحه حول آن بازتاب می‌یابد */
export type MirrorAxis = 'vertical' | 'horizontal' | 'diagonal'

export const MIRROR_AXES: readonly MirrorAxis[] = ['vertical', 'horizontal', 'diagonal']

export const MIRROR_AXIS_LABELS_FA: Readonly<Record<MirrorAxis, string>> = {
  vertical: 'عمودی',
  horizontal: 'افقی',
  diagonal: 'قطری',
}

/**
 * زاویهٔ محور آینه (درجه، ساعتگرد از ۱۲):
 * عمودی = خط ۱۲-۶ · افقی = خط ۹-۳ · قطری = خط ۱:۳۰-۷:۳۰
 */
export const MIRROR_AXIS_ANGLES: Readonly<Record<MirrorAxis, number>> = {
  vertical: 0,
  horizontal: 90,
  diagonal: 45,
}

/** انواع گزینهٔ انحرافی — خطاهای رایج خوانش ساعت آینه‌ای */
export type MirrorClockDistractorKind = 'mirror' | 'swap' | 'delta'

/** یک زمان «ساعت:دقیقه» — گزینهٔ پاسخ یا دادهٔ محرک */
export interface TimeOption {
  readonly hour: number
  readonly minute: number
}

export interface MirrorClockConfig extends ExerciseConfig {
  readonly totalTrials: number
  /** گام دقیقه‌های مجاز (۵ یا ۱ دقیقه) */
  readonly minuteGranularity: number
  readonly mirrorAxes: readonly MirrorAxis[]
  readonly responseWindowMs: number | null
  readonly distractorKinds: readonly MirrorClockDistractorKind[]
}

export interface MirrorClockTrial extends ExerciseTrial {
  /** زمان واقعی ساعت (پاسخ درست) */
  readonly hour: number
  readonly minute: number
  readonly mirrorAxis: MirrorAxis
  /** زاویهٔ عقربهٔ ساعت پس از آینه (درجه ساعتگرد از ۱۲) — حقیقت موتور */
  readonly mirroredHourAngle: number
  /** زاویهٔ عقربهٔ دقیقه پس از آینه */
  readonly mirroredMinuteAngle: number
  /** چهار گزینه با دقیقاً یک درست — ترتیب با seed شافل شده */
  readonly options: readonly TimeOption[]
}

export interface MirrorClockState extends ExerciseState<MirrorClockConfig> {
  readonly currentTrial: MirrorClockTrial | null
}

/** پاسخ کاربر: زمان انتخابی؛ null یعنی انقضای مهلت */
export type MirrorClockAnswer = TimeOption | null

export const MIRROR_CLOCK_ID = 'mirror-clock'
export const MIRROR_CLOCK_VERSION = '1.0.0'
export const MIRROR_CLOCK_CONTENT_VERSION = '1'
const TOTAL_TRIALS = 12

/**
 * حداقل فاصلهٔ زاویه‌ای عقربه‌ها (درجه) برای «دستهای بدون ابهام» —
 * عقربه‌های درهم‌تنیده پس از آینه قابل تفکیک نیستند.
 */
const MIN_HAND_SEPARATION_DEG = 30

interface DifficultyLevel {
  readonly granularity: number
  readonly axes: readonly MirrorAxis[]
  readonly windowMs: number | null
  readonly kinds: readonly MirrorClockDistractorKind[]
}

/** نردبان دشواری ۱..۵ — اعداد طراحی‌اند، نه هنجار جمعیتی */
const LEVELS: readonly DifficultyLevel[] = [
  { granularity: 5, axes: ['vertical'], windowMs: null, kinds: ['mirror', 'delta'] },
  { granularity: 5, axes: ['vertical'], windowMs: null, kinds: ['mirror', 'swap', 'delta'] },
  { granularity: 5, axes: ['vertical'], windowMs: 10000, kinds: ['mirror', 'swap', 'delta'] },
  { granularity: 1, axes: ['vertical', 'horizontal'], windowMs: 8000, kinds: ['mirror', 'swap', 'delta'] },
  {
    granularity: 1,
    axes: ['vertical', 'horizontal', 'diagonal'],
    windowMs: 6000,
    kinds: ['mirror', 'swap', 'delta'],
  },
]

export function configForDifficulty(difficulty: number): MirrorClockConfig {
  if (difficulty < 1 || difficulty > 5) {
    throw new RangeError('دشواری باید بین ۱ تا ۵ باشد')
  }
  const level = LEVELS[difficulty - 1] as DifficultyLevel
  return {
    difficulty,
    totalTrials: TOTAL_TRIALS,
    minuteGranularity: level.granularity,
    mirrorAxes: level.axes,
    responseWindowMs: level.windowMs,
    distractorKinds: level.kinds,
  }
}

// ————————————————— ریاضی ساعت و آینه —————————————————

function norm360(deg: number): number {
  return ((deg % 360) + 360) % 360
}

function mod(value: number, m: number): number {
  return ((value % m) + m) % m
}

function sameTime(a: TimeOption, b: TimeOption): boolean {
  return a.hour === b.hour && a.minute === b.minute
}

/** زاویهٔ واقعی عقربه‌ها (درجه ساعتگرد از ۱۲) برای زمان داده‌شده */
export function realHandAngles(hour: number, minute: number): { hourAngle: number; minuteAngle: number } {
  return {
    hourAngle: norm360(((hour % 12) * 30 + minute * 0.5)),
    minuteAngle: norm360(minute * 6),
  }
}

/**
 * بازتاب دقیق یک زاویهٔ ساعتگرد حول محور با زاویهٔ axisDeg:
 * θ′ = 2φ − θ — همان تبدیلی که transform آینهٔ SVG انجام می‌دهد.
 */
export function reflectAngleAcrossAxis(angleDeg: number, axisDeg: number): number {
  return norm360(2 * axisDeg - angleDeg)
}

/** زاویهٔ آینه‌شده برای یکی از محورهای نام‌دار بازی */
export function mirrorAngle(angleDeg: number, mirrorAxis: MirrorAxis): number {
  return reflectAngleAcrossAxis(angleDeg, MIRROR_AXIS_ANGLES[mirrorAxis])
}

/** فاصلهٔ زاویه‌ای دو عقربه (کوتانهٔ ۰..۱۸۰) — معیار بی‌ابهامی دست‌ها */
export function handSeparationDeg(hour: number, minute: number): number {
  const { hourAngle, minuteAngle } = realHandAngles(hour, minute)
  const diff = Math.abs(hourAngle - minuteAngle) % 360
  return Math.min(diff, 360 - diff)
}

/** اعتبار یک زمان: ساعت ۱..۱۲ و دقیقهٔ روی شبکهٔ گام */
function isValidOption(option: TimeOption, granularity: number): boolean {
  return (
    Number.isInteger(option.hour) &&
    option.hour >= 1 &&
    option.hour <= 12 &&
    Number.isInteger(option.minute) &&
    option.minute >= 0 &&
    option.minute <= 59 &&
    option.minute % granularity === 0
  )
}

/**
 * خوانش ساده‌لوحانهٔ صفحهٔ آینه‌ای: اگر کاربر آینه را نادیده بگیرد و
 * عقربه‌های آینه‌شده را مستقیم بخواند چه زمانی می‌بیند؟ (نزدیک‌ترین
 * زمان معتبر روی شبکهٔ گام). این همان خطای کلاسیک آینه است؛
 * مثلاً ۳:۴۵ با آینهٔ عمودی به‌صورت ۸:۱۵ خوانده می‌شود.
 */
export function naiveMirrorRead(
  time: TimeOption,
  axis: MirrorAxis,
  granularity: number,
): TimeOption {
  const axisDeg = MIRROR_AXIS_ANGLES[axis]
  const real = realHandAngles(time.hour, time.minute)
  const mirroredHourAngle = reflectAngleAcrossAxis(real.hourAngle, axisDeg)
  const mirroredMinuteAngle = reflectAngleAcrossAxis(real.minuteAngle, axisDeg)
  // دقیقهٔ خوانده‌شده: نزدیک‌ترین مقدار شبکه‌ای به جای عقربهٔ دقیقه
  const readMinute = mod(Math.round(mirroredMinuteAngle / 6 / granularity) * granularity, 60)
  // ساعت: عقربهٔ ساعت آینه‌ای با آن دقیقه سازگار شود
  const readHourTick = Math.round((mirroredHourAngle - 0.5 * readMinute) / 30)
  const readHour = mod(readHourTick, 12)
  return { hour: readHour === 0 ? 12 : readHour, minute: readMinute }
}

/**
 * جابه‌جایی نقش عقربه‌ها: عقربهٔ دقیقه به‌عنوان عقربهٔ ساعت خوانده
 * می‌شود و برعکس (خطای رایج تفکیک عقربه‌ها)؛ مثلاً ۳:۴۵ → ۹:۲۰.
 */
export function handSwapRead(time: TimeOption, granularity: number): TimeOption {
  const real = realHandAngles(time.hour, time.minute)
  const swapHourTick = Math.round(real.minuteAngle / 30)
  const swapHour = mod(swapHourTick, 12)
  const swapMinute = mod(Math.round(real.hourAngle / 6 / granularity) * granularity, 60)
  return { hour: swapHour === 0 ? 12 : swapHour, minute: swapMinute }
}

/** جابه‌جایی دقیقه با delta دقیقه؛ بیرون از ۰..۵۹ → null */
function shiftedMinute(time: TimeOption, deltaMinutes: number, granularity: number): TimeOption | null {
  const minute = time.minute + deltaMinutes
  const candidate: TimeOption = { hour: time.hour, minute }
  return isValidOption(candidate, granularity) ? candidate : null
}

function optionKey(option: TimeOption): number {
  return option.hour * 60 + option.minute
}

/**
 * ساخت چهار گزینه: پاسخ درست + سه انحرافی. انحرافی‌ها به‌ترتیب
 * اولویت از kinds می‌آیند و اگر کم آوردند از ذخیرهٔ پشتیبان قطعی
 * (∓۵ دقیقه، ساعت±۱، ±۱۰ و ±۱۵ دقیقه) پر می‌شوند؛ خروجی با rng
 * شافل می‌شود تا مکان گزینهٔ درست پیش‌بینی‌ناپذیر بماند.
 */
export function buildTrialOptions(
  correct: TimeOption,
  axis: MirrorAxis,
  granularity: number,
  kinds: readonly MirrorClockDistractorKind[],
  rng: SeededRandom,
): TimeOption[] {
  const used = new Set<number>([optionKey(correct)])
  const distractors: TimeOption[] = []

  const push = (candidate: TimeOption | null): void => {
    if (candidate === null || distractors.length >= 3) return
    if (!isValidOption(candidate, granularity)) return
    const key = optionKey(candidate)
    if (used.has(key)) return
    used.add(key)
    distractors.push(candidate)
  }

  let deltaSign = 1
  for (const kind of kinds) {
    switch (kind) {
      case 'mirror':
        push(naiveMirrorRead(correct, axis, granularity))
        break
      case 'swap':
        push(handSwapRead(correct, granularity))
        break
      case 'delta': {
        deltaSign = rng.bool() ? 1 : -1
        push(shiftedMinute(correct, deltaSign * 5, granularity))
        break
      }
    }
  }

  const hourPlus1: TimeOption = { hour: (correct.hour % 12) + 1, minute: correct.minute }
  const hourMinus1: TimeOption = { hour: ((correct.hour + 10) % 12) + 1, minute: correct.minute }
  const fallbacks: readonly (TimeOption | null)[] = [
    shiftedMinute(correct, -deltaSign * 5, granularity),
    hourPlus1,
    hourMinus1,
    shiftedMinute(correct, deltaSign * 10, granularity),
    shiftedMinute(correct, -deltaSign * 10, granularity),
    shiftedMinute(correct, 15, granularity),
    shiftedMinute(correct, -15, granularity),
  ]
  for (const fallback of fallbacks) {
    if (distractors.length >= 3) break
    push(fallback)
  }
  if (distractors.length < 3) {
    throw new Error('نشد چهار گزینهٔ یکتا ساخت — گام دقیقه نامعتبر است')
  }
  return rng.shuffle([correct, ...distractors])
}

/** استخر زمان‌های مجاز با دست‌های بی‌ابهام (فاصلهٔ عقربه‌ها ≥ ۳۰°) */
const timePoolCache = new Map<number, TimeOption[]>()
function unambiguousTimes(granularity: number): readonly TimeOption[] {
  const cached = timePoolCache.get(granularity)
  if (cached !== undefined) return cached
  const pool: TimeOption[] = []
  for (let hour = 1; hour <= 12; hour++) {
    for (let minute = 0; minute <= 59; minute += granularity) {
      if (handSeparationDeg(hour, minute) >= MIN_HAND_SEPARATION_DEG) {
        pool.push({ hour, minute })
      }
    }
  }
  timePoolCache.set(granularity, pool)
  return pool
}

export const mirrorClockDefinition: ExerciseDefinition<
  MirrorClockConfig,
  MirrorClockState,
  MirrorClockTrial,
  MirrorClockAnswer
> = {
  id: MIRROR_CLOCK_ID,
  version: MIRROR_CLOCK_VERSION,
  contentVersion: MIRROR_CLOCK_CONTENT_VERSION,
  domain: 'visual-spatial',

  createSession(sessionId, config, seed) {
    return { sessionId, config, seed, nextTrialIndex: 0, currentTrial: null, results: [] }
  },

  nextTrial(state) {
    if (state.nextTrialIndex >= state.config.totalTrials) {
      throw new Error('همه محرک‌ها تولید شده‌اند')
    }
    const trialIndex = state.nextTrialIndex
    const rng = new SeededRandom(deriveTrialSeed(state.seed, trialIndex))
    const granularity = state.config.minuteGranularity
    const { hour, minute } = rng.pick(unambiguousTimes(granularity))
    const axis = rng.pick(state.config.mirrorAxes)
    const real = realHandAngles(hour, minute)
    const trial: MirrorClockTrial = {
      trialIndex,
      hour,
      minute,
      mirrorAxis: axis,
      mirroredHourAngle: mirrorAngle(real.hourAngle, axis),
      mirroredMinuteAngle: mirrorAngle(real.minuteAngle, axis),
      options: buildTrialOptions({ hour, minute }, axis, granularity, state.config.distractorKinds, rng),
      responseWindowMs: state.config.responseWindowMs,
    }
    return { state: { ...state, nextTrialIndex: trialIndex + 1, currentTrial: trial }, trial }
  },

  submitAnswer(state, answer, reactionTimeMs) {
    const trial = state.currentTrial
    if (!trial) throw new Error('محرک فعالی برای ثبت پاسخ وجود ندارد')
    const correct = answer !== null && answer.hour === trial.hour && answer.minute === trial.minute
    const outcome: TrialOutcome = answer === null ? 'omission' : correct ? 'correct' : 'incorrect'
    const record: RecordedTrial = {
      trialIndex: trial.trialIndex,
      stimulus: { hour: trial.hour, minute: trial.minute, mirrorAxis: trial.mirrorAxis },
      expected: { hour: trial.hour, minute: trial.minute },
      given: answer,
      outcome,
      correct: outcomeIsCorrect(outcome),
      reactionTimeMs: answer === null ? null : reactionTimeMs,
    }
    return { ...state, currentTrial: null, results: [...state.results, record] }
  },

  isComplete(state) {
    return state.results.length >= state.config.totalTrials
  },

  getSummary(state): ExerciseSummary {
    const totals = summarizeOutcomes(state.results)
    const granularity = state.config.minuteGranularity
    let naiveMirrorErrorCount = 0
    let swapErrorCount = 0
    for (const record of state.results) {
      if (record.correct || record.given === null) continue
      const stimulus = record.stimulus as { hour: number; minute: number; mirrorAxis: MirrorAxis }
      const given = record.given as TimeOption
      const time: TimeOption = { hour: stimulus.hour, minute: stimulus.minute }
      if (sameTime(given, naiveMirrorRead(time, stimulus.mirrorAxis, granularity))) {
        naiveMirrorErrorCount++
      } else if (sameTime(given, handSwapRead(time, granularity))) {
        swapErrorCount++
      }
    }
    return {
      exerciseId: MIRROR_CLOCK_ID,
      sessionId: state.sessionId,
      exerciseVersion: MIRROR_CLOCK_VERSION,
      contentVersion: MIRROR_CLOCK_CONTENT_VERSION,
      domain: 'visual-spatial',
      difficulty: state.config.difficulty,
      ...totals,
      metrics: {
        naiveMirrorErrorCount,
        swapErrorCount,
      },
    }
  },
}
