import type {
  ExerciseConfig,
  ExerciseDefinition,
  ExerciseState,
  ExerciseSummary,
  ExerciseTrial,
  RecordedTrial,
} from '../../../../core/types'
import { SeededRandom } from '../../../../core/randomization/seeded-random'
import { accuracyPercent, summarizeOutcomes } from '../../../../core/scoring/scoring'
import {
  isFullRecall,
  isProcessingGateFailed,
  fullRecallSetPercent,
  partialCreditUnitPercent,
  scoreSpanRecall,
  type ComplexSpanSetAnswer,
  type SpanRecallScore,
} from '../../../shared/complex-span'

/**
 * دهانهٔ عملیاتی (Operation Span) — حافظهٔ کاری مرکب؛ پیشنهاد ۲ سند پژوهش
 * (اقتباس پارادایم سنت اِنگل، بدون دارایی هیچ محصول تجاری).
 *
 * هر دسته (مرحله): چند زوج «مسئلهٔ تأیید محاسبه + نمایش کوتاه یک واژه»؛
 * پایان دسته، بازیابی واژه‌ها به همان ترتیب از میان جدول (واژه‌های دسته +
 * حواس‌پرتی‌ها). کل پاسخ دسته — قضاوت‌های محاسبه با زمان هرکدام + واژه‌های
 * بازیابی‌شده — در یک submitAnswer ثبت می‌شود (قرارداد یک-submit-per-trial)؛
 * مهلت پاسخ = کل دسته.
 *
 * طرح جلسه یک‌جا در createSession از بذر نشست ساخته می‌شود و nextTrial فقط
 * عنصر i ام را می‌خواند — قطعی و بی‌وابستگی به پاسخ‌ها (الگوی انجمنی).
 *
 * قرارداد پژوهشی: اگر دقت قضاوت‌های محاسبه زیر ۸۵٪ بیفتد، جلسه با متریک
 * invalidSessionFlag=1 «فاقد اعتبار» علامت می‌خورد.
 */

/** بانک واژه‌های رمزآوری — اسم‌های ملموس و متمایز برای نگه‌داری آسان */
export const OSPAN_WORDS: readonly string[] = [
  'آب', 'برف', 'باد', 'آتش', 'خاک', 'شن',
  'پل', 'دیوار', 'چراغ', 'طناب', 'میخ', 'اره',
  'چکش', 'سیم', 'کاغذ', 'گلدان', 'سبد', 'بطری',
  'جام', 'بشکه', 'نردبان', 'چرخ', 'فانوس', 'بادکنک',
  'زنگ', 'پرچم', 'تخته', 'صندوق', 'گوشی', 'سنجاق',
  'منگنه', 'قیف',
]

/** مسئلهٔ تأیید محاسبه — نمایش: «a op b = shownResult؟» */
export interface OspanMathProblem {
  readonly a: number
  readonly op: '+' | '−' | '×' | '÷'
  readonly b: number
  /** نتیجهٔ درست عبارت */
  readonly trueResult: number
  /** نتیجهٔ نمایش‌داده‌شده در معادله */
  readonly shownResult: number
  /** آیا معادلهٔ نمایش‌داده‌شده درست است (پاسخ درست قضاوت) */
  readonly isTrue: boolean
}

/** یک زوج پردازش + رمزآوری */
export interface OspanItem {
  readonly problem: OspanMathProblem
  readonly word: string
}

/** طرح کامل یک دسته */
export interface OspanSetPlan {
  readonly setIndex: number
  readonly items: readonly OspanItem[]
  /** گزینه‌های جدول بازیابی (واژه‌های دسته + حواس‌پرتی، به ترتیب نمایش) */
  readonly recallChoices: readonly string[]
  /** ترتیب درست بازیابی — وارونه در سطوح بالا */
  readonly expectedRecall: readonly string[]
  readonly reverseRecall: boolean
}

export interface OperationSpanConfig extends ExerciseConfig {
  /** طول هر دسته — تعداد عناصر = تعداد مراحل جلسه */
  readonly setLengths: readonly number[]
  /** ۲ = جمع/تفریق · ۳ = +ضرب · ۴ = +تقسیم */
  readonly mathOps: 2 | 3 | 4
  /** پنجرهٔ پاسخ هر قضاوت محاسبه (ms) */
  readonly processingWindowMs: number
  /** مدت فلش بازخورد محاسبه (ms) */
  readonly feedbackMs: number
  /** مدت نمایش هر واژه (ms) */
  readonly memoryDisplayMs: number
  /** پنجرهٔ فاز بازیابی هر دسته (ms) */
  readonly recallWindowMs: number
  /** بازیابی به ترتیب وارونه (سطح ۵) */
  readonly reverseRecall: boolean
}

export interface OperationSpanState extends ExerciseState<OperationSpanConfig> {
  readonly currentTrial: OperationSpanTrial | null
  /** طرح کامل جلسه — قطعی از بذر نشست */
  readonly plan: readonly OspanSetPlan[]
}

