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
 * عملگر گم‌شده — سرعت پردازش و بازشناسی روابط حسابی
 *
 * معادله‌ای با عملگر گم‌شده نمایش داده می‌شود (مثل ۷ ؟ ۳ = ۴) و بازیکن
 * عملگری را از میان گزینه‌های پیشنهادی انتخاب می‌کند که معادله را درست
 * می‌کند. هر معادله طوری تولید می‌شود که «دقیقاً یک» عملگر از میان
 * گزینه‌های عرضه‌شده آن را برقرار کند (تک‌راه‌حلی)؛ در غیر این صورت
 * معادله بازتولید می‌شود.
 *
 * در سطح‌های ۱ و ۲ مهلتی برای پاسخ نیست (مثل محاسبه ×۲۰)؛ از سطح ۳
 * پنجره پاسخ فعال می‌شود و با انقضای آن، مرحله «بی‌پاسخ» ثبت می‌شود.
 */

/** عملگرهای ممکن — نمایش و مقایسه با همین نمادها */
export type MissingOperator = '+' | '-' | '×' | '÷'

export const MISSING_OPERATORS: readonly MissingOperator[] = ['+', '-', '×', '÷']

/** برچسب فارسی هر عملگر — برای دکمه‌های پاسخ و aria-label */
export const MISSING_OPERATOR_LABELS_FA: Readonly<Record<MissingOperator, string>> = {
  '+': 'جمع',
  '-': 'تفریق',
  '×': 'ضرب',
  '÷': 'تقسیم',
}

/** اعمال یک عملگر روی دو عملوند — تقسیم، تقسیم حقیقی است (برای بررسی یکتایی) */
export function applyOperator(a: number, b: number, op: MissingOperator): number {
  switch (op) {
    case '+':
      return a + b
    case '-':
      return a - b
    case '×':
      return a * b
    case '÷':
      return a / b
  }
}

export interface MissingOperatorPuzzle {
  readonly a: number
  readonly b: number
  /** نتیجه سمت راست معادله: a ؟ b = result */
  readonly result: number
  /** عملگر درست — تنها عملگرِ برقرارکننده معادله از میان choices */
  readonly solution: MissingOperator
  /** گزینه‌های عرضه‌شده به بازیکن (شامل solution؛ ترتیب تصادفی) */
  readonly choices: readonly MissingOperator[]
}

export interface MissingOperatorConfig extends ExerciseConfig {
  readonly totalTrials: number
  /** عملگرهایی که می‌توانند پاسخ درست باشند */
  readonly operators: readonly MissingOperator[]
  /** تعداد گزینه‌های نمایش‌داده‌شده (۲ تا ۴) */
  readonly choiceCount: number
  /** سقف عملوندها بر اساس نوع عملیات */
  readonly operandRange: { readonly addMax: number; readonly mulMax: number }
  /** مهلت پاسخ هر مرحله (ms)؛ null = بی‌مهلت (سطح‌های ۱ و ۲) */
  readonly responseWindowMs: number | null
}

export interface MissingOperatorTrial extends ExerciseTrial {
  readonly puzzle: MissingOperatorPuzzle
}

export interface MissingOperatorState extends ExerciseState<MissingOperatorConfig> {
  readonly currentTrial: MissingOperatorTrial | null
}

/** پاسخ کاربر: نماد عملگر انتخابی؛ null یعنی انقضای مهلت */
export type MissingOperatorAnswer = MissingOperator | null

export const MISSING_OPERATOR_ID = 'missing-operator'
export const MISSING_OPERATOR_VERSION = '1.0.0'
export const MISSING_OPERATOR_CONTENT_VERSION = '1'
const TOTAL_TRIALS = 20

/**
 * دشواری ۱..۵ — اعداد بزرگ‌تر، گزینه‌های بیشتر، ضرب از سطح ۳،
 * تقسیم دقیق فقط سطح ۵ و پنجره پاسخ از سطح ۳ به بالا.
 */
