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
import { countOutcome, median, summarizeOutcomes } from '../../../../core/scoring/scoring'

/**
 * مقایسه اعداد (Number Comparison) — سرعت پردازش
 *
 * در هر مرحله دو کمیت (عدد) کنار هم نمایش داده می‌شوند و بازیکن باید
 * هرچه سریع‌تر سمتِ بزرگ‌تر را انتخاب کند. پارادایم کلاسیک «مقایسه
 * نمادین اعداد» در ادبیات سرعت پردازش است: هرچه فاصله عددی دو طرف
 * کمتر و طول ارقام بیشتر باشد، مقایسه کندتر می‌شود (اثر فاصله و
 * اثر طول رقم).
 *
 * پیچیدگی با این پیچ‌ها بالا می‌رود:
 *  - طول رقم: از تک‌رقمی (سطح ۱) تا ۸ رقمی (سطح ۵)
 *  - فاصله نسبی: |چپ − راست| ≥ minRatioDistance × بزرگ‌تر — نسبتِ
 *    کوچک‌تر یعنی دو عدد هم‌قامت‌تر و تشخیص سخت‌تر
 *  - اختلاف طول رقم (سطوح ۳+): گاهی دو طرف رقم‌های نابرابر دارند؛
 *    آن‌گاه قضاوت «کدام تعداد رقم بیشتر دارد؟» لازم است (مثل ۹۹۹ در برابر ۱۰۰۰)
 *  - فرمت نمایش (سطوح ۳+): گاهی یک سمت به‌جای عددِ یک‌پارچه، رشته‌رقم
 *    جداشده نمایش داده می‌شود (۴ ۲ ۳ به‌جای ۴۲۳) تا خواندنِ الگوی عدد
 *    کندتر و مقایسه سخت‌تر شود
 *
 * نگاشت چپ/راست فیزیکی است: ظرف نمایش در UI با dir="ltr" رندر می‌شود
 * تا 'left' همیشه سمتِ چپِ صفحه باشد — مستقل از جهت RTL کل اپ.
 *
 * اقتباس از وظیفه Number Comparison در بطری‌های تمرین سرعت پردازش؛
 * بدون دارایی بصری هیچ محصول تجاری.
 */

/** فرمت نمایش یک سمت: عدد یک‌پارچه یا رشته‌رقم جداشده */
export type NumberDisplayFormat = 'numeral' | 'digits'

export interface NumberComparisonConfig extends ExerciseConfig {
  /** تعداد کل مرحله‌ها (ثابت در همه سطوح) */
  readonly totalTrials: number
  /** حداقل و حداکثر تعداد رقم هر عدد */
  readonly minDigits: number
  readonly maxDigits: number
  /**
   * کف فاصله نسبی: |چپ − راست| ≥ minRatioDistance × max(چپ، راست).
   * مقدار کوچک‌تر = دو عدد نزدیک‌تر = دشوارتر. همیشه < ۱.
   */
  readonly minRatioDistance: number
  /** احتمال آن‌که دو طرف طول رقم نابرابر داشته باشند (۰ تا ۱) */
  readonly mixedLengthRatio: number
  /** احتمال آن‌که (در سطوح بالا) یک سمت رشته‌رقم جداشده شود (۰ تا ۱) */
  readonly spacedDigitRatio: number
  /** مهلت پاسخ هر مرحله از لحظه نمایش (ms) */
  readonly responseWindowMs: number
}

export interface NumberComparisonTrial extends ExerciseTrial {
  /** عدد سمت چپِ صفحه */
  readonly left: number
  /** عدد سمت راستِ صفحه */
  readonly right: number
  readonly leftFormat: NumberDisplayFormat
  readonly rightFormat: NumberDisplayFormat
}

export interface NumberComparisonState extends ExerciseState<NumberComparisonConfig> {
  readonly currentTrial: NumberComparisonTrial | null
}

/**
 * پاسخ کاربر: سمتِ انتخاب‌شده (فیزیکی) یا null برای انقضای مهلت.
 * با تضمین تولید، left و right هرگز برابر نیستند؛ expected همیشه
 * 'left' یا 'right' است.
 */
