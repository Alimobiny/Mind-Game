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
 * Memorise Grid — حافظه دیداری و مکانی
 *
 * نمایش K خانه فعال در شبکه n×n → بازسازی همان خانه‌ها.
 * دشواری ۱..۵: شبکه بزرگ‌تر و خانه‌های بیشتر با زمان حفظ کوتاه‌تر.
 *
 * اقتباس نرم‌افزاری از الگوی Memorise/Grid Recall؛ بدون دارایی
 * بصری هیچ محصول تجاری.
 */

export interface MemoriseGridConfig extends ExerciseConfig {
  /** ابعاد شبکه (n×n) */
  readonly gridSize: number
  /** تعداد خانه‌های فعال */
  readonly activeCells: number
  /** تعداد مراحل جلسه */
  readonly totalTrials: number
  /** مدت نمایش الگو (ms) */
  readonly memoriseMs: number
}

export interface MemoriseGridState extends ExerciseState<MemoriseGridConfig> {
  readonly currentTrial: MemoriseGridTrial | null
}

export interface MemoriseGridTrial extends ExerciseTrial {
  readonly gridSize: number
  /** اندیس‌های خانه‌های فعال (۰..n²-1) */
  readonly activeCells: readonly number[]
  readonly memoriseMs: number
}

/** پاسخ کاربر: اندیس خانه‌های انتخابی */
export type MemoriseGridAnswer = readonly number[]

export const MEMORISE_GRID_ID = 'memorise-grid'
export const MEMORISE_GRID_VERSION = '1.0.0'
export const MEMORISE_GRID_CONTENT_VERSION = '1'
const TOTAL_TRIALS = 10

/** سطح‌های دشواری — اعداد طراحی‌اند، نه هنجار جمعیتی */
const LEVELS: readonly { gridSize: number; activeCells: number; memoriseMs: number }[] = [
  { gridSize: 3, activeCells: 3, memoriseMs: 2400 },
  { gridSize: 4, activeCells: 4, memoriseMs: 2400 },
  { gridSize: 4, activeCells: 6, memoriseMs: 2200 },
  { gridSize: 5, activeCells: 7, memoriseMs: 2000 },
  { gridSize: 5, activeCells: 9, memoriseMs: 1800 },
]

export function configForDifficulty(difficulty: number): MemoriseGridConfig {
  if (difficulty < 1 || difficulty > 5) {
    throw new RangeError('دشواری باید بین ۱ تا ۵ باشد')
  }
  const level = LEVELS[difficulty - 1] as { gridSize: number; activeCells: number; memoriseMs: number }
  return {
    difficulty,
    gridSize: level.gridSize,
    activeCells: level.activeCells,
    totalTrials: TOTAL_TRIALS,
    memoriseMs: level.memoriseMs,
  }
}

/** امتیاز هم‌پوشانی: نسبت خانه‌های درست به تعداد خانه‌های هدف (۰..۱) */
export function overlapRate(expected: readonly number[], given: readonly number[]): number {
  if (expected.length === 0) return 0
  const expectedSet = new Set(expected)
  const hits = given.filter((cell) => expectedSet.has(cell)).length
  return hits / expected.length
}

export const memoriseGridDefinition: ExerciseDefinition<
  MemoriseGridConfig,
  MemoriseGridState,
  MemoriseGridTrial,
  MemoriseGridAnswer
> = {
  id: MEMORISE_GRID_ID,
  version: MEMORISE_GRID_VERSION,
  contentVersion: MEMORISE_GRID_CONTENT_VERSION,
  domain: 'visual-spatial',

  createSession(sessionId, config, seed) {
    return { sessionId, config, seed, nextTrialIndex: 0, currentTrial: null, results: [] }
  },

  nextTrial(state) {
    if (state.nextTrialIndex >= state.config.totalTrials) {
      throw new Error('همه مراحل تولید شده‌اند')
    }
    const trialIndex = state.nextTrialIndex
    const rng = new SeededRandom(deriveTrialSeed(state.seed, trialIndex))
    const total = state.config.gridSize * state.config.gridSize
    const activeCells = rng.sample(
      Array.from({ length: total }, (_, i) => i),
      state.config.activeCells,
    )
    const trial: MemoriseGridTrial = {
      trialIndex,
      gridSize: state.config.gridSize,
      activeCells,
      memoriseMs: state.config.memoriseMs,
      responseWindowMs: null,
    }
    return { state: { ...state, nextTrialIndex: trialIndex + 1, currentTrial: trial }, trial }
  },

  submitAnswer(state, answer, reactionTimeMs) {
    const trial = state.currentTrial
    if (!trial) throw new Error('مرحله فعالی برای ثبت پاسخ وجود ندارد')
    const given = answer
    const isFullMatch =
      given !== null &&
      given.length === trial.activeCells.length &&
      overlapRate(trial.activeCells, given) === 1 &&
      new Set(given).size === given.length
    const outcome: TrialOutcome = given === null ? 'omission' : isFullMatch ? 'correct' : 'incorrect'
    const record: RecordedTrial = {
      trialIndex: trial.trialIndex,
      stimulus: { gridSize: trial.gridSize, activeCells: trial.activeCells },
      expected: trial.activeCells,
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
    const overlaps = state.results.map((r) =>
      Array.isArray(r.expected) && Array.isArray(r.given)
        ? overlapRate(r.expected as number[], r.given as number[])
        : 0,
    )
    const meanOverlap = overlaps.length === 0 ? 0 : overlaps.reduce((a, b) => a + b, 0) / overlaps.length
    return {
      exerciseId: MEMORISE_GRID_ID,
      sessionId: state.sessionId,
      exerciseVersion: MEMORISE_GRID_VERSION,
      contentVersion: MEMORISE_GRID_CONTENT_VERSION,
      domain: 'visual-spatial',
      difficulty: state.config.difficulty,
      ...totals,
      metrics: {
        /** میانگین درصد خانه‌های به‌یادآورده‌شده درست (۰..۱۰۰) */
        meanOverlapRate: Math.round(meanOverlap * 1000) / 10,
        gridSize: state.config.gridSize,
        activeCells: state.config.activeCells,
      },
    }
  },
}