export function configForDifficulty(difficulty: number): MissingOperatorConfig {
  if (difficulty < 1 || difficulty > 5) {
    throw new RangeError('دشواری باید بین ۱ تا ۵ باشد')
  }
  switch (difficulty) {
    case 1:
      return {
        difficulty,
        totalTrials: TOTAL_TRIALS,
        operators: ['+', '-'],
        choiceCount: 2,
        operandRange: { addMax: 9, mulMax: 9 },
        responseWindowMs: null,
      }
    case 2:
      return {
        difficulty,
        totalTrials: TOTAL_TRIALS,
        operators: ['+', '-'],
        choiceCount: 3,
        operandRange: { addMax: 20, mulMax: 9 },
        responseWindowMs: null,
      }
    case 3:
      return {
        difficulty,
        totalTrials: TOTAL_TRIALS,
        operators: ['+', '-', '×'],
        choiceCount: 3,
        operandRange: { addMax: 30, mulMax: 9 },
        responseWindowMs: 8000,
      }
    case 4:
      return {
        difficulty,
        totalTrials: TOTAL_TRIALS,
        operators: ['+', '-', '×'],
        choiceCount: 4,
        operandRange: { addMax: 40, mulMax: 9 },
        responseWindowMs: 6500,
      }
    default:
      return {
        difficulty,
        totalTrials: TOTAL_TRIALS,
        operators: ['+', '-', '×', '÷'],
        choiceCount: 4,
        operandRange: { addMax: 50, mulMax: 12 },
        responseWindowMs: 5000,
      }
  }
}

/** نمونه‌سازی خام یک معادله برای عملگر درستِ انتخاب‌شده — ممکن است چند‌راه‌حلی باشد */
function sampleRawPuzzle(rng: SeededRandom, config: MissingOperatorConfig): MissingOperatorPuzzle {
  const solution = rng.pick(config.operators)
  const { addMax, mulMax } = config.operandRange
  let a: number
  let b: number
  switch (solution) {
    case '+': {
      a = rng.int(1, addMax)
      b = rng.int(1, addMax)
      break
    }
    case '-': {
      // نتیجه همیشه نامنفی می‌ماند
      a = rng.int(1, addMax)
      b = rng.int(1, addMax)
      if (b > a) [a, b] = [b, a]
      break
    }
    case '×': {
      a = rng.int(2, mulMax)
      b = rng.int(2, mulMax)
      break
    }
    case '÷': {
      // تقسیم دقیق: حاصل‌ضرب دو عدد ساخته می‌شود
      b = rng.int(2, mulMax)
      const quotient = rng.int(2, mulMax)
      a = b * quotient
      break
    }
  }
  const result = applyOperator(a, b, solution)
  // گزینه‌ها: عملگر درست + نمونه‌ای از عملگرهای دیگر (ممکن است خارج از
  // مجموعه این سطح باشند — فقط برای نمایش، نه پاسخ درست)
  const distractors = rng.sample(
    MISSING_OPERATORS.filter((op) => op !== solution),
    config.choiceCount - 1,
  )
  return { a, b, result, solution, choices: rng.shuffle([solution, ...distractors]) }
}

/** پشتیبان قطعی اگر نمونه‌سازی تصادفی هرگز تک‌راه‌حلی نشود — در عمل هرگز اجرا نمی‌شود */
function fallbackPuzzle(config: MissingOperatorConfig): MissingOperatorPuzzle {
  const solution = config.operators[0] ?? '+'
  // چهار معادله‌ای که روی «کل» مجموعه عملگرها هم تک‌راه‌حلی‌اند
  const table: Readonly<Record<MissingOperator, { readonly a: number; readonly b: number; readonly result: number }>> = {
    '+': { a: 9, b: 4, result: 13 },
    '-': { a: 9, b: 4, result: 5 },
    '×': { a: 3, b: 6, result: 18 },
    '÷': { a: 12, b: 4, result: 3 },
  }
  const base = table[solution]
  const distractors = MISSING_OPERATORS.filter((op) => op !== solution).slice(0, config.choiceCount - 1)
  return { a: base.a, b: base.b, result: base.result, solution, choices: [solution, ...distractors] }
}

