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
  partialCreditUnitPercent,
  scoreSpanRecall,
  type ComplexSpanSetAnswer,
  type SpanRecallScore,
} from '../../../shared/complex-span'

/**
 * دهانهٔ تقارن (Symmetry Span) — حافظهٔ کاری مرکب دیداری-فضایی؛ پیشنهاد ۳
 * سند پژوهش (اقتباس نسخهٔ خودکار آزمایشگاه اِنگل، بدون دارایی تجاری).
 *
 * هر دسته (مرحله): چند زوج «قضاوت تقارن الگوی شبکهٔ ۴×۴ + روشن‌شدن یک خانهٔ
 * هدف در شبکهٔ خالی»؛ پایان دسته، بازیابی مکان‌ها به همان ترتیب با لمس
 * خانه‌ها. کل پاسخ دسته در یک submitAnswer ثبت می‌شود؛ مهلت = کل دسته.
 *
 * الگوی تقارن: نیمهٔ چپ شبکه (۲ ستون) از بذر پر می‌شود (۲ تا ۵ خانه)؛ نسخهٔ
 * متقارن آینهٔ آن است و نسخهٔ نامتقارن با وارونه‌کردن ۱ یا ۲ خانهٔ آینه ساخته
 * می‌شود — پاسخ درست قضاوت، متقارن بودن یا نبودن است.
 *
 * فاصلهٔ خانه‌های هدف با سطح کنترل می‌شود (تداخل فضایی): سطوح پایین پخش،
 * سطوح بالا نزدیک.
 */

/** ابعاد شبکهٔ تقارن و بازیابی */
export const SYMSPAN_GRID_SIZE = 4

/** الگوی تقارن — ۱۶ خانهٔ شبکهٔ ۴×۴ (سطر-جزء)؛ true = پر */
export interface SymmetryPattern {
  readonly cells: readonly boolean[]
  readonly isSymmetric: boolean
}

/** یک زوج پردازش + رمزآوری */
export interface SymspanItem {
  readonly pattern: SymmetryPattern
  /** خانهٔ هدف 0..15 برای رمزآوری */
  readonly targetCell: number
}

/** طرح کامل یک دسته */
export interface SymspanSetPlan {
  readonly setIndex: number
  readonly items: readonly SymspanItem[]
  /** ترتیب درست بازیابی — وارونه در سطح ۵ */
  readonly expectedRecall: readonly number[]
  readonly reverseRecall: boolean
}

export interface SymmetrySpanConfig extends ExerciseConfig {
  readonly setLengths: readonly number[]
  /** پنجرهٔ قضاوت تقارن (ms) */
  readonly patternWindowMs: number
  /** مدت فلش بازخورد قضاوت (ms) */
  readonly feedbackMs: number
  /** مدت نمایش خانهٔ هدف (ms) */
  readonly cellDisplayMs: number
  /** پنجرهٔ فاز بازیابی هر دسته (ms) */
  readonly recallWindowMs: number
  readonly reverseRecall: boolean
  /** چیدمان خانه‌های هدف: پخش / آزاد / نزدیک */
  readonly targetSpacing: 'spread' | 'mixed' | 'close'
}

export interface SymmetrySpanState extends ExerciseState<SymmetrySpanConfig> {
  readonly currentTrial: SymmetrySpanTrial | null
  /** طرح کامل جلسه — قطعی از بذر نشست */
  readonly plan: readonly SymspanSetPlan[]
}

export interface SymmetrySpanTrial extends ExerciseTrial {
  readonly trialIndex: number
  readonly set: SymspanSetPlan
  readonly patternWindowMs: number
  readonly feedbackMs: number
  readonly cellDisplayMs: number
}

export type SymmetrySpanAnswer = ComplexSpanSetAnswer<number> | null

export const SYMMETRY_SPAN_ID = 'symmetry-span'
export const SYMMETRY_SPAN_VERSION = '1.0.0'
export const SYMMETRY_SPAN_CONTENT_VERSION = '1'

