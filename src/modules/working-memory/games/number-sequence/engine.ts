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
 * Number Sequence — حافظه کاری
 *
 * نمایش متوالی ارقام متمایز → بازسازی همان ترتیب با صفحه‌کلید.
 * دشواری ۱..۵: طول توالی ۳..۷ و زمان نمایش هر رقم کوتاه‌تر می‌شود.
 *
 * اقتباس نرم‌افزاری از الگوی تمرین‌های توالی عددی کاواشیما است؛
 * بدون استفاده از نام یا دارایی بصری هیچ محصول تجاری.
 */

export interface NumberSequenceConfig extends ExerciseConfig {
  /** طول توالی = difficulty + 2 (۳ تا ۷) */
  readonly sequenceLength: number
  /** تعداد مراحل ثابت جلسه */
  readonly totalTrials: number
}

export interface NumberSequenceState extends ExerciseState<NumberSequenceConfig> {
  readonly currentTrial: NumberSequenceTrial | null
}

export interface NumberSequenceTrial extends ExerciseTrial {
  /** توالی هدف — ارقام متمایز ۰..۹ */
  readonly digits: readonly number[]
  /** مدت نمایش هر رقم (ms) — با دشواری کوتاه می‌شود */
  readonly displayMsPerDigit: number
  /** فاصله بین رقم‌ها (ms) */
  readonly gapMs: number
}

export type NumberSequenceAnswer = readonly number[]

export const NUMBER_SEQUENCE_ID = 'number-sequence'
export const NUMBER_SEQUENCE_VERSION = '1.0.0'
export const NUMBER_SEQUENCE_CONTENT_VERSION = '1'
const TOTAL_TRIALS = 10

/** تنظیمات سطح دشواری — اعداد طراحی‌اند، نه هنجار بالینی */
export function configForDifficulty(difficulty: number): NumberSequenceConfig {
  if (difficulty < 1 || difficulty > 5) {
    throw new RangeError('دشواری باید بین ۱ تا ۵ باشد')
  }
  return {
    difficulty,
    sequenceLength: difficulty + 2,
    totalTrials: TOTAL_TRIALS,
  }
}

function displayMsPerDigit(difficulty: number): number {
  // دشواری ۱ → 900ms، دشواری ۵ → 500ms
  return 900 - (difficulty - 1) * 100
}

/** نسبت موقعیت‌های درست در یک بازسازی (۰ تا ۱) */
export function positionMatchRate(expected: readonly number[], given: readonly number[]): number {
  let matches = 0
  const len = Math.min(expected.length, given.length)
  for (let i = 0; i < len; i++) {
    if (expected[i] === given[i]) matches++
  }
  return expected.length === 0 ? 0 : matches / expected.length
}

export const numberSequenceDefinition: ExerciseDefinition<
  NumberSequenceConfig,
  NumberSequenceState,
  NumberSequenceTrial,
  NumberSequenceAnswer
> = {
  id: NUMBER_SEQUENCE_ID,
  version: NUMBER_SEQUENCE_VERSION,
  contentVersion: NUMBER_SEQUENCE_CONTENT_VERSION,
  domain: 'working-memory',

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
      throw new Error('همه مراحل تولید شده‌اند')
    }
    const trialIndex = state.nextTrialIndex
    const rng = new SeededRandom(deriveTrialSeed(state.seed, trialIndex))
    // ارقام متمایز برای بازسازی کم‌ابهام‌تر
    const digits = rng.sample([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], state.config.sequenceLength)
    const trial: NumberSequenceTrial = {
      trialIndex,
      digits,
      displayMsPerDigit: displayMsPerDigit(state.config.difficulty),
      gapMs: 250,
      responseWindowMs: null,
    }
    return { state: { ...state, nextTrialIndex: trialIndex + 1, currentTrial: trial }, trial }
  },

  submitAnswer(state, answer, reactionTimeMs) {
    const trial = state.currentTrial
    if (!trial) throw new Error('مرحله فعالی برای ثبت پاسخ وجود ندارد')
    const given = answer
    const isCorrect =
      given !== null &&
      given.length === trial.digits.length &&
      positionMatchRate(trial.digits, given) === 1
    const outcome: TrialOutcome =
      given === null ? 'omission' : isCorrect ? 'correct' : 'incorrect'
    const record: RecordedTrial = {
      trialIndex: trial.trialIndex,
      stimulus: { digits: trial.digits },
      expected: trial.digits,
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
    const correctPositionRates = state.results.map((r) =>
      r.expected && Array.isArray(r.expected) && Array.isArray(r.given)
        ? positionMatchRate(r.expected as readonly number[], r.given as readonly number[])
        : 0,
    )
    const meanPositionRate =
      correctPositionRates.length === 0
        ? 0
        : correctPositionRates.reduce((a, b) => a + b, 0) / correctPositionRates.length
    return {
      exerciseId: NUMBER_SEQUENCE_ID,
      sessionId: state.sessionId,
      exerciseVersion: NUMBER_SEQUENCE_VERSION,
      contentVersion: NUMBER_SEQUENCE_CONTENT_VERSION,
      domain: 'working-memory',
      difficulty: state.config.difficulty,
      ...totals,
      metrics: {
        /** میانگین درصد ارقامِ در جای درست (۰..۱۰۰) */
        meanCorrectPositionRate: Math.round(meanPositionRate * 1000) / 10,
        sequenceLength: state.config.sequenceLength,
      },
    }
  },
}
