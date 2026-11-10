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
 * زمان واکنش (Reaction Time) — حوزه هماهنگی حسی و حرکتی
 *
 * در هر مرحله ابتدا یک بازه انتظار با تأخیر تصادفی (jitter) هست که هیچ
 * محرکی نمایش داده نمی‌شود («صبر کن…»). سپس محرک به‌طور ناگهانی ظاهر
 * می‌شود و کاربر باید در سریع‌ترین زمان ممکن بزند.
 *
 *  - ضربه در بازه انتظار = خطای پیش‌دستی (anticipation) → incorrect
 *  - عدم ضربه تا پایان مهلت مرحله = کندی/بی‌واکنشی (omission)
 *
 * نکته حیاتی زمان‌سنجی: SessionManager زمان واکنش را از «شروع مرحله»
 * (advanceTrial) می‌سنجد، ولی محرک فقط بعد از stimulusDelayMs ظاهر می‌شود.
 * پس موتور باید تبدیل کند: rtFromStimulus = reactionTimeMs − stimulusDelayMs.
 * مقدار منفی یعنی ضربه پیش از محرک (پیش‌دستی).
 *
 * اقتباس از پارادایم شناخته‌شده Simple Reaction Time در روان‌شناسی شناختی؛
 * بدون دارایی بصری هیچ محصول تجاری.
 */

export interface ReactionTimeConfig extends ExerciseConfig {
  /** تعداد کل مرحله‌ها (ثابت در همه سطوح) */
  readonly totalTrials: number
  /** کف تأخیر تصادفی ظاهرشدن محرک (ms) */
  readonly minJitterMs: number
  /** سقف تأخیر تصادفی ظاهرشدن محرک (ms) */
  readonly maxJitterMs: number
  /** حداکثر زمان مجاز پاسخ «بعد از ظاهرشدن محرک» (ms) */
  readonly windowAfterStimulusMs: number
}

export interface ReactionTimeTrial extends ExerciseTrial {
  /** تأخیر ظاهرشدن محرک از شروع مرحله (ms) — تصادفی در بازه jitter */
  readonly stimulusDelayMs: number
  readonly windowAfterStimulusMs: number
}

export interface ReactionTimeState extends ExerciseState<ReactionTimeConfig> {
  readonly currentTrial: ReactionTimeTrial | null
}

/** پاسخ کاربر: 'tap' یعنی ضربه، null یعنی انقضای مهلت (کندی) */
export type ReactionTimeAnswer = 'tap' | null

export const REACTION_TIME_ID = 'reaction-time'
export const REACTION_TIME_VERSION = '1.0.0'
export const REACTION_TIME_CONTENT_VERSION = '1'
const TOTAL_TRIALS = 10

/** بازه jitter تأخیر محرک بر اساس سطح دشواری ۱..۵ */
const JITTER_RANGES_MS: Readonly<Record<number, readonly [number, number]>> = {
  1: [1500, 3000],
  2: [1250, 3500],
  3: [1000, 4000],
  4: [1000, 4500],
  5: [800, 5000],
}

/** حداکثر زمان پاسخ بعد از محرک — با بالا رفتن دشواری کوتاه‌تر می‌شود */
const WINDOW_AFTER_STIMULUS_MS: Readonly<Record<number, number>> = {
  1: 1500,
  2: 1400,
  3: 1300,
  4: 1200,
  5: 1100,
}

/** تنظیمات سطح دشواری: بازه jitter بازتر و پنجره پاسخ کوتاه‌تر می‌شود */
export function configForDifficulty(difficulty: number): ReactionTimeConfig {
  if (difficulty < 1 || difficulty > 5) {
    throw new RangeError('دشواری باید بین ۱ تا ۵ باشد')
  }
  const [minJitterMs, maxJitterMs] = JITTER_RANGES_MS[difficulty]
  return {
    difficulty,
    totalTrials: TOTAL_TRIALS,
    minJitterMs,
    maxJitterMs,
    windowAfterStimulusMs: WINDOW_AFTER_STIMULUS_MS[difficulty],
  }
}

export const reactionTimeDefinition: ExerciseDefinition<
  ReactionTimeConfig,
  ReactionTimeState,
  ReactionTimeTrial,
  ReactionTimeAnswer
