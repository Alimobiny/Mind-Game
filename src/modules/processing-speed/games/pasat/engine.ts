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
import { summarizeOutcomes } from '../../../../core/scoring/scoring'

/**
 * PASAT — جمع زنجیره‌ای گام‌دار (سرعت پردازش)
 *
 * ارقام یکی‌یکی با ریتم ثابت نمایش داده می‌شوند. از رقم دوم، باید حاصل جمع
 * «رقم جدید + رقم قبل» را پیش از ظاهرشدن رقم بعدی وارد کنی — هر پاسخ،
 * پنجرهٔ خودش را دارد و با ظهور رقم بعد یا ثبت پاسخ، مرحله تمام می‌شود.
 *
 * رقم اول فقط برای تماشاست (جمعی ندارد) و همیشه «درست» ثبت می‌شود تا در
 * دقت کلی بی‌اثر باشد. اقتباس نرم‌افزاری از Paced Auditory Serial Addition
 * Test (Gronwall) در قالب دیداری؛ بدون دارایی هیچ محصول تجاری.
 */

export interface PasatConfig extends ExerciseConfig {
  readonly totalTrials: number
  /** بازهٔ ظهور ارقام = پنجرهٔ پاسخ هر مرحله (ms) */
  readonly intervalMs: number
  /** مدت نمایش هر رقم پیش از محو (ms) */
  readonly digitDisplayMs: number
}

export interface PasatState extends ExerciseState<PasatConfig> {
  readonly currentTrial: PasatTrial | null
}

export interface PasatTrial extends ExerciseTrial {
  readonly trialIndex: number
  /** رقم این مرحله (۱..۹) */
  readonly digit: number
  /** حاصل جمع موردانتظار: رقم فعلی + رقم قبل — در مرحلهٔ اول null (تماشا) */
  readonly expected: number | null
  readonly digitDisplayMs: number
  readonly intervalMs: number
}

export const PASAT_ID = 'pasat'
export const PASAT_VERSION = '1.0.0'
export const PASAT_CONTENT_VERSION = '1'

const TOTAL_TRIALS = 20
/** بازهٔ ارقام بر حسب دشواری ۱..۵ — پنجرهٔ پاسخ سخت‌تر می‌شود */
const INTERVAL_MS_BY_DIFFICULTY: readonly number[] = [3000, 2700, 2400, 2100, 1800]
const DIGIT_DISPLAY_MS = 900

export function configForDifficulty(difficulty: number): PasatConfig {
  if (difficulty < 1 || difficulty > 5) {
    throw new RangeError('دشواری باید بین ۱ تا ۵ باشد')
  }
  const level = difficulty - 1
  return {
    difficulty,
    totalTrials: TOTAL_TRIALS,
    intervalMs: INTERVAL_MS_BY_DIFFICULTY[level] as number,
    digitDisplayMs: DIGIT_DISPLAY_MS,
  }
}

export const pasatDefinition: ExerciseDefinition<PasatConfig, PasatState, PasatTrial, number | null> = {
  id: PASAT_ID,
  version: PASAT_VERSION,
  contentVersion: PASAT_CONTENT_VERSION,
  domain: 'processing-speed',

  createSession(sessionId, config, seed) {
    return {
      sessionId,
      config,
      seed,
      nextTrialIndex: 0,
      currentTrial: null,
      results: [],
    }
  },

  nextTrial(state) {
    if (state.nextTrialIndex >= state.config.totalTrials) {
      throw new Error('همه ارقام تولید شده‌اند')
    }
    const trialIndex = state.nextTrialIndex
    const rng = new SeededRandom(deriveTrialSeed(state.seed, trialIndex))
    const digit = rng.int(1, 9)

    // جمع موردانتظار از رقم دوم: محاسبه از تاریخچهٔ نتایج (رقم قبلی در محرک ثبت شده)
    const prevRecord = state.results[trialIndex - 1]
    const prevDigit =
      trialIndex === 0
        ? null
        : ((prevRecord?.stimulus as { digit?: number } | null)?.digit ?? null)
    const expected = prevDigit === null ? null : digit + prevDigit

    const trial: PasatTrial = {
      trialIndex,
      digit,
      expected,
      digitDisplayMs: state.config.digitDisplayMs,
      intervalMs: state.config.intervalMs,
      // پنجرهٔ پاسخ = تا ظهور رقم بعد؛ رقم اولِ تماشا هم همین ریتم را دارد
      responseWindowMs: state.config.intervalMs,
    }
    return {
      state: { ...state, nextTrialIndex: trialIndex + 1, currentTrial: trial },
      trial,
    }
  },

  submitAnswer(state, answer, reactionTimeMs) {
    const trial = state.currentTrial
    if (!trial) throw new Error('رقم فعالی برای ثبت پاسخ وجود ندارد')

    let record: RecordedTrial
    if (trial.expected === null || answer === null) {
      // رقم اول (تماشا) همیشه درست ثبت می‌شود؛ انقضای مهلت = بی‌پاسخ
      const isWatch = trial.expected === null
      record = {
        trialIndex: trial.trialIndex,
        stimulus: { digit: trial.digit, expected: trial.expected },
        expected: trial.expected,
        given: answer,
        outcome: isWatch ? 'correct' : 'omission',
        correct: isWatch,
        reactionTimeMs: null,
      }
    } else if (answer === trial.expected) {
      record = {
        trialIndex: trial.trialIndex,
        stimulus: { digit: trial.digit, expected: trial.expected },
        expected: trial.expected,
        given: answer,
        outcome: 'correct',
        correct: true,
        reactionTimeMs,
      }
    } else {
      record = {
        trialIndex: trial.trialIndex,
        stimulus: { digit: trial.digit, expected: trial.expected },
        expected: trial.expected,
        given: answer,
        outcome: 'incorrect',
        correct: false,
        reactionTimeMs,
      }
    }
    return { ...state, currentTrial: null, results: [...state.results, record] }
  },

  isComplete(state) {
    return state.results.length >= state.config.totalTrials
  },

  getSummary(state): ExerciseSummary {
    const totals = summarizeOutcomes(state.results)
    const answerTimes = state.results
      .filter((r) => r.correct && r.reactionTimeMs !== null)
      .map((r) => r.reactionTimeMs as number)
    const meanAnswerTimeMs =
      answerTimes.length > 0
        ? Math.round(answerTimes.reduce((a, b) => a + b, 0) / answerTimes.length)
        : 0
    const omissions = state.results.filter((r) => r.outcome === 'omission').length
    return {
      exerciseId: PASAT_ID,
      sessionId: state.sessionId,
      exerciseVersion: PASAT_VERSION,
      contentVersion: PASAT_CONTENT_VERSION,
      domain: 'processing-speed',
      difficulty: state.config.difficulty,
      ...totals,
      metrics: {
        correctSums: state.results.filter((r) => r.expected !== null && r.correct).length,
        omissions,
        meanAnswerTimeMs,
      },
    }
  },
}
