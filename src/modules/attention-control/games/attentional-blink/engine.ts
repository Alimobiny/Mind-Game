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
import { accuracyPercent, summarizeOutcomes } from '../../../../core/scoring/scoring'

/**
 * Attentional Blink — پلک توجه (توجه زمانی)
 *
 * جریان سریع حروف فارسی (RSVP) وسط صفحه؛ دو هدف داخل جریان تعبیه شده:
 * هدف اول با رنگ روشن‌آبی و هدف دوم (با تأخیر متغیر lag) با رنگ سبز.
 * پایان جریان، هر دو هدف از جدول حروف انتخاب می‌شوند. افت تشخیص هدف دوم
 * در تأخیرهای ۲-۳ («پلک») در برابر تأخیر ۷ متریک اصلی است.
 *
 * نکتهٔ طراحی: زمان واکنشِ تک‌محرک در این تکلیف معنا ندارد؛ زمان پاسخ
 * نهایی فقط به‌عنوان مدت تصمیم گزارش می‌شود (در متادیتا ذکر شده).
 *
 * اقتباس از پارادایم پلک توجه (Raymond و همکاران) در ادبیات توجه؛
 * بدون دارایی بصری هیچ محصول تجاری.
 */

/** استخر حروف — بدون «ا» و «آ» برای کاهش ابهام کشیدگی، همهٔ بقیه متمایزند */
const LETTER_POOL = [
  'ب', 'پ', 'ت', 'ث', 'ج', 'چ', 'ح', 'خ', 'د', 'ذ',
  'ر', 'ز', 'ژ', 'س', 'ش', 'ص', 'ض', 'ط', 'ظ', 'ع',
  'غ', 'ف', 'ق', 'ک', 'گ', 'ل', 'م', 'ن', 'و', 'ه', 'ی',
] as const

export type AbItemRole = 'distractor' | 't1' | 't2'

export interface AbStreamItem {
  readonly letter: string
  readonly role: AbItemRole
}

export interface AttentionalBlinkConfig extends ExerciseConfig {
  /** تعداد جریان‌ها (مراحل) در جلسه */
  readonly totalTrials: number
  /** طول هر جریان (تعداد آیتم) */
  readonly streamLength: number
  /** زمان هر آیتم (ms) — ۸ تا ۱۲ آیتم بر ثانیه */
  readonly itemMs: number
}

export interface AttentionalBlinkState extends ExerciseState<AttentionalBlinkConfig> {
  readonly currentTrial: AttentionalBlinkTrial | null
}

export interface AttentionalBlinkTrial extends ExerciseTrial {
  /** جریان کامل با نقش هر آیتم */
  readonly stream: readonly AbStreamItem[]
  /** فاصلهٔ هدف دوم از هدف اول (تعداد آیتم) */
  readonly lag: number
  readonly t1: string
  readonly t2: string
  readonly itemMs: number
}

/** پاسخ کاربر: هر دو هدف انتخاب‌شده */
export interface AttentionalBlinkAnswer {
  readonly t1: string
  readonly t2: string
}

export const ATTENTIONAL_BLINK_ID = 'attentional-blink'
export const ATTENTIONAL_BLINK_VERSION = '1.0.0'
export const ATTENTIONAL_BLINK_CONTENT_VERSION = '1'
const TOTAL_TRIALS = 12
const STREAM_LENGTH = 16

/** توزیع تأخیرها — تمرکز روی ۲ و ۳ و ۷ مطابق سند پژوهش */
const LAG_WEIGHTS: readonly (readonly [number, number])[] = [
  [1, 0.1],
  [2, 0.3],
  [3, 0.3],
  [7, 0.3],
]

/** تنظیمات سطح دشواری: سرعت جریان از ۸ تا ~۱۲ آیتم بر ثانیه */
export function configForDifficulty(difficulty: number): AttentionalBlinkConfig {
  if (difficulty < 1 || difficulty > 5) {
    throw new RangeError('دشواری باید بین ۱ تا ۵ باشد')
  }
  return {
    difficulty,
    totalTrials: TOTAL_TRIALS,
    streamLength: STREAM_LENGTH,
    // دشواری ۱ → ۱۲۵ms (۸/ث)؛ دشواری ۵ → ۸۵ms (~۱۲/ث)
    itemMs: 125 - (difficulty - 1) * 10,
  }
}

export const attentionalBlinkDefinition: ExerciseDefinition<
  AttentionalBlinkConfig,
  AttentionalBlinkState,
  AttentionalBlinkTrial,
  AttentionalBlinkAnswer