export interface OperationSpanTrial extends ExerciseTrial {
  readonly trialIndex: number
  readonly set: OspanSetPlan
  /** زمان‌بندی درون‌دسته — کامپوننت فازها را با همین‌ها می‌راند */
  readonly processingWindowMs: number
  readonly feedbackMs: number
  readonly memoryDisplayMs: number
}

export type OperationSpanAnswer = ComplexSpanSetAnswer<string> | null

export const OPERATION_SPAN_ID = 'operation-span'
export const OPERATION_SPAN_VERSION = '1.0.0'
export const OPERATION_SPAN_CONTENT_VERSION = '2' // v2: بازیابی بلندتر از دسته دیگر «کامل» شمرده نمی‌شود (complex-span)

/** طول دسته‌ها بر حسب دشواری ۱..۵ (۳ دسته در همهٔ سطوح؛ ۳ تا ۷ آیتم) */
const SET_LENGTHS_BY_DIFFICULTY: readonly (readonly number[])[] = [
  [3, 3, 3],
  [3, 4, 3],
  [4, 4, 5],
  [5, 5, 6],
  [6, 6, 7],
]
const MATH_OPS_BY_DIFFICULTY: readonly (2 | 3 | 4)[] = [2, 2, 3, 3, 4]
const PROCESSING_WINDOW_MS_BY_DIFFICULTY: readonly number[] = [6000, 5500, 5000, 4500, 4000]
const FEEDBACK_MS_BY_DIFFICULTY: readonly number[] = [600, 600, 500, 500, 400]
const MEMORY_DISPLAY_MS_BY_DIFFICULTY: readonly number[] = [2000, 2000, 1800, 1600, 1500]
const RECALL_WINDOW_MS_BY_DIFFICULTY: readonly number[] = [18000, 20000, 22000, 24000, 26000]
const REVERSE_RECALL_BY_DIFFICULTY: readonly boolean[] = [false, false, false, false, true]

export function configForDifficulty(difficulty: number): OperationSpanConfig {
  if (difficulty < 1 || difficulty > 5) {
    throw new RangeError('دشواری باید بین ۱ تا ۵ باشد')
  }
  const level = difficulty - 1
  return {
    difficulty,
    setLengths: SET_LENGTHS_BY_DIFFICULTY[level] as readonly number[],
    mathOps: MATH_OPS_BY_DIFFICULTY[level] as 2 | 3 | 4,
    processingWindowMs: PROCESSING_WINDOW_MS_BY_DIFFICULTY[level] as number,
    feedbackMs: FEEDBACK_MS_BY_DIFFICULTY[level] as number,
    memoryDisplayMs: MEMORY_DISPLAY_MS_BY_DIFFICULTY[level] as number,
    recallWindowMs: RECALL_WINDOW_MS_BY_DIFFICULTY[level] as number,
    reverseRecall: REVERSE_RECALL_BY_DIFFICULTY[level] as boolean,
  }
}

/** ساخت یک مسئلهٔ تأیید محاسبه — ۵۰٪ معادله‌های درست */
function makeProblem(rng: SeededRandom, mathOps: 2 | 3 | 4): OspanMathProblem {
  const ops: readonly ('+' | '−' | '×' | '÷')[] =
    mathOps === 2 ? ['+', '−'] : mathOps === 3 ? ['+', '−', '×'] : ['+', '−', '×', '÷']
  const op = rng.pick(ops)
  let a = 0
  let b = 0
  let trueResult = 0
  if (op === '+') {
    a = rng.int(3, 19)
    b = rng.int(3, 19)
    trueResult = a + b
  } else if (op === '−') {
    a = rng.int(6, 25)
    b = rng.int(2, a - 1)
    trueResult = a - b
  } else if (op === '×') {
    a = rng.int(2, 9)
    b = rng.int(2, 9)
    trueResult = a * b
  } else {
    b = rng.int(2, 9)
    const quotient = rng.int(2, 9)
    a = b * quotient
    trueResult = quotient
  }
  if (rng.bool()) {
    return { a, op, b, trueResult, shownResult: trueResult, isTrue: true }
  }
  // معادلهٔ غلط: جابه‌جایی نتیجه با اختلاف غیرصفر (و غیرمنفی)
  let delta = rng.int(1, 3)
  if (rng.bool()) delta = -delta
  let shownResult = trueResult + delta
  if (shownResult < 0) shownResult = trueResult - delta
  return { a, op, b, trueResult, shownResult, isTrue: false }
}

/** ساخت طرح قطعی جلسه: برای هر دسته، زوج‌های محاسبه+واژه و جدول بازیابی */
function buildPlan(config: OperationSpanConfig, seed: number): OspanSetPlan[] {
  const rng = new SeededRandom(seed)
  return config.setLengths.map((setLength, setIndex) => {
    // واژه‌های یکتا برای دسته: setLength هدف + setLength حواس‌پرتی
    const words = rng.sample(OSPAN_WORDS, setLength * 2)
    const targets = words.slice(0, setLength)
    const distractors = words.slice(setLength)
    const items: OspanItem[] = targets.map((word) => ({ problem: makeProblem(rng, config.mathOps), word }))
    const recallChoices = rng.shuffle([...targets, ...distractors])
    const expectedRecall = config.reverseRecall ? [...targets].reverse() : [...targets]
    return { setIndex, items, recallChoices, expectedRecall, reverseRecall: config.reverseRecall }
  })
}

