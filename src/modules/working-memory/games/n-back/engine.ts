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
import { countOutcome, summarizeOutcomes } from '../../../../core/scoring/scoring'

/**
 * N-Back — حافظه کاری
 *
 * حروف فارسی یکی‌یکی نمایش داده می‌شوند. اگر حرفِ فعلی با حرفی که
 * N مرحله قبل نشان داده شد یکی باشد، کاربر دکمه «تطبیق» را می‌زند؛
 * در غیر این صورت هیچ کاری نمی‌کند. هر مرحله یا با فشردن دکمه یا با
 * انقضای مهلت (بی‌فشردن) تمام می‌شود.
 *
 * خطای commission (فشردنِ حرف غیرتطبیقی) و omission (نزدن به حرف
 * تطبیقی) جداگانه ثبت می‌شوند — همان معنای Go/No-Go اما با بار حافظه‌ای.
 *
 * اقتباس از پارادایم شناخته‌شده N-Back در روان‌شناسی شناختی؛
 * بدون دارایی بصری هیچ محصول تجاری.
 */

/** استخر حروف — ۸ همخوان فارسی متمایز از نظر بصری */
export const NBACK_LETTERS: readonly string[] = ['ب', 'ج', 'د', 'س', 'ف', 'ل', 'م', 'ت']

export interface NBackConfig extends ExerciseConfig {
  /** فاصله تطبیق (N) — حرف چند مرحله قبل ملاک است */
  readonly n: number
  /** تعداد کل محرک‌ها (ثابت) */
  readonly totalTrials: number
  /** نسبت تقریبی مراحل تطبیقی بین مراحل واجدشرط */
  readonly targetRate: number
  /** مدت نمایش حرف (ms) */
  readonly stimulusMs: number
  /** فاصله خالی بین حروف (ms) */
  readonly interStimulusMs: number
}

export interface NBackState extends ExerciseState<NBackConfig> {
  readonly currentTrial: NBackTrial | null
  /** حرف‌های نمایش‌داده‌شده تا کنون به ترتیب (برای مقایسه N-قبل) */
  readonly letters: readonly string[]
}

export interface NBackTrial extends ExerciseTrial {
  readonly trialIndex: number
  /** حرف این مرحله */
  readonly letter: string
  /** همان n از تنظیمات — در داده خام ثبت می‌شود */
  readonly n: number
  /** آیا حرف فعلی با حرف n مرحله قبل یکی است؟ */
  readonly isTarget: boolean
  readonly stimulusMs: number
  readonly interStimulusMs: number
}

/** پاسخ کاربر: 'match' یعنی فشردن تطبیق، null یعنی انقضای مهلت/بی‌پاسخی */
export type NBackAnswer = 'match' | null

export const NBACK_ID = 'n-back'
export const NBACK_VERSION = '1.0.0'
export const NBACK_CONTENT_VERSION = '1'
export const NBACK_TOTAL_TRIALS = 25
const TOTAL_TRIALS = NBACK_TOTAL_TRIALS
const TARGET_RATE = 0.3

/** n بر حسب دشواری ۱..۵ */
const N_BY_DIFFICULTY: readonly number[] = [1, 2, 2, 3, 3]
/** مدت نمایش حرف بر حسب دشواری ۱..۵ */
const STIMULUS_MS_BY_DIFFICULTY: readonly number[] = [900, 800, 600, 800, 600]
/** فاصله بین حروف بر حسب دشواری ۱..۵ */
const INTER_STIMULUS_MS_BY_DIFFICULTY: readonly number[] = [1000, 900, 700, 900, 700]

/** تنظیمات سطح دشواری — n بالاتر و نمایش سریع‌تر */
export function configForDifficulty(difficulty: number): NBackConfig {
  if (difficulty < 1 || difficulty > 5) {
    throw new RangeError('دشواری باید بین ۱ تا ۵ باشد')
  }
  const level = difficulty - 1
  return {
    difficulty,
    n: N_BY_DIFFICULTY[level] as number,
    totalTrials: TOTAL_TRIALS,
    targetRate: TARGET_RATE,
    stimulusMs: STIMULUS_MS_BY_DIFFICULTY[level] as number,
    interStimulusMs: INTER_STIMULUS_MS_BY_DIFFICULTY[level] as number,
  }
}

