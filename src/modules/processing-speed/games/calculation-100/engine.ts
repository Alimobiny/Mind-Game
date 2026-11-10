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
 * Calculation × 100 — سرعت پردازش و استقامت محاسبه ذهنی
 *
 * ۱۰۰ سؤال حساب کوتاه؛ پاسخ با صفحه‌کلید عددی و بدون مهلت زمانی برای
 * سؤال منفرد — زمانِ پاسخِ هر سؤال جداگانه اندازه‌گیری می‌شود (RT معیار
 * اصلی است). برای این‌که جلسهٔ ۱۰۰ سؤالی در بازهٔ ۵ تا ۸ دقیقه بماند،
 * به‌جای بازخورد طولانی فقط یک «فلش» کوتاه بعد از هر پاسخ نشان داده
 * می‌شود (در کامپوننت). سرعت و دقت جداگانه گزارش می‌شوند و فردِ «سریع
 * ولی پرخطا» امتیاز بالاتری از فرد دقیق نمی‌گیرد.
 *
 * تفاوت با Calculation × 20: تعداد مراحل (۱۰۰)، نردبان دشواری (ترکیب
 * عملیات در سطح‌های بیشتر، دامنهٔ بزرگ‌تر عملوندها) و متریک «پاسخ درست
 * بر دقیقه». تضمین تکلیفی: هیچ دو سؤال پشت‌سرهمی عین هم نیستند تا در
 * فضاهای کوچک (مثلاً سطح ۱) جلسهٔ طولانی یکنواخت نشود.
 *
 * اقتباس نرم‌افزاری از الگوی Calculation × 100 کاواشیما؛ نمایش اعداد
 * فارسی، بدون دارایی بصری محصول تجاری.
 */

export type ArithmeticOperator = '+' | '-' | '×' | '÷'

export interface ArithmeticQuestion {
  readonly a: number
  readonly b: number
  readonly operator: ArithmeticOperator
  readonly answer: number
}

export interface Calculation100Config extends ExerciseConfig {
  readonly totalTrials: number
  /** عملیات مجاز این سطح */
  readonly operators: readonly ArithmeticOperator[]
  /** دامنه عملوندها بر اساس عملیات */
  readonly operandRange: { readonly addMax: number; readonly mulMax: number }
}

export interface Calculation100State extends ExerciseState<Calculation100Config> {
  readonly currentTrial: Calculation100Trial | null
}

export interface Calculation100Trial extends ExerciseTrial {
  readonly question: ArithmeticQuestion
}

export type Calculation100Answer = number

export const CALCULATION_100_ID = 'calculation-100'
export const CALCULATION_100_VERSION = '1.0.0'
export const CALCULATION_100_CONTENT_VERSION = '1'
const TOTAL_TRIALS = 100

export function configForDifficulty(difficulty: number): Calculation100Config {
  if (difficulty < 1 || difficulty > 5) {
    throw new RangeError('دشواری باید بین ۱ تا ۵ باشد')
  }
  switch (difficulty) {
    case 1:
      return { difficulty, totalTrials: TOTAL_TRIALS, operators: ['+', '-'], operandRange: { addMax: 9, mulMax: 9 } }
    case 2:
      return { difficulty, totalTrials: TOTAL_TRIALS, operators: ['+', '-'], operandRange: { addMax: 20, mulMax: 9 } }
    case 3:
      return {
        difficulty,
        totalTrials: TOTAL_TRIALS,
        operators: ['+', '-', '×'],
        operandRange: { addMax: 20, mulMax: 9 },
      }
    case 4:
      return {
        difficulty,
        totalTrials: TOTAL_TRIALS,
        operators: ['+', '-', '×'],
        operandRange: { addMax: 50, mulMax: 12 },
      }
    default:
      return {
        difficulty,
        totalTrials: TOTAL_TRIALS,
        operators: ['+', '-', '×', '÷'],
        operandRange: { addMax: 99, mulMax: 12 },
      }
  }
}

function makeQuestion(rng: SeededRandom, config: Calculation100Config): ArithmeticQuestion {
  const operator = rng.pick(config.operators)
  const { addMax, mulMax } = config.operandRange
  switch (operator) {
    case '+': {
      const a = rng.int(1, addMax)
      const b = rng.int(1, addMax)
      return { a, b, operator, answer: a + b }
    }
    case '-': {
      // نتیجه همیشه نامنفی می‌ماند
      let a = rng.int(1, addMax)
      let b = rng.int(1, addMax)
      if (b > a) [a, b] = [b, a]
      return { a, b, operator, answer: a - b }
    }
    case '×': {
      const a = rng.int(2, mulMax)
      const b = rng.int(2, mulMax)
      return { a, b, operator, answer: a * b }
    }
    case '÷': {
      // تقسیم دقیق: حاصل‌ضرب دو عدد ساخته می‌شود
      const b = rng.int(2, mulMax)
      const q = rng.int(2, mulMax)
      return { a: b * q, b, operator, answer: q }
    }
  }
}

