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
 * شمارش معکوس پیوسته — سرعت پردازش (حالت «توالی حفظی محاسبه»)
 *
 * عدد شروع به‌مدت کوتاه نمایش داده می‌شود، سپس اعداد کوچک یکی‌یکی
 * ظاهر می‌شوند؛ بازیکن باید باقیماندهٔ در حال اجرا (عدد شروع منهای
 * هر عدد دیده‌شده) را در حافظه نگه دارد و مقدار نهایی را وارد کند.
 * محاسبهٔ سریالِ زیر بار حافظه، همان بار شناختی بازی است.
 *
 * نکتهٔ RT: طبق قرارداد SessionManager، زمان پاسخ از لحظه تولید مرحله
 * اندازهگیری می‌شود؛ یعنی شامل مدت نمایش توالی هم هست (همانند توالی اعداد).
 *
 * اقتباس نرم‌افزاری از الگوی Continuous Countdown؛ بدون استفاده از نام
 * یا دارایی بصری هیچ محصول تجاری.
 */

export interface ContinuousCountdownConfig extends ExerciseConfig {
  /** تعداد مراحل ثابت جلسه */
  readonly totalTrials: number
  /** بازهٔ عدد شروع */
  readonly startRange: Readonly<{ min: number; max: number }>
  /** تعداد اعداد کم‌شونده در هر مرحله */
  readonly stepCount: number
  /** بازهٔ مقدار هر عدد کم‌شونده */
  readonly stepRange: Readonly<{ min: number; max: number }>
  /** مدت نمایش عدد شروع (ms) */
  readonly startDisplayMs: number
  /** مدت نمایش هر عدد کم‌شونده (ms) */
  readonly stepDisplayMs: number
  /** فاصلهٔ بین نمایش‌ها (ms) */
  readonly gapMs: number
}

export interface ContinuousCountdownState extends ExerciseState<ContinuousCountdownConfig> {
  readonly currentTrial: ContinuousCountdownTrial | null
}

export interface ContinuousCountdownTrial extends ExerciseTrial {
  /** عدد آغازین که از آن کم می‌کنیم */
  readonly startNumber: number
  /** اعداد کم‌شونده به ترتیب نمایش */
  readonly subtractions: readonly number[]
  readonly startDisplayMs: number
  readonly stepDisplayMs: number
  readonly gapMs: number
}

export type ContinuousCountdownAnswer = number

export const CONTINUOUS_COUNTDOWN_ID = 'continuous-countdown'
export const CONTINUOUS_COUNTDOWN_VERSION = '1.0.0'
export const CONTINUOUS_COUNTDOWN_CONTENT_VERSION = '1'
const TOTAL_TRIALS = 10

/**
 * تنظیمات سطح دشواری — اعداد طراحی‌اند، نه هنجار بالینی.
 * قید امکان‌پذیری: در هر سطح، startRange.min ≥ stepCount × stepRange.min
 * تا همیشه توالی معتبری با باقیماندهٔ نامنفی ساخته شود.
 */
export function configForDifficulty(difficulty: number): ContinuousCountdownConfig {
  if (difficulty < 1 || difficulty > 5) {
    throw new RangeError('دشواری باید بین ۱ تا ۵ باشد')
  }
  switch (difficulty) {
    case 1:
      return {
        difficulty,
        totalTrials: TOTAL_TRIALS,
        startRange: { min: 20, max: 30 },
        stepCount: 3,
        stepRange: { min: 1, max: 5 },
        startDisplayMs: 1600,
        stepDisplayMs: 1000,
        gapMs: 300,
      }
    case 2:
      return {
        difficulty,
        totalTrials: TOTAL_TRIALS,
        startRange: { min: 30, max: 45 },
        stepCount: 4,
        stepRange: { min: 2, max: 6 },
        startDisplayMs: 1500,
        stepDisplayMs: 900,
        gapMs: 300,
      }
    case 3:
      return {
        difficulty,
        totalTrials: TOTAL_TRIALS,
        startRange: { min: 45, max: 65 },
        stepCount: 5,
        stepRange: { min: 2, max: 8 },
        startDisplayMs: 1400,
        stepDisplayMs: 800,
        gapMs: 250,
      }
    case 4:
      return {
        difficulty,
        totalTrials: TOTAL_TRIALS,
        startRange: { min: 65, max: 85 },
        stepCount: 6,
        stepRange: { min: 3, max: 9 },
        startDisplayMs: 1300,
        stepDisplayMs: 700,
        gapMs: 250,
      }
    default:
      return {
        difficulty,
        totalTrials: TOTAL_TRIALS,
        startRange: { min: 85, max: 99 },
        stepCount: 7,
        stepRange: { min: 3, max: 9 },
        startDisplayMs: 1200,
        stepDisplayMs: 600,
        gapMs: 200,
      }
  }
}

/** باقیماندهٔ نهایی: عدد شروع منهای مجموع اعداد کم‌شونده */
export function computeRemainder(startNumber: number, subtractions: readonly number[]): number {
  return subtractions.reduce((remaining, step) => remaining - step, startNumber)
}