export const nBackDefinition: ExerciseDefinition<NBackConfig, NBackState, NBackTrial, NBackAnswer> = {
  id: NBACK_ID,
  version: NBACK_VERSION,
  contentVersion: NBACK_CONTENT_VERSION,
  domain: 'working-memory',

  createSession(sessionId, config, seed) {
    return {
      sessionId,
      config,
      seed,
      nextTrialIndex: 0,
      currentTrial: null,
      // تاریخچه حرف‌ها — مبنای مقایسه N-قبل؛ تولید، وابسته به وضعیت است
      letters: [],
      results: [],
    }
  },

  nextTrial(state) {
    if (state.nextTrialIndex >= state.config.totalTrials) {
      throw new Error('همه محرک‌ها تولید شده‌اند')
    }
    const trialIndex = state.nextTrialIndex
    const rng = new SeededRandom(deriveTrialSeed(state.seed, trialIndex))
    const n = state.config.n

    let letter: string
    let isTarget: boolean
    if (trialIndex < n) {
      // هنوز N مرحله گذر نکرده → تطبیق ممکن نیست؛ حرف آزاد از استخر
      letter = rng.pick(NBACK_LETTERS)
      isTarget = false
    } else {
      // ناوردای تاریخچه: letters.length === trialIndex (پیش از این مرحله)
      const backLetter = state.letters[trialIndex - n]
      if (backLetter === undefined) {
        throw new Error('تاریخچه حرف‌ها برای مقایسه N-قبل ناقص است')
      }
      isTarget = rng.bool(state.config.targetRate)
      if (isTarget) {
        letter = backLetter
      } else {
        // حرفی غیر از حرف N-قبل → غیرتطبیقِ واقعی تضمین می‌شود
        letter = rng.pick(NBACK_LETTERS.filter((c) => c !== backLetter))
      }
    }

    const trial: NBackTrial = {
      trialIndex,
      letter,
      n,
      isTarget,
      stimulusMs: state.config.stimulusMs,
      interStimulusMs: state.config.interStimulusMs,
      // پنجره پاسخ = نمایش حرف + فاصله تا حرف بعد
      responseWindowMs: state.config.stimulusMs + state.config.interStimulusMs,
    }
    return {
      state: {
        ...state,
        nextTrialIndex: trialIndex + 1,
        currentTrial: trial,
        letters: [...state.letters, letter],
      },
      trial,
    }
  },

  submitAnswer(state, answer, reactionTimeMs) {
    const trial = state.currentTrial
    if (!trial) throw new Error('محرک فعالی برای ثبت پاسخ وجود ندارد')
    const responded = answer === 'match'
    let record: RecordedTrial
    if (trial.isTarget) {
      record = responded
        ? {
            // تطبیق درست (hit)
            trialIndex: trial.trialIndex,
            stimulus: { letter: trial.letter, n: trial.n, isTarget: true },
            expected: 'match',
            given: 'match',
            outcome: 'correct',
            correct: true,
            reactionTimeMs,
          }
        : {
            // از دست دادن تطبیق (miss)
            trialIndex: trial.trialIndex,
            stimulus: { letter: trial.letter, n: trial.n, isTarget: true },
            expected: 'match',
            given: null,
            outcome: 'omission',
            correct: false,
            reactionTimeMs: null,
          }
    } else {
      record = responded
        ? {
            // هشدار کاذب (false alarm)
            trialIndex: trial.trialIndex,
            stimulus: { letter: trial.letter, n: trial.n, isTarget: false },
            expected: null,
            given: 'match',
            outcome: 'commission',
            correct: false,
            reactionTimeMs,
          }
        : {
            // خودداری درست (correct rejection) — پاسخ درست، نزدن است
            trialIndex: trial.trialIndex,
            stimulus: { letter: trial.letter, n: trial.n, isTarget: false },
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
    const isTargetOf = (r: RecordedTrial) =>
      (r.stimulus as { isTarget?: boolean } | null)?.isTarget === true
    // درست‌های تطبیقی (hit) و درست‌های خودداری (correct rejection) جدا می‌شوند
    const hits = state.results.filter((r) => isTargetOf(r) && r.outcome === 'correct').length
    const correctRejections = state.results.filter((r) => !isTargetOf(r) && r.outcome === 'correct').length
    return {
      exerciseId: NBACK_ID,
      sessionId: state.sessionId,
      exerciseVersion: NBACK_VERSION,
      contentVersion: NBACK_CONTENT_VERSION,
      domain: 'working-memory',
      difficulty: state.config.difficulty,
      ...totals,
      metrics: {
        hits,
        misses: countOutcome(state.results, 'omission'),
        falseAlarms: countOutcome(state.results, 'commission'),
        correctRejections,
      },
    }
  },
}
