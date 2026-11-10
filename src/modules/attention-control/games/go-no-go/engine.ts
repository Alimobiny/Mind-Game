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
import { countOutcome, median, summarizeOutcomes } from '../../../../core/scoring/scoring'

/**
 * Go / No-Go — توجه و کنترل بازداری
 *
 * به محرک Go (دایره) باید سریع واکنش نشان داد؛ به محرک No-Go (مربع)
 * باید پاسخ مهار شود. خطای commission (واکنش به No-Go) و omission
 * (بی‌واکنشی به Go) جداگانه ثبت می‌شوند.
 *
 * اقتباس از پارادایم شناخته‌شده Go/No-Go در روان‌شناسی شناختی؛
 * بدون دارایی بصری هیچ محصول تجاری.
 */

export interface GoNoGoConfig extends ExerciseConfig {
  /** تعداد کل محرک‌ها */
  readonly totalTrials: number
  /** نسبت تقریبی محرک‌های Go */
  readonly goRatio: number
  /** مدت نمایش محرک (ms) — پنجره پاسخ هم همین است */
  readonly stimulusMs: number
  /** فاصله بین محرک‌ها (ms) */
  readonly interStimulusMs: number
}

export interface GoNoGoState extends ExerciseState<GoNoGoConfig> {
  readonly currentTrial: GoNoGoTrial | null
}

export interface GoNoGoTrial extends ExerciseTrial {
  readonly kind: 'go' | 'nogo'
  readonly stimulusMs: number
  readonly interStimulusMs: number
}

/** پاسخ کاربر: 'tap' یعنی واکنش، null یعنی مهار/انقضای مهلت */
export type GoNoGoAnswer = 'tap' | null

export const GO_NO_GO_ID = 'go-no-go'
export const GO_NO_GO_VERSION = '1.0.0'
export const GO_NO_GO_CONTENT_VERSION = '1'
const TOTAL_TRIALS = 40

/** تنظیمات سطح دشواری: پنجره محرک و فاصله کوتاه‌تر می‌شوند */
export function configForDifficulty(difficulty: number): GoNoGoConfig {
  if (difficulty < 1 || difficulty > 5) {
    throw new RangeError('دشواری باید بین ۱ تا ۵ باشد')
  }
  return {
    difficulty,
    totalTrials: TOTAL_TRIALS,
    goRatio: 0.7,
    // دشواری ۱ → محرک 1030ms / فاصله 810ms؛ دشواری ۵ → 550ms / 450ms
    stimulusMs: 1150 - difficulty * 120,
    interStimulusMs: 900 - difficulty * 90,
  }
}

export const goNoGoDefinition: ExerciseDefinition<GoNoGoConfig, GoNoGoState, GoNoGoTrial, GoNoGoAnswer> = {
  id: GO_NO_GO_ID,
  version: GO_NO_GO_VERSION,
  contentVersion: GO_NO_GO_CONTENT_VERSION,
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
    const kind: 'go' | 'nogo' = rng.bool(state.config.goRatio) ? 'go' : 'nogo'
    const trial: GoNoGoTrial = {
      trialIndex,
      kind,
      stimulusMs: state.config.stimulusMs,
      interStimulusMs: state.config.interStimulusMs,
      // پنجره پاسخ = کل بازه محرک + فاصله تا محرک بعد
      responseWindowMs: state.config.stimulusMs + state.config.interStimulusMs,
    }
    return { state: { ...state, nextTrialIndex: trialIndex + 1, currentTrial: trial }, trial }
  },

  submitAnswer(state, answer, reactionTimeMs) {
    const trial = state.currentTrial
    if (!trial) throw new Error('محرک فعالی برای ثبت پاسخ وجود ندارد')
    const responded = answer === 'tap'
    let record: RecordedTrial
    if (trial.kind === 'go') {
      record = responded
        ? {
            trialIndex: trial.trialIndex,
            stimulus: { kind: 'go' },
            expected: 'tap',
            given: 'tap',
            outcome: 'correct',
            correct: true,
            reactionTimeMs,
          }
        : {
            trialIndex: trial.trialIndex,
            stimulus: { kind: 'go' },
            expected: 'tap',
            given: null,
            outcome: 'omission',
            correct: false,
            reactionTimeMs: null,
          }
    } else {
      record = responded
        ? {
            trialIndex: trial.trialIndex,
            stimulus: { kind: 'nogo' },
            expected: null,
            given: 'tap',
            outcome: 'commission',
            correct: false,
            reactionTimeMs,
          }
        : {
            // مهار موفق: پاسخ درست این مرحله «واکنش ندادن» است
            trialIndex: trial.trialIndex,
            stimulus: { kind: 'nogo' },
            expected: null,
            given: null,
            outcome: 'correct',
            correct: true,
            reactionTimeMs: null,
          }
    }
    return { ...state, currentTrial: null, results: [...state.results, record] }
  },

  isComplete(state) {
    return state.results.length >= state.config.totalTrials
  },

  getSummary(state): ExerciseSummary {
    const totals = summarizeOutcomes(state.results)
    const goRts = state.results
      .filter((r) => r.outcome === 'correct' && r.stimulus !== null && (r.stimulus as { kind: string }).kind === 'go')
      .map((r) => r.reactionTimeMs)
      .filter((rt): rt is number => rt !== null)
    const goTrials = state.results.filter(
      (r) => r.stimulus !== null && (r.stimulus as { kind: string }).kind === 'go',
    ).length
    return {
      exerciseId: GO_NO_GO_ID,
      sessionId: state.sessionId,
      exerciseVersion: GO_NO_GO_VERSION,
      contentVersion: GO_NO_GO_CONTENT_VERSION,
      domain: 'attention-control',
      difficulty: state.config.difficulty,
      ...totals,
      metrics: {
        commissionErrors: countOutcome(state.results, 'commission'),
        omissionErrors: countOutcome(state.results, 'omission'),
        medianGoReactionTimeMs: Math.round(median(goRts) ?? 0),
        goTrials,
        nogoTrials: totals.totalTrials - goTrials,
      },
    }
  },
}
