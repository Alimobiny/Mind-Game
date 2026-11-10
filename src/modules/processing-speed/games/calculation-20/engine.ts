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
 * Calculation × 20 — سرعت پردازش و محاسبه ذهنی
 *
 * ۲۰ سؤال حساب؛ پاسخ با صفحه‌کلید عددی. هیچ سؤالی مهلت زمانی ندارد؛
 * کل زمان جلسه معیار اصلی است. سرعت و دقت جداگانه گزارش می‌شوند و
 * فردِ «سریع ولی پرخطا» امتیاز بالاتری از فرد دقیق نمی‌گیرد.
 *
 * اقتباس نرم‌افزاری از الگوی Calculation × 20 کاواشیما؛ نمایش اعداد
 * فارسی، بدون دارایی بصری محصول تجاری.
 */

export type ArithmeticOperator = '+' | '-' | '×' | '÷'

export interface ArithmeticQuestion {
  readonly a: number
  readonly b: number
  readonly operator: ArithmeticOperator
  readonly answer: number
}

export interface Calculation20Config extends ExerciseConfig {
  readonly totalTrials: number
  /** عملیات مجاز این سطح */
  readonly operators: readonly ArithmeticOperator[]
  /** دامنه عملوندها بر اساس عملیات */
  readonly operandRange: { readonly addMax: number; readonly mulMax: number }
}

export interface Calculation20State extends ExerciseState<Calculation20Config> {
  readonly currentTrial: Calculation20Trial | null
}

export interface Calculation20Trial extends ExerciseTrial {
  readonly question: ArithmeticQuestion
}

export type Calculation20Answer = number

export const CALCULATION_20_ID = 'calculation-20'
export const CALCULATION_20_VERSION = '1.0.0'
export const CALCULATION_20_CONTENT_VERSION = '1'
const TOTAL_TRIALS = 20

export function configForDifficulty(difficulty: number): Calculation20Config {
  if (difficulty < 1 || difficulty > 5) {
    throw new RangeError('دشواری باید بین ۱ تا ۵ باشد')
  }
  switch (difficulty) {
    case 1:
      return { difficulty, totalTrials: TOTAL_TRIALS, operators: ['+', '-'], operandRange: { addMax: 9, mulMax: 9 } }
    case 2:
      return { difficulty, totalTrials: TOTAL_TRIALS, operators: ['+', '-'], operandRange: { addMax: 20, mulMax: 9 } }
    case 3:
      return { difficulty, totalTrials: TOTAL_TRIALS, operators: ['×'], operandRange: { addMax: 20, mulMax: 9 } }
    case 4:
      return { difficulty, totalTrials: TOTAL_TRIALS, operators: ['+', '-', '×'], operandRange: { addMax: 50, mulMax: 9 } }
    default:
      return {
        difficulty,
        totalTrials: TOTAL_TRIALS,
        operators: ['+', '-', '×', '÷'],
        operandRange: { addMax: 50, mulMax: 9 },
      }
  }
}

function makeQuestion(rng: SeededRandom, config: Calculation20Config): ArithmeticQuestion {
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

export const calculation20Definition: ExerciseDefinition<
  Calculation20Config,
  Calculation20State,
  Calculation20Trial,
  Calculation20Answer
> = {
  id: CALCULATION_20_ID,
  version: CALCULATION_20_VERSION,
  contentVersion: CALCULATION_20_CONTENT_VERSION,
  domain: 'processing-speed',

  createSession(sessionId, config, seed) {
    return { sessionId, config, seed, nextTrialIndex: 0, currentTrial: null, results: [] }
  },

  nextTrial(state) {
    if (state.nextTrialIndex >= state.config.totalTrials) {
      throw new Error('همه سؤال‌ها تولید شده‌اند')
    }
    const trialIndex = state.nextTrialIndex
    const rng = new SeededRandom(deriveTrialSeed(state.seed, trialIndex))
    const question = makeQuestion(rng, state.config)
    const trial: Calculation20Trial = { trialIndex, question, responseWindowMs: null }
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
    // مجموع زمان پاسخ‌داده‌شده‌ها (بدون وقفه بین سؤال‌ها) — مبنای QPM
    const totalAnswerMs = state.results.reduce((sum, r) => sum + (r.reactionTimeMs ?? 0), 0)
    const questionsPerMinute =
      totalAnswerMs > 0 ? Math.round((state.results.length / (totalAnswerMs / 60000)) * 10) / 10 : 0
    return {
      exerciseId: CALCULATION_20_ID,
      sessionId: state.sessionId,
      exerciseVersion: CALCULATION_20_VERSION,
      contentVersion: CALCULATION_20_CONTENT_VERSION,
      domain: 'processing-speed',
      difficulty: state.config.difficulty,
      ...totals,
      metrics: {
        /** سؤال بر دقیقه بر اساس مجموع زمان پاسخ‌ها */
        questionsPerMinute,
        totalAnswerTimeMs: totalAnswerMs,
      },
    }
  },
}