/** طول دسته‌ها بر حسب دشواری ۱..۵ (۳ دسته؛ ۳ تا ۶ آیتم) */
const SET_LENGTHS_BY_DIFFICULTY: readonly (readonly number[])[] = [
  [3, 3, 3],
  [3, 4, 3],
  [4, 4, 4],
  [4, 5, 4],
  [5, 6, 5],
]
const PATTERN_WINDOW_MS_BY_DIFFICULTY: readonly number[] = [5000, 4500, 4000, 4000, 3500]
const FEEDBACK_MS_BY_DIFFICULTY: readonly number[] = [500, 500, 500, 400, 400]
const CELL_DISPLAY_MS_BY_DIFFICULTY: readonly number[] = [1200, 1200, 1000, 1000, 900]
const RECALL_WINDOW_MS_BY_DIFFICULTY: readonly number[] = [15000, 17000, 19000, 21000, 23000]
const REVERSE_RECALL_BY_DIFFICULTY: readonly boolean[] = [false, false, false, false, true]
const TARGET_SPACING_BY_DIFFICULTY: readonly ('spread' | 'mixed' | 'close')[] = [
  'spread',
  'spread',
  'mixed',
  'mixed',
  'close',
]

export function configForDifficulty(difficulty: number): SymmetrySpanConfig {
  if (difficulty < 1 || difficulty > 5) {
    throw new RangeError('دشواری باید بین ۱ تا ۵ باشد')
  }
  const level = difficulty - 1
  return {
    difficulty,
    setLengths: SET_LENGTHS_BY_DIFFICULTY[level] as readonly number[],
    patternWindowMs: PATTERN_WINDOW_MS_BY_DIFFICULTY[level] as number,
    feedbackMs: FEEDBACK_MS_BY_DIFFICULTY[level] as number,
    cellDisplayMs: CELL_DISPLAY_MS_BY_DIFFICULTY[level] as number,
    recallWindowMs: RECALL_WINDOW_MS_BY_DIFFICULTY[level] as number,
    reverseRecall: REVERSE_RECALL_BY_DIFFICULTY[level] as boolean,
    targetSpacing: TARGET_SPACING_BY_DIFFICULTY[level] as 'spread' | 'mixed' | 'close',
  }
}

/** فاصلهٔ منهتن دو خانهٔ شبکهٔ ۴×۴ */
function manhattan(a: number, b: number): number {
  const ra = Math.floor(a / SYMSPAN_GRID_SIZE)
  const ca = a % SYMSPAN_GRID_SIZE
  const rb = Math.floor(b / SYMSPAN_GRID_SIZE)
  const cb = b % SYMSPAN_GRID_SIZE
  return Math.abs(ra - rb) + Math.abs(ca - cb)
}

/** خانهٔ آینه‌ای ستون‌ها حول محور عمودی وسط (۰↔۳، ۱↔۲) */
function mirrorCell(cell: number): number {
  const row = Math.floor(cell / SYMSPAN_GRID_SIZE)
  const col = SYMSPAN_GRID_SIZE - 1 - (cell % SYMSPAN_GRID_SIZE)
  return row * SYMSPAN_GRID_SIZE + col
}

/** ساخت الگوی تقارن — نیمهٔ چپ از بذر؛ ۵۰٪ متقارن */
function makePattern(rng: SeededRandom): SymmetryPattern {
  const cells = new Array<boolean>(SYMSPAN_GRID_SIZE * SYMSPAN_GRID_SIZE).fill(false)
  // نیمهٔ چپ = ستون‌های ۰ و ۱ — بین ۲ تا ۵ خانهٔ پر
  const leftCells: number[] = []
  for (let row = 0; row < SYMSPAN_GRID_SIZE; row += 1) {
    for (let col = 0; col < 2; col += 1) leftCells.push(row * SYMSPAN_GRID_SIZE + col)
  }
  const filled = rng.sample(leftCells, rng.int(2, 5))
  for (const cell of filled) cells[cell] = true

  const symmetric = rng.bool()
  if (symmetric) {
    for (const cell of filled) cells[mirrorCell(cell)] = true
    return { cells: [...cells], isSymmetric: true }
  }
  // نامتقارن: آینه، سپس وارونه‌کردن ۱ یا ۲ خانهٔ نیمهٔ راست
  const mirrorFilled = filled.map(mirrorCell)
  for (const cell of mirrorFilled) cells[cell] = true
  const flipCount = Math.min(rng.int(1, 2), mirrorFilled.length)
  const flips = rng.sample(mirrorFilled, flipCount)
  for (const cell of flips) cells[cell] = !cells[cell]
  return { cells: [...cells], isSymmetric: false }
}

/**
 * انتخاب خانهٔ هدف بعدی با قید فاصله از خانه‌های قبلی دسته
 * (ردکردن نمونه‌های نامناسب با بذر — قطعی).
 */