/**
 * ساخت یک مرحله: هر عدد کم‌شونده از باقیماندهٔ جاری کم می‌شود، با قید
 * اینکه بعد از هر کاهش و برای باقی‌ماندهٔ مراحل، فضای کافی برای حداقلِ
 * بازه باقی بماند — نتیجه: باقیماندهٔ در حال اجرا هرگز منفی نمی‌شود.
 */
function makeTrial(rng: SeededRandom, config: ContinuousCountdownConfig): ContinuousCountdownTrial {
  const startNumber = rng.int(config.startRange.min, config.startRange.max)
  const subtractions: number[] = []
  let remaining = startNumber
  for (let i = 0; i < config.stepCount; i++) {
    const stepsAfter = config.stepCount - i - 1
    const maxAllowed = Math.min(config.stepRange.max, remaining - stepsAfter * config.stepRange.min)
    const step = rng.int(config.stepRange.min, maxAllowed)
    subtractions.push(step)
    remaining -= step
  }
  return {
    trialIndex: 0, // در nextTrial مقدار واقعی گذاشته می‌شود
    startNumber,
    subtractions,
    startDisplayMs: config.startDisplayMs,
    stepDisplayMs: config.stepDisplayMs,
    gapMs: config.gapMs,
    responseWindowMs: null,
  }
}

export const continuousCountdownDefinition: ExerciseDefinition<
  ContinuousCountdownConfig,
  ContinuousCountdownState,
  ContinuousCountdownTrial,
  ContinuousCountdownAnswer
> = {
  id: CONTINUOUS_COUNTDOWN_ID,
  version: CONTINUOUS_COUNTDOWN_VERSION,
  contentVersion: CONTINUOUS_COUNTDOWN_CONTENT_VERSION,
  domain: 'processing-speed',

  createSession(sessionId, config, seed) {
    return { sessionId, config, seed, nextTrialIndex: 0, currentTrial: null, results: [] }
  },

  nextTrial(state) {
    if (state.nextTrialIndex >= state.config.totalTrials) {
      throw new Error('همه مراحل تولید شده‌اند')
    }
    const trialIndex = state.nextTrialIndex
    const rng = new SeededRandom(deriveTrialSeed(state.seed, trialIndex))
    const trial: ContinuousCountdownTrial = {
      ...makeTrial(rng, state.config),
      trialIndex,
    }
    return { state: { ...state, nextTrialIndex: trialIndex + 1, currentTrial: trial }, trial }
  },

  submitAnswer(state, answer, reactionTimeMs) {
    const trial = state.currentTrial
    if (!trial) throw new Error('مرحله فعالی برای ثبت پاسخ وجود ندارد')
    const given = answer
    const expected = computeRemainder(trial.startNumber, trial.subtractions)
    const isCorrect = given !== null && given === expected
    const outcome: TrialOutcome = given === null ? 'omission' : isCorrect ? 'correct' : 'incorrect'
    const record: RecordedTrial = {
      trialIndex: trial.trialIndex,
      stimulus: { startNumber: trial.startNumber, subtractions: trial.subtractions },
      expected,
      given,
      outcome,
      correct: outcomeIsCorrect(outcome),
      reactionTimeMs: given === null ? null : reactionTimeMs,
    }
    return { ...state, currentTrial: null, results: [...state.results, record] }
  },

  isComplete(state) {
    return state.results.length >= state.config.totalTrials
  },

  getSummary(state): ExerciseSummary {
    const totals = summarizeOutcomes(state.results)
    const answered = state.results.filter((r) => typeof r.given === 'number')
    // میانگین زمان پاسخ نهایی مراحل پاسخداده‌شده (ms) — شامل مدت نمایش توالی
    const meanAnswerTimeMs =
      answered.length > 0
        ? Math.round(
            answered.reduce((sum, r) => sum + (r.reactionTimeMs ?? 0), 0) / answered.length,
          )
        : 0
    // معیار دومیه: میانگین انحراف مطلق پاسخ از باقیماندهٔ درست (با یک رقم اعشار)
    const absoluteDeviations = answered.map((r) => Math.abs((r.given as number) - (r.expected as number)))
    const meanAbsoluteDeviation =
      absoluteDeviations.length > 0
        ? Math.round(
            (absoluteDeviations.reduce((sum, d) => sum + d, 0) / absoluteDeviations.length) * 10,
          ) / 10
        : 0
    return {
      exerciseId: CONTINUOUS_COUNTDOWN_ID,
      sessionId: state.sessionId,
      exerciseVersion: CONTINUOUS_COUNTDOWN_VERSION,
      contentVersion: CONTINUOUS_COUNTDOWN_CONTENT_VERSION,
      domain: 'processing-speed',
      difficulty: state.config.difficulty,
      ...totals,
      metrics: {
        meanAnswerTimeMs,
        meanAbsoluteDeviation,
        /** طول توالی کم‌شونده‌ها در این سطح */
        stepsPerTrial: state.config.stepCount,
      },
    }
  },
}
