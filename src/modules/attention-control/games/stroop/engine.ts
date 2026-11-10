import type {
  ExerciseConfig,
  ExerciseDefinition,
  ExerciseState,
  ExerciseSummary,
  ExerciseTrial,
  RecordedTrial,
} from '../../../../core/types'
import { SeededRandom } from '../../../../core/randomization/seeded-random'
import { deriveTrialSeed } from '../../../../core/randomization/derive-seed'
import { accuracyPercent, median, summarizeOutcomes } from '../../../../core/scoring/scoring'

/**
 * Stroop — تداخل رنگ و کلمه
 *
 * یک کلمه رنگ فارسی (قرمز/آبی/سبز/زرد) با «جوهرِ» رنگی و احتمالاً متفاوت
 * نمایش داده می‌شود؛ کاربر باید رنگِ جوهر را انتخاب کند، نه معنی کلمه را.
 * مراحل هم‌خوان (جوهر = کلمه) و ناهم‌خوان (جوهر ≠ کلمه) جداگانه گزارش
 * می‌شوند و «هزینه استروپ» (اختلاف زمان پاسخ دو زیرمجموعه) محاسبه می‌شود.
 *
 * اقتباس از آزمون کلاسیک Stroop در روان‌شناسی شناختی؛
 * بدون دارایی بصری هیچ محصول تجاری.
 */

/** کلیدهای رنگ — هم برای کلمه و هم برای جوهر */
export type StroopColorKey = 'red' | 'blue' | 'green' | 'yellow'

export const STROOP_COLORS: readonly StroopColorKey[] = ['red', 'blue', 'green', 'yellow']

/** برچسب فارسی هر رنگ — برای نمایش کلمه و دکمه‌های پاسخ */
export const STROOP_COLOR_LABELS_FA: Readonly<Record<StroopColorKey, string>> = {
  red: 'قرمز',
  blue: 'آبی',
  green: 'سبز',
  yellow: 'زرد',
}

export interface StroopConfig extends ExerciseConfig {
  /** تعداد کل مراحل */
  readonly totalTrials: number
  /** احتمال هم‌خوان بودن جوهر با معنی کلمه */
  readonly congruentRatio: number
  /** مهلت پاسخ هر مرحله (ms) */
  readonly responseWindowMs: number
}

export interface StroopTrial extends ExerciseTrial {
  /** معنی کلمه نمایش‌داده‌شده */
  readonly word: StroopColorKey
  /** رنگ جوهرِ کلمه — پاسخ درست همین است */
  readonly ink: StroopColorKey
  /** آیا جوهر با معنی کلمه یکی است */
  readonly isCongruent: boolean
  readonly responseWindowMs: number
}

export interface StroopState extends ExerciseState<StroopConfig> {
  readonly currentTrial: StroopTrial | null
}

/** پاسخ کاربر: کلید رنگ انتخابی؛ null یعنی انقضای مهلت */
export type StroopAnswer = StroopColorKey | null

export const STROOP_ID = 'stroop'
export const STROOP_VERSION = '1.0.0'
export const STROOP_CONTENT_VERSION = '1'
const TOTAL_TRIALS = 20

/** نسبت هم‌خوانی و پنجره پاسخ برای دشواری ۱..۵ — آرایه تا مقادیر دقیق بمانند */
const CONGRUENT_RATIOS = [0.5, 0.4, 0.3, 0.2, 0.1] as const
const RESPONSE_WINDOWS_MS = [3500, 3125, 2750, 2375, 2000] as const

/** تنظیمات سطح دشواری: هم‌خوانی کمتر و مهلت کوتاه‌تر */
export function configForDifficulty(difficulty: number): StroopConfig {
  if (difficulty < 1 || difficulty > 5) {
    throw new RangeError('دشواری باید بین ۱ تا ۵ باشد')
  }
  return {
    difficulty,
    totalTrials: TOTAL_TRIALS,
    congruentRatio: CONGRUENT_RATIOS[difficulty - 1],
    responseWindowMs: RESPONSE_WINDOWS_MS[difficulty - 1],
  }
}