function pickTargetCell(rng: SeededRandom, previous: readonly number[], spacing: 'spread' | 'mixed' | 'close'): number {
  const all = Array.from({ length: SYMSPAN_GRID_SIZE * SYMSPAN_GRID_SIZE }, (_, i) => i).filter(
    (cell) => !previous.includes(cell),
  )
  const candidates = all.filter((cell) => {
    const distances = previous.map((p) => manhattan(cell, p))
    if (previous.length === 0) return true
    if (spacing === 'spread') return distances.every((d) => d >= 2)
    if (spacing === 'close') return distances.some((d) => d <= 2)
    return true // mixed — بدون قید فاصله
  })
  // اگر قید درنیامد (شبکه پر/تنگ)، از کل باقی انتخاب می‌کنیم
  return rng.pick(candidates.length > 0 ? candidates : all)
}

/** ساخت طرح قطعی جلسه: برای هر دسته، زوج‌های تقارن+خانه و ترتیب بازیابی */
function buildPlan(config: SymmetrySpanConfig, seed: number): SymspanSetPlan[] {
  const rng = new SeededRandom(seed)
  return config.setLengths.map((setLength, setIndex) => {
    const items: SymspanItem[] = []
    for (let i = 0; i < setLength; i += 1) {
      const targetCell = pickTargetCell(
        rng,
        items.map((it) => it.targetCell),
        config.targetSpacing,
      )
      items.push({ pattern: makePattern(rng), targetCell })
    }
    const targets = items.map((it) => it.targetCell)
    const expectedRecall = config.reverseRecall ? [...targets].reverse() : targets
    return { setIndex, items, expectedRecall, reverseRecall: config.reverseRecall }
  })
}

/** کل مهلت پاسخ یک دسته (ms) — مجموع پنجره‌های درون‌دسته + پنجرهٔ بازیابی */
export function setResponseWindowMs(config: SymmetrySpanConfig, setLength: number): number {
  return (
    setLength * (config.patternWindowMs + config.feedbackMs + config.cellDisplayMs) +
    config.recallWindowMs
  )
}

export const symmetrySpanDefinition: ExerciseDefinition<
  SymmetrySpanConfig,
  SymmetrySpanState,
  SymmetrySpanTrial,
  SymmetrySpanAnswer
> = {
  id: SYMMETRY_SPAN_ID,
  version: SYMMETRY_SPAN_VERSION,
  contentVersion: SYMMETRY_SPAN_CONTENT_VERSION,
  domain: 'visual-spatial',

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
    const set = state.plan[state.nextTrialIndex] as SymspanSetPlan
    const trial: SymmetrySpanTrial = {
      trialIndex: state.nextTrialIndex,
      set,
      patternWindowMs: state.config.patternWindowMs,
      feedbackMs: state.config.feedbackMs,
      cellDisplayMs: state.config.cellDisplayMs,
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
        symmetryJudgments: judgments,
        symmetryRtMs: answer?.processingRtMs ?? [],
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

    let symmetryCorrect = 0
    let symmetryTotal = 0
    const recallScores: SpanRecallScore[] = []
    for (const record of state.results) {
      const s = record.stimulus as {
        items: readonly SymspanItem[]
        expectedRecall: readonly number[]
        symmetryJudgments: readonly (boolean | null)[]
        recall: readonly number[]
      }
      s.items.forEach((item, i) => {
        symmetryTotal += 1
        if (s.symmetryJudgments[i] === item.pattern.isSymmetric) symmetryCorrect += 1
      })
      recallScores.push(scoreSpanRecall(s.expectedRecall, s.recall))
    }
    const symmetryAccuracy = accuracyPercent(symmetryCorrect, symmetryTotal)

    return {
      exerciseId: SYMMETRY_SPAN_ID,
      sessionId: state.sessionId,
      exerciseVersion: SYMMETRY_SPAN_VERSION,
      contentVersion: SYMMETRY_SPAN_CONTENT_VERSION,
      domain: 'visual-spatial',
      difficulty: state.config.difficulty,
      ...totals,
      metrics: {
        setsCompleted: state.results.length,
        partialCreditUnitScore: partialCreditUnitPercent(recallScores),
        symmetryAccuracy,
        orderErrors: recallScores.reduce((sum, s) => sum + s.orderErrors, 0),
        intrusionErrors: recallScores.reduce((sum, s) => sum + s.intrusionErrors, 0),
        invalidSessionFlag: isProcessingGateFailed(symmetryAccuracy) ? 1 : 0,
      },
    }
  },
}