function sameQuestion(x: ArithmeticQuestion, y: ArithmeticQuestion): boolean {
  return x.a === y.a && x.b === y.b && x.operator === y.operator
}

/**
 * سؤال مرحله n بدون تکرارِ عینِ سؤال مرحله n−1.
 *
 * سؤال نهایی هر مرحله صرفاً تابع (seed جلسه، شماره مرحله، config) است:
 * سؤال مرحله قبل نیز از همان فرمول بازمحاسبه می‌شود (بدون نگهداری
 * وضعیت RNG در State). برخورد فقط در فضاهای کوچک رخ می‌دهد؛ بعد از
 * ۸ تلاش، آخرین سؤال پذیرفته می‌شود تا قطعیت حفظ شود.
 */
function makeQuestionNoRepeat(
  sessionSeed: number,
  trialIndex: number,
  config: Calculation100Config,
): ArithmeticQuestion {
  const previous = trialIndex > 0 ? makeQuestionNoRepeat(sessionSeed, trialIndex - 1, config) : null
  const rng = new SeededRandom(deriveTrialSeed(sessionSeed, trialIndex))
  let question = makeQuestion(rng, config)
  for (let attempt = 0; attempt < 8 && previous !== null && sameQuestion(question, previous); attempt++) {
    question = makeQuestion(rng, config)
  }
  return question
}

export const calculation100Definition: ExerciseDefinition<
  Calculation100Config,
  Calculation100State,
  Calculation100Trial,
  Calculation100Answer
> = {
  id: CALCULATION_100_ID,
  version: CALCULATION_100_VERSION,
  contentVersion: CALCULATION_100_CONTENT_VERSION,
  domain: 'processing-speed',

  createSession(sessionId, config, seed) {
    return { sessionId, config, seed, nextTrialIndex: 0, currentTrial: null, results: [] }
  },

  nextTrial(state) {
    if (state.nextTrialIndex >= state.config.totalTrials) {
      throw new Error('همه سؤال‌ها تولید شده‌اند')
    }
    const trialIndex = state.nextTrialIndex
    const question = makeQuestionNoRepeat(state.seed, trialIndex, state.config)
    const trial: Calculation100Trial = { trialIndex, question, responseWindowMs: null }
    return { state: { ...state, nextTrialIndex: trialIndex + 1, currentTrial: trial }, trial }
  },

  submitAnswer(state, answer, reactionTimeMs) {
    const trial = state.currentTrial
    if (!trial) throw new Error('سؤال فعالی برای ثبت پاسخ وجود ندارد')
    const given = answer
    const isCorrect = given !== null && given === trial.question.answer
    const outcome: TrialOutcome = given === null ? 'omission' : isCorrect ? 'correct' : 'incorrect'
    const record: RecordedTrial = {
      trialIndex: trial.trialIndex,
      stimulus: { question: `${trial.question.a} ${trial.question.operator} ${trial.question.b}` },
      expected: trial.question.answer,
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
    // مجموع زمان پاسخ‌های داده‌شده (بدون وقفه بین سؤال‌ها) — مبنای نرخ‌ها
    const answered = state.results.filter((r) => r.reactionTimeMs !== null)
    const totalAnswerMs = answered.reduce((sum, r) => sum + (r.reactionTimeMs ?? 0), 0)
    const correctPerMinute =
      totalAnswerMs > 0 ? Math.round((totals.correctTrials / (totalAnswerMs / 60000)) * 10) / 10 : 0
    const meanReactionTimeMs = answered.length > 0 ? Math.round(totalAnswerMs / answered.length) : 0
    return {
      exerciseId: CALCULATION_100_ID,
      sessionId: state.sessionId,
      exerciseVersion: CALCULATION_100_VERSION,
      contentVersion: CALCULATION_100_CONTENT_VERSION,
      domain: 'processing-speed',
      difficulty: state.config.difficulty,
      ...totals,
      metrics: {
        /** پاسخ درست بر دقیقه بر اساس مجموع زمان پاسخ‌ها */
        correctPerMinute,
        /** میانگین زمان پاسخ‌های داده‌شده */
        meanReactionTimeMs,
        totalAnswerTimeMs: totalAnswerMs,
      },
    }
  },
}