export const stroopDefinition: ExerciseDefinition<StroopConfig, StroopState, StroopTrial, StroopAnswer> = {
  id: STROOP_ID,
  version: STROOP_VERSION,
  contentVersion: STROOP_CONTENT_VERSION,
  domain: 'attention-control',

  createSession(sessionId, config, seed) {
    return { sessionId, config, seed, nextTrialIndex: 0, currentTrial: null, results: [] }
  },

  nextTrial(state) {
    if (state.nextTrialIndex >= state.config.totalTrials) {
      throw new Error('همه محرک‌ها تولید شده‌اند')
    }
    const trialIndex = state.nextTrialIndex
    const rng = new SeededRandom(deriveTrialSeed(state.seed, trialIndex))
    const word = rng.pick(STROOP_COLORS)
    const isCongruent = rng.bool(state.config.congruentRatio)
    // در مراحل ناهم‌خوان، جوهر باید حتماً با کلمه فرق کند
    const ink = isCongruent ? word : rng.pick(STROOP_COLORS.filter((c) => c !== word))
    const trial: StroopTrial = {
      trialIndex,
      word,
      ink,
      isCongruent,
      responseWindowMs: state.config.responseWindowMs,
    }
    return { state: { ...state, nextTrialIndex: trialIndex + 1, currentTrial: trial }, trial }
  },

  submitAnswer(state, answer, reactionTimeMs) {
    const trial = state.currentTrial
    if (!trial) throw new Error('محرک فعالی برای ثبت پاسخ وجود ندارد')
    const stimulus = { word: trial.word, ink: trial.ink }
    const record: RecordedTrial =
      answer === trial.ink
        ? {
            trialIndex: trial.trialIndex,
            stimulus,
            expected: trial.ink,
            given: answer,
            outcome: 'correct',
            correct: true,
            reactionTimeMs,
          }
        : answer === null
          ? {
              // انقضای مهلت: بی‌پاسخی
              trialIndex: trial.trialIndex,
              stimulus,
              expected: trial.ink,
              given: null,
              outcome: 'omission',
              correct: false,
              reactionTimeMs: null,
            }
          : {
              trialIndex: trial.trialIndex,
              stimulus,
              expected: trial.ink,
              given: answer,
              outcome: 'incorrect',
              correct: false,
              reactionTimeMs,
            }
    return { ...state, currentTrial: null, results: [...state.results, record] }
  },

  isComplete(state) {
    return state.results.length >= state.config.totalTrials
  },

  getSummary(state): ExerciseSummary {
    const totals = summarizeOutcomes(state.results)
    // تفکیک مراحل هم‌خوان/ناهم‌خوان از روی محرک ثبت‌شده
    const congruent = state.results.filter(
      (r) => (r.stimulus as { word: StroopColorKey; ink: StroopColorKey }).word ===
        (r.stimulus as { word: StroopColorKey; ink: StroopColorKey }).ink,
    )
    const incongruent = state.results.filter(
      (r) => (r.stimulus as { word: StroopColorKey; ink: StroopColorKey }).word !==
        (r.stimulus as { word: StroopColorKey; ink: StroopColorKey }).ink,
    )
    const correctRts = (trials: readonly RecordedTrial[]): number[] =>
      trials
        .filter((r) => r.correct)
        .map((r) => r.reactionTimeMs)
        .filter((rt): rt is number => rt !== null)
    const medianCongruent = median(correctRts(congruent))
    const medianIncongruent = median(correctRts(incongruent))
    return {
      exerciseId: STROOP_ID,
      sessionId: state.sessionId,
      exerciseVersion: STROOP_VERSION,
      contentVersion: STROOP_CONTENT_VERSION,
      domain: 'attention-control',
      difficulty: state.config.difficulty,
      ...totals,
      metrics: {
        congruentAccuracy: accuracyPercent(congruent.filter((r) => r.correct).length, congruent.length),
        incongruentAccuracy: accuracyPercent(incongruent.filter((r) => r.correct).length, incongruent.length),
        // هزینه استروپ: میانه RT ناهم‌خوان منهای میانه RT هم‌خوان (فقط پاسخ‌های درست)
        stroopCostMs:
          medianCongruent !== null && medianIncongruent !== null
            ? Math.round(medianIncongruent - medianCongruent)
            : 0,
      },
    }
  },
}