/** تعداد عملگرهای برقرارکننده معادله از میان گزینه‌های عرضه‌شده */
export function countSatisfyingOperators(puzzle: MissingOperatorPuzzle): number {
  return puzzle.choices.filter((op) => applyOperator(puzzle.a, puzzle.b, op) === puzzle.result).length
}

/**
 * ساخت معادله تک‌راه‌حلی: نمونه‌گیری تا وقتی دقیقاً یک عملگر از میان
 * گزینه‌ها معادله را برقرار کند (مثل ۲؟۲=۴ که هم + و هم × درست می‌کند
 * باید حذف شود). حلقه قطعی است چون rng همان دنباله seed مرحله است.
 */
function makePuzzle(rng: SeededRandom, config: MissingOperatorConfig): MissingOperatorPuzzle {
  for (let attempt = 0; attempt < 64; attempt++) {
    const candidate = sampleRawPuzzle(rng, config)
    if (countSatisfyingOperators(candidate) === 1) return candidate
  }
  return fallbackPuzzle(config)
}

export const missingOperatorDefinition: ExerciseDefinition<
  MissingOperatorConfig,
  MissingOperatorState,
  MissingOperatorTrial,
  MissingOperatorAnswer
> = {
  id: MISSING_OPERATOR_ID,
  version: MISSING_OPERATOR_VERSION,
  contentVersion: MISSING_OPERATOR_CONTENT_VERSION,
  domain: 'processing-speed',

  createSession(sessionId, config, seed) {
    return { sessionId, config, seed, nextTrialIndex: 0, currentTrial: null, results: [] }
  },

  nextTrial(state) {
    if (state.nextTrialIndex >= state.config.totalTrials) {
      throw new Error('همه معادله‌ها تولید شده‌اند')
    }
    const trialIndex = state.nextTrialIndex
    const rng = new SeededRandom(deriveTrialSeed(state.seed, trialIndex))
    const puzzle = makePuzzle(rng, state.config)
    const trial: MissingOperatorTrial = {
      trialIndex,
      puzzle,
      responseWindowMs: state.config.responseWindowMs,
    }
    return { state: { ...state, nextTrialIndex: trialIndex + 1, currentTrial: trial }, trial }
  },

  submitAnswer(state, answer, reactionTimeMs) {
    const trial = state.currentTrial
    if (!trial) throw new Error('معادله فعالی برای ثبت پاسخ وجود ندارد')
    const outcome: TrialOutcome =
      answer === null ? 'omission' : answer === trial.puzzle.solution ? 'correct' : 'incorrect'
    const record: RecordedTrial = {
      trialIndex: trial.trialIndex,
      stimulus: {
        equation: `${trial.puzzle.a} ؟ ${trial.puzzle.b} = ${trial.puzzle.result}`,
        choices: trial.puzzle.choices,
      },
      expected: trial.puzzle.solution,
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
    const answeredRts = state.results
      .map((r) => r.reactionTimeMs)
      .filter((rt): rt is number => rt !== null)
    const meanReactionTimeMs =
      answeredRts.length > 0
        ? Math.round(answeredRts.reduce((sum, rt) => sum + rt, 0) / answeredRts.length)
        : 0
    return {
      exerciseId: MISSING_OPERATOR_ID,
      sessionId: state.sessionId,
      exerciseVersion: MISSING_OPERATOR_VERSION,
      contentVersion: MISSING_OPERATOR_CONTENT_VERSION,
      domain: 'processing-speed',
      difficulty: state.config.difficulty,
      ...totals,
      metrics: {
        /** میانگین زمان پاسخ مراحل پاسخ‌داده‌شده (بدون بی‌پاسخی‌ها) */
        meanReactionTimeMs,
      },
    }
  },
}