/** کل مهلت پاسخ یک دسته (ms) — مجموع پنجره‌های درون‌دسته + پنجرهٔ بازیابی */
export function setResponseWindowMs(config: OperationSpanConfig, setLength: number): number {
  return (
    setLength * (config.processingWindowMs + config.feedbackMs + config.memoryDisplayMs) +
    config.recallWindowMs
  )
}

export const operationSpanDefinition: ExerciseDefinition<
  OperationSpanConfig,
  OperationSpanState,
  OperationSpanTrial,
  OperationSpanAnswer
> = {
  id: OPERATION_SPAN_ID,
  version: OPERATION_SPAN_VERSION,
  contentVersion: OPERATION_SPAN_CONTENT_VERSION,
  domain: 'working-memory',

  createSession(sessionId, config, seed) {
    return {
      sessionId,
      config,
      seed,
      nextTrialIndex: 0,
      currentTrial: null,
      plan: buildPlan(config, seed),
      results: [],
    }
  },

  nextTrial(state) {
    if (state.nextTrialIndex >= state.plan.length) {
      throw new Error('همه مراحل جلسه تولید شده‌اند')
    }
    const set = state.plan[state.nextTrialIndex] as OspanSetPlan
    const trial: OperationSpanTrial = {
      trialIndex: state.nextTrialIndex,
      set,
      processingWindowMs: state.config.processingWindowMs,
      feedbackMs: state.config.feedbackMs,
      memoryDisplayMs: state.config.memoryDisplayMs,
      responseWindowMs: setResponseWindowMs(state.config, set.items.length),
    }
    return {
      state: { ...state, nextTrialIndex: trial.trialIndex + 1, currentTrial: trial },
      trial,
    }
  },

  submitAnswer(state, answer, reactionTimeMs) {
    const trial = state.currentTrial
    if (!trial) throw new Error('مرحله فعلی برای ثبت پاسخ وجود ندارد')
    const { set } = trial

    const judgments = answer?.processingJudgments ?? []
    const recalled = answer?.recalled ?? []
    const score = scoreSpanRecall(set.expectedRecall, recalled)
    const fullyCorrect = isFullRecall(score)

    const record: RecordedTrial = {
      trialIndex: trial.trialIndex,
      stimulus: {
        setIndex: set.setIndex,
        items: set.items,
        expectedRecall: set.expectedRecall,
        recallChoices: set.recallChoices,
        mathJudgments: judgments,
        mathRtMs: answer?.processingRtMs ?? [],
        recall: recalled,
      },
      expected: [...set.expectedRecall],
      given: answer === null ? null : recalled,
      outcome: answer === null ? 'omission' : fullyCorrect ? 'correct' : 'incorrect',
      correct: answer !== null && fullyCorrect,
      reactionTimeMs,
    }
    return { ...state, currentTrial: null, results: [...state.results, record] }
  },

  isComplete(state) {
    return state.results.length >= state.plan.length
  },

  getSummary(state): ExerciseSummary {
    const totals = summarizeOutcomes(state.results)

    let mathCorrect = 0
    let mathTotal = 0
    const recallScores: SpanRecallScore[] = []
    for (const record of state.results) {
      const s = record.stimulus as {
        items: readonly OspanItem[]
        expectedRecall: readonly string[]
        mathJudgments: readonly (boolean | null)[]
        recall: readonly string[]
      }
      s.items.forEach((item, i) => {
        mathTotal += 1
        if (s.mathJudgments[i] === item.problem.isTrue) mathCorrect += 1
      })
      recallScores.push(scoreSpanRecall(s.expectedRecall, s.recall))
    }
    const mathAccuracy = accuracyPercent(mathCorrect, mathTotal)

    return {
      exerciseId: OPERATION_SPAN_ID,
      sessionId: state.sessionId,
      exerciseVersion: OPERATION_SPAN_VERSION,
      contentVersion: OPERATION_SPAN_CONTENT_VERSION,
      domain: 'working-memory',
      difficulty: state.config.difficulty,
      ...totals,
      metrics: {
        setsCompleted: state.results.length,
        partialCreditUnitScore: partialCreditUnitPercent(recallScores),
        mathAccuracy,
        recallInOrderRate: fullRecallSetPercent(recallScores),
        orderErrors: recallScores.reduce((sum, s) => sum + s.orderErrors, 0),
        intrusionErrors: recallScores.reduce((sum, s) => sum + s.intrusionErrors, 0),
        invalidSessionFlag: isProcessingGateFailed(mathAccuracy) ? 1 : 0,
      },
    }
  },
}
