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
 * Spatial Sequence — توالی مکانی (حافظه دیداری-مکانی)
 *
 * نمایش متوالی K خانه متمایز در شبکه n×n (یکی‌یکی و به‌ترتیب) →
 * بازتولید همان ترتیب با لمس خانه‌ها و تأیید.
 * دشواری ۱..۵: شبکه بزرگ‌تر، توالی بلندتر و زمان نمایش کوتاه‌تر.
 *
 * اقتباس نرم‌افزاری از الگوی تمرین‌های توالی مکانی حافظه؛ بدون
 * استفاده از نام یا دارایی بصری هیچ محصول تجاری.
 */

export interface SpatialSequenceConfig extends ExerciseConfig {
  /** ابعاد شبکه (n×n) */
  readonly gridSize: number
  /** طول توالی (تعداد خانه‌هایی که یکی‌یکی روشن می‌شوند) */
  readonly sequenceLength: number
  /** تعداد مراحل ثابت جلسه */
  readonly totalTrials: number
  /** مدت نمایش هر خانه (ms) */
  readonly displayMsPerCell: number
  /** فاصله بین خانه‌ها (ms) */
  readonly gapMs: number
}

export interface SpatialSequenceState extends ExerciseState<SpatialSequenceConfig> {
  readonly currentTrial: SpatialSequenceTrial | null
}

export interface SpatialSequenceTrial extends ExerciseTrial {
  readonly trialIndex: number
  readonly gridSize: number
  /** اندیس خانه‌های توالی به ترتیب روشن‌شدن (متمایز، ۰..n²-1) */
  readonly sequence: readonly number[]
  readonly displayMsPerCell: number
  readonly gapMs: number
}

/** پاسخ کاربر: اندیس خانه‌ها به ترتیب لمس‌شدن */
export type SpatialSequenceAnswer = readonly number[]

export const SPATIAL_SEQUENCE_ID = 'spatial-sequence'
export const SPATIAL_SEQUENCE_VERSION = '1.0.0'
export const SPATIAL_SEQUENCE_CONTENT_VERSION = '1'
const TOTAL_TRIALS = 10
const GAP_MS = 250

/** سطح‌های دشواری — اعداد طراحی‌اند، نه هنجار جمعیتی */
const LEVELS: readonly { gridSize: number; sequenceLength: number; displayMsPerCell: number }[] = [
  { gridSize: 3, sequenceLength: 3, displayMsPerCell: 800 },
  { gridSize: 3, sequenceLength: 4, displayMsPerCell: 750 },
  { gridSize: 4, sequenceLength: 5, displayMsPerCell: 700 },
  { gridSize: 4, sequenceLength: 6, displayMsPerCell: 650 },
  { gridSize: 4, sequenceLength: 7, displayMsPerCell: 600 },
]

export function configForDifficulty(difficulty: number): SpatialSequenceConfig {
  if (difficulty < 1 || difficulty > 5) {
    throw new RangeError('دشواری باید بین ۱ تا ۵ باشد')
  }
  const level = LEVELS[difficulty - 1] as {
    gridSize: number
    sequenceLength: number
    displayMsPerCell: number
  }
  return {
    difficulty,
    gridSize: level.gridSize,
    sequenceLength: level.sequenceLength,
    totalTrials: TOTAL_TRIALS,
    displayMsPerCell: level.displayMsPerCell,
    gapMs: GAP_MS,
  }
}

/**
 * نسبت موقعیت‌های درست در یک بازتولید (۰ تا ۱) — امتیاز اعتباری جزئی.
 * تطابق فقط در «همان جایگاه» شمرده می‌شود؛ توالی خالی → ۰.
 */
export function orderMatchRate(expected: readonly number[], given: readonly number[]): number {
  let matches = 0
  const len = Math.min(expected.length, given.length)
  for (let i = 0; i < len; i++) {
    if (expected[i] === given[i]) matches++
  }
  return expected.length === 0 ? 0 : matches / expected.length
}

export const spatialSequenceDefinition: ExerciseDefinition<
  SpatialSequenceConfig,
  SpatialSequenceState,
  SpatialSequenceTrial,
  SpatialSequenceAnswer
> = {
  id: SPATIAL_SEQUENCE_ID,
  version: SPATIAL_SEQUENCE_VERSION,
  contentVersion: SPATIAL_SEQUENCE_CONTENT_VERSION,
  domain: 'visual-spatial',

  createSession(sessionId, config, seed) {
    return { sessionId, config, seed, nextTrialIndex: 0, currentTrial: null, results: [] }
  },

  nextTrial(state) {
    if (state.nextTrialIndex >= state.config.totalTrials) {
      throw new Error('همه مراحل تولید شده‌اند')
    }
    const trialIndex = state.nextTrialIndex
    const rng = new SeededRandom(deriveTrialSeed(state.seed, trialIndex))
    // خانه‌های متمایز به‌ترتیب تصادفی = ترتیب روشن‌شدن
    const sequence = rng.sample(
      Array.from({ length: state.config.gridSize * state.config.gridSize }, (_, i) => i),
      state.config.sequenceLength,
    )
    const trial: SpatialSequenceTrial = {
      trialIndex,
      gridSize: state.config.gridSize,
      sequence,
      displayMsPerCell: state.config.displayMsPerCell,
      gapMs: state.config.gapMs,
      responseWindowMs: null,
    }
    return { state: { ...state, nextTrialIndex: trialIndex + 1, currentTrial: trial }, trial }
  },

  submitAnswer(state, answer, reactionTimeMs) {
    const trial = state.currentTrial
    if (!trial) throw new Error('مرحله فعالی برای ثبت پاسخ وجود ندارد')
    const given = answer
    // درست فقط با همان طول و تطابق خانه‌به‌خانه در ترتیب
    const isCorrect =
      given !== null &&
      given.length === trial.sequence.length &&
      orderMatchRate(trial.sequence, given) === 1
    const outcome: TrialOutcome = given === null ? 'omission' : isCorrect ? 'correct' : 'incorrect'
    const record: RecordedTrial = {
      trialIndex: trial.trialIndex,
      stimulus: { gridSize: trial.gridSize, sequence: trial.sequence },
      expected: trial.sequence,
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
    const orderRates = state.results.map((r) =>
      Array.isArray(r.expected) && Array.isArray(r.given)
        ? orderMatchRate(r.expected as readonly number[], r.given as readonly number[])
        : 0,
    )
    const meanOrderRate =
      orderRates.length === 0 ? 0 : orderRates.reduce((a, b) => a + b, 0) / orderRates.length
    return {
      exerciseId: SPATIAL_SEQUENCE_ID,
      sessionId: state.sessionId,
      exerciseVersion: SPATIAL_SEQUENCE_VERSION,
      contentVersion: SPATIAL_SEQUENCE_CONTENT_VERSION,
      domain: 'visual-spatial',
      difficulty: state.config.difficulty,
      ...totals,
      metrics: {
        /** میانگین درصد خانه‌های در جای درست (۰..۱۰۰) */
        meanOrderMatchRate: Math.round(meanOrderRate * 1000) / 10,
        gridSize: state.config.gridSize,
        sequenceLength: state.config.sequenceLength,
      },
    }
  },
}