export type NumberComparisonAnswer = 'left' | 'right' | null

export const NUMBER_COMPARISON_ID = 'number-comparison'
export const NUMBER_COMPARISON_VERSION = '1.0.0'
export const NUMBER_COMPARISON_CONTENT_VERSION = '1'
const TOTAL_TRIALS = 36

/** سقف تلاش برای نمونه‌گیریِ رد-شونده قبل از رفتن به مسیر تضمینی */
const MAX_GENERATION_ATTEMPTS = 200

/** جدول سطوح: طول رقم بیشتر، فاصله نسبی کمتر، فرمت سخت‌تر، مهلت کوتاه‌تر */
export function configForDifficulty(difficulty: number): NumberComparisonConfig {
  if (difficulty < 1 || difficulty > 5) {
    throw new RangeError('دشواری باید بین ۱ تا ۵ باشد')
  }
  switch (difficulty) {
    case 1:
      return {
        difficulty,
        totalTrials: TOTAL_TRIALS,
        minDigits: 1,
        maxDigits: 1,
        minRatioDistance: 0.4,
        mixedLengthRatio: 0,
        spacedDigitRatio: 0,
        responseWindowMs: 4000,
      }
    case 2:
      return {
        difficulty,
        totalTrials: TOTAL_TRIALS,
        minDigits: 1,
        maxDigits: 2,
        minRatioDistance: 0.3,
        mixedLengthRatio: 0,
        spacedDigitRatio: 0,
        responseWindowMs: 3500,
      }
    case 3:
      return {
        difficulty,
        totalTrials: TOTAL_TRIALS,
        minDigits: 2,
        maxDigits: 3,
        minRatioDistance: 0.2,
        mixedLengthRatio: 0.3,
        spacedDigitRatio: 0.25,
        responseWindowMs: 3000,
      }
    case 4:
      return {
        difficulty,
        totalTrials: TOTAL_TRIALS,
        minDigits: 3,
        maxDigits: 5,
        minRatioDistance: 0.12,
        mixedLengthRatio: 0.35,
        spacedDigitRatio: 0.35,
        responseWindowMs: 2600,
      }
    default:
      return {
        difficulty,
        totalTrials: TOTAL_TRIALS,
        minDigits: 4,
        maxDigits: 8,
        minRatioDistance: 0.06,
        mixedLengthRatio: 0.4,
        spacedDigitRatio: 0.45,
        responseWindowMs: 2200,
      }
  }
}

/** عدد صحیح با دقیقاً `digits` رقم (بدون صفر پیشین): 10^(d-1) تا 10^d − 1 */
function randomNumberWithDigits(rng: SeededRandom, digits: number): number {
  const lo = 10 ** (digits - 1)
  return rng.int(lo, 10 * lo - 1)
}

/**
 * تولید جفتِ {کوچک‌تر، بزرگ‌تر} با تضمین:
 *  - دو عدد هرگز برابر نیستند؛
 *  - فاصله نسبی |a−b| ≥ minRatioDistance × بزرگ‌تر رعایت می‌شود.
 *
 * ابتدا نمونه‌گیری رد-شونده (رقم‌ها آزادانه در بازه سطح)؛ اگر پس از
 * سقف تلاش نشد (پیکربندی‌های تنگ)، مسیر ساختِ تضمینی: دو عدد هم‌رقم
 * که فاصله‌شان با فرمول کوچک‌تر = s، بزرگ‌تر = ceil(s / (1−نسبت)) قطعاً
 * قید را ارضا می‌کند (برای نسبت < ۰٫۹ همیشه ممکن است).
 */