> = {
  id: REACTION_TIME_ID,
  version: REACTION_TIME_VERSION,
  contentVersion: REACTION_TIME_CONTENT_VERSION,
  domain: 'sensorimotor',

  createSession(sessionId, config, seed) {
    return { sessionId, config, seed, nextTrialIndex: 0, currentTrial: null, results: [] }
  },

  nextTrial(state) {
    if (state.nextTrialIndex >= state.config.totalTrials) {
      throw new Error('همه مرحله‌ها تولید شده‌اند')
    }
    const trialIndex = state.nextTrialIndex
    // تولید خالص و بازتولیدپذیر: هر مرحله RNG خودش را از seed جلسه می‌سازد
    const rng = new SeededRandom(deriveTrialSeed(state.seed, trialIndex))
    const stimulusDelayMs = rng.int(state.config.minJitterMs, state.config.maxJitterMs)
    const trial: ReactionTimeTrial = {
      trialIndex,
      stimulusDelayMs,
      windowAfterStimulusMs: state.config.windowAfterStimulusMs,
      // مهلت کل مرحله = تأخیر محرک + پنجره پاسخ بعد از محرک
      responseWindowMs: stimulusDelayMs + state.config.windowAfterStimulusMs,
    }
    return { state: { ...state, nextTrialIndex: trialIndex + 1, currentTrial: trial }, trial }
  },

  submitAnswer(state, answer, reactionTimeMs) {
    const trial = state.currentTrial
    if (!trial) throw new Error('محرک فعالی برای ثبت پاسخ وجود ندارد')

    let record: RecordedTrial
    if (answer === null) {
      // انقضای مهلت: ضربه‌ای زده نشد → بسیار کند / بی‌واکنشی
      record = {
        trialIndex: trial.trialIndex,
        stimulus: { stimulusDelayMs: trial.stimulusDelayMs, windowAfterStimulusMs: trial.windowAfterStimulusMs },
        expected: 'tap',
        given: null,
        outcome: 'omission',
        correct: false,
        reactionTimeMs: null,
      }
    } else {
      // زمان واکنش واقعی نسبت به «ظاهرشدن محرک»، نه شروع مرحله
      const rtFromStimulus = reactionTimeMs - trial.stimulusDelayMs
      if (rtFromStimulus < 0) {
        // ضربه پیش از ظاهرشدن محرک = خطای پیش‌دستی؛ زمان واکنش معتبر نیست
        record = {
          trialIndex: trial.trialIndex,
          stimulus: { stimulusDelayMs: trial.stimulusDelayMs, windowAfterStimulusMs: trial.windowAfterStimulusMs },
          expected: 'tap',
          given: 'tap',
          outcome: 'incorrect',
          correct: false,
          reactionTimeMs: null,
        }
      } else {
        record = {
          trialIndex: trial.trialIndex,
          stimulus: { stimulusDelayMs: trial.stimulusDelayMs, windowAfterStimulusMs: trial.windowAfterStimulusMs },
          expected: 'tap',
          given: 'tap',
          outcome: 'correct',
          correct: true,
          reactionTimeMs: Math.round(rtFromStimulus),
        }
      }
    }
    return { ...state, currentTrial: null, results: [...state.results, record] }
  },

  isComplete(state) {
    return state.results.length >= state.config.totalTrials
  },

  getSummary(state): ExerciseSummary {
    const totals = summarizeOutcomes(state.results)
    // آمار زمان واکنش فقط روی مراحل درست (بدون پیش‌دستی و بدون کندی)
    const correctRts = state.results
      .filter((r) => r.correct && r.reactionTimeMs !== null)
      .map((r) => r.reactionTimeMs as number)
    const best = correctRts.length > 0 ? Math.min(...correctRts) : 0
    const mean = correctRts.length > 0 ? Math.round(correctRts.reduce((s, v) => s + v, 0) / correctRts.length) : 0
    return {
      exerciseId: REACTION_TIME_ID,
      sessionId: state.sessionId,
      exerciseVersion: REACTION_TIME_VERSION,
      contentVersion: REACTION_TIME_CONTENT_VERSION,
      domain: 'sensorimotor',
      difficulty: state.config.difficulty,
      ...totals,
      metrics: {
        medianReactionTimeMs: Math.round(median(correctRts) ?? 0),
        bestReactionTimeMs: best,
        meanReactionTimeMs: mean,
        // در این بازی incorrect فقط از ضربهٔ پیش از محرک رخ می‌دهد
        anticipationErrors: countOutcome(state.results, 'incorrect'),
        tooSlowErrors: countOutcome(state.results, 'omission'),
      },
    }
  },
}