> = {
  id: ATTENTIONAL_BLINK_ID,
  version: ATTENTIONAL_BLINK_VERSION,
  contentVersion: ATTENTIONAL_BLINK_CONTENT_VERSION,
  domain: 'attention-control',

  createSession(sessionId, config, seed) {
    return { sessionId, config, seed, nextTrialIndex: 0, currentTrial: null, results: [] }
  },

  nextTrial(state) {
    if (state.nextTrialIndex >= state.config.totalTrials) {
      throw new Error('همه جریان‌ها تولید شده‌اند')
    }
    const trialIndex = state.nextTrialIndex
    const rng = new SeededRandom(deriveTrialSeed(state.seed, trialIndex))
    const letters = rng.sample(LETTER_POOL, state.config.streamLength)
    // هدف اول نه خیلی زود (پایداری توجه) و نه خیلی دیر (خستگی)
    const t1Index = rng.int(3, 5)
    const lag = rng.pickWeighted(LAG_WEIGHTS)
    const t2Index = t1Index + lag
    const t1 = letters[t1Index] as string
    const t2 = letters[t2Index] as string
    const stream: AbStreamItem[] = letters.map((letter, i) => ({
      letter,
      role: i === t1Index ? 't1' : i === t2Index ? 't2' : 'distractor',
    }))
    const trial: AttentionalBlinkTrial = {
      trialIndex,
      stream,
      lag,
      t1,
      t2,
      itemMs: state.config.itemMs,
      // فراخوانی بدون مهلت — بازیابی پس از جریان زمان‌بندی نمی‌شود
      responseWindowMs: null,
    }
    return { state: { ...state, nextTrialIndex: trialIndex + 1, currentTrial: trial }, trial }
  },

  submitAnswer(state, answer, reactionTimeMs) {
    const trial = state.currentTrial
    if (!trial) throw new Error('جریان فعالی برای ثبت پاسخ وجود ندارد')
    const given = answer
    const t1Correct = given !== null && given.t1 === trial.t1
    const t2Correct = given !== null && given.t2 === trial.t2
    const correct = given !== null && t1Correct && t2Correct
    const outcome: TrialOutcome = given === null ? 'omission' : correct ? 'correct' : 'incorrect'
    const record: RecordedTrial = {
      trialIndex: trial.trialIndex,
      // جریان کامل در رکورد نمی‌آید — lag و دو هدف برای متریک‌ها کافی است
      stimulus: { lag: trial.lag, t1: trial.t1, t2: trial.t2 },
      expected: { t1: trial.t1, t2: trial.t2 },
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
    const lagOf = (r: RecordedTrial) => (r.stimulus as { lag: number }).lag
    const t1Ok = (r: RecordedTrial) => (r.given as { t1: string } | null)?.t1 === (r.expected as { t1: string }).t1
    const t2Ok = (r: RecordedTrial) => (r.given as { t2: string } | null)?.t2 === (r.expected as { t2: string }).t2

    const t1Hits = state.results.filter(t1Ok)
    const t1Accuracy = accuracyPercent(t1Hits.length, state.results.length)
    const t2Overall = accuracyPercent(state.results.filter(t2Ok).length, state.results.length)

    const t2GivenT1 = t1Hits.filter(t2Ok)
    const t2GivenT1Accuracy = accuracyPercent(t2GivenT1.length, t1Hits.length)

    const rateAt = (lag: number) => {
      const bucket = t1Hits.filter((r) => lagOf(r) === lag)
      return { rate: accuracyPercent(bucket.filter(t2Ok).length, bucket.length), count: bucket.length }
    }
    const lag1 = rateAt(1)
    const lag3 = rateAt(3)
    const lag7 = rateAt(7)
    const lag23 = t1Hits.filter((r) => lagOf(r) === 2 || lagOf(r) === 3)
    const lag23Rate = accuracyPercent(lag23.filter(t2Ok).length, lag23.length)

    return {
      exerciseId: ATTENTIONAL_BLINK_ID,
      sessionId: state.sessionId,
      exerciseVersion: ATTENTIONAL_BLINK_VERSION,
      contentVersion: ATTENTIONAL_BLINK_CONTENT_VERSION,
      domain: 'attention-control',
      difficulty: state.config.difficulty,
      ...totals,
      metrics: {
        t1Accuracy,
        t2Accuracy: t2Overall,
        t2GivenT1Accuracy,
        // اندازهٔ پلک: تشخیص هدف دوم در تأخیر ۷ منهای تأخیر ۳ (نقطهٔ اوج پلک)
        blinkMagnitude: lag3.count > 0 && lag7.count > 0 ? lag7.rate - lag3.rate : 0,
        // سهیم‌شدن تأخیر ۱: برتری تأخیر ۱ بر میانگین تأخیرهای ۲ و ۳
        lagOneSparing: lag1.count > 0 ? lag1.rate - lag23Rate : 0,
      },
    }
  },
}