function generatePair(
  rng: SeededRandom,
  config: NumberComparisonConfig,
): { readonly smaller: number; readonly larger: number } {
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const digitsA = rng.int(config.minDigits, config.maxDigits)
    const mixedLength = rng.bool(config.mixedLengthRatio)
    const digitsB = mixedLength ? rng.int(config.minDigits, config.maxDigits) : digitsA
    const a = randomNumberWithDigits(rng, digitsA)
    const b = randomNumberWithDigits(rng, digitsB)
    if (a === b) continue
    const larger = Math.max(a, b)
    if (Math.abs(a - b) >= config.minRatioDistance * larger) {
      return { smaller: Math.min(a, b), larger }
    }
  }
  // مسیر تضمینی: کوچک‌ترین عددِ هم‌رقم و بزرگ‌تری که قید فاصله را قطعاً ارضا می‌کند
  const digits = Math.max(1, Math.min(config.maxDigits, config.minDigits))
  const smaller = 10 ** (digits - 1)
  const larger = Math.ceil(smaller / (1 - config.minRatioDistance))
  return { smaller, larger }
}

export const numberComparisonDefinition: ExerciseDefinition<
  NumberComparisonConfig,
  NumberComparisonState,
  NumberComparisonTrial,
  NumberComparisonAnswer
> = {
  id: NUMBER_COMPARISON_ID,
  version: NUMBER_COMPARISON_VERSION,
  contentVersion: NUMBER_COMPARISON_CONTENT_VERSION,
  domain: 'processing-speed',

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
    const { smaller, larger } = generatePair(rng, state.config)
    // جابه‌جایی تصادفی سمتِ بزرگ‌تر تا پاسخ درست بین چپ/راست توزیع شود
    const largerOnLeft = rng.bool()
    const left = largerOnLeft ? larger : smaller
    const right = largerOnLeft ? smaller : larger
    // فرمت نمایش: در سطوح بالا گاهی دقیقاً یک سمت رشته‌رقم جداشده می‌شود
    let leftFormat: NumberDisplayFormat = 'numeral'
    let rightFormat: NumberDisplayFormat = 'numeral'
    if (rng.bool(state.config.spacedDigitRatio)) {
      if (rng.bool()) {
        leftFormat = 'digits'
      } else {
        rightFormat = 'digits'
      }
    }
    const trial: NumberComparisonTrial = {
      trialIndex,
      left,
      right,
      leftFormat,
      rightFormat,
      responseWindowMs: state.config.responseWindowMs,
    }
    return { state: { ...state, nextTrialIndex: trialIndex + 1, currentTrial: trial }, trial }
  },

  submitAnswer(state, answer, reactionTimeMs) {
    const trial = state.currentTrial
    if (!trial) throw new Error('محرک فعالی برای ثبت پاسخ وجود ندارد')
    // با تضمین تولید دو طرف هرگز برابر نیستند
    const expected: 'left' | 'right' = trial.left > trial.right ? 'left' : 'right'
    const outcome: TrialOutcome =
      answer === null ? 'omission' : answer === expected ? 'correct' : 'incorrect'
    const record: RecordedTrial = {
      trialIndex: trial.trialIndex,
      stimulus: {
        left: trial.left,
        right: trial.right,
        leftFormat: trial.leftFormat,
        rightFormat: trial.rightFormat,
      },
      expected,
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
    // آمار سرعت فقط روی پاسخ‌های درست — پاسخِ سریع ولی غلط به سود
    // بازیکن ثبت نمی‌شود
    const correctRts = state.results
      .filter((r) => r.correct && r.reactionTimeMs !== null)
      .map((r) => r.reactionTimeMs as number)
    const mean =
      correctRts.length > 0
        ? Math.round(correctRts.reduce((s, v) => s + v, 0) / correctRts.length)
        : 0
    return {
      exerciseId: NUMBER_COMPARISON_ID,
      sessionId: state.sessionId,
      exerciseVersion: NUMBER_COMPARISON_VERSION,
      contentVersion: NUMBER_COMPARISON_CONTENT_VERSION,
      domain: 'processing-speed',
      difficulty: state.config.difficulty,
      ...totals,
      metrics: {
        medianReactionTimeMs: Math.round(median(correctRts) ?? 0),
        meanReactionTimeMs: mean,
        timeoutErrors: countOutcome(state.results, 'omission'),
      },
    }
  },
}
