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
import { summarizeOutcomes } from '../../../../core/scoring/scoring'

/**
 * Dual N-Back — ان-بک دوگانه (حافظه کاری)
 *
 * دو جریان هم‌زمان: حرف (مرکز) + موقعیت خانهٔ فعال شبکهٔ ۳×۳. هر جریان
 * مستقل با N مرحله قبلِ خودش مقایسه می‌شود؛ کاربر در پنجرهٔ پاسخ می‌تواند
 * «تطبیق حرف» و/یا «تطبیق مکان» را بزند. قرارداد یک-submit-per-trial:
 * کامپوننت ادعاهای هر جریان را در پنجره جمع می‌کند و تایمر مهلت، یک
 * submit با هر دو ادعا (و زمان فشردن هرکدام) می‌فرستد.
 *
 * امتیازدهی هر جریان مستقل چهارمحصولی است (hit/miss/false alarm/correct
 * rejection)؛ outcome مرحله = بدترین جریان (commission مقدم بر omission).
 *
 * اقتباس از پارادایم Dual N-Back (Jaeggi و همکاران) با دو جریان دیداری —
 * بدون دارایی بصری هیچ محصول تجاری.
 */

/** خانه‌های شبکهٔ ۳×۳ — اندیس ۰..۸ (سطر به سطر) */
export const DUAL_NBACK_CELL_COUNT = 9

export interface DualNBackConfig extends ExerciseConfig {
  /** فاصله تطبیق (N) هر دو جریان */
  readonly n: number
  readonly totalTrials: number
  /** نسبت تقریبی مراحل هدف — مستقل برای هر جریان */
  readonly targetRate: number
  readonly stimulusMs: number
  readonly interStimulusMs: number
}

export interface DualNBackState extends ExerciseState<DualNBackConfig> {
  readonly currentTrial: DualNBackTrial | null
  /** تاریخچه هر دو جریان — مبنای مقایسهٔ N-قبل */
  readonly letters: readonly string[]
  readonly cells: readonly number[]
}

export interface DualNBackTrial extends ExerciseTrial {
  readonly trialIndex: number
  readonly letter: string
  /** خانهٔ فعال شبکهٔ ۳×۳ (۰..۸) */
  readonly cell: number
  readonly n: number
  readonly isLetterTarget: boolean
  readonly isCellTarget: boolean
  readonly stimulusMs: number
  readonly interStimulusMs: number
}

/** پاسخ یک‌تایی مرحله: ادعای هر جریان + زمان فشردن (از شروع نمایش) */
export interface DualNBackAnswer {
  readonly letterClaimed: boolean
  readonly cellClaimed: boolean
  readonly letterRtMs: number | null
  readonly cellRtMs: number | null
}

export const DUAL_NBACK_ID = 'dual-n-back'
export const DUAL_NBACK_VERSION = '1.0.0'
export const DUAL_NBACK_CONTENT_VERSION = '1'
const TOTAL_TRIALS = 24
const TARGET_RATE = 0.3

/** نزدیک به n-back ولی کمی کندتر — بار دوگانه سهمیهٔ زمانی بیشتری می‌خواهد */
const N_BY_DIFFICULTY: readonly number[] = [1, 2, 2, 3, 3]
const STIMULUS_MS_BY_DIFFICULTY: readonly number[] = [1000, 900, 700, 900, 700]
const INTER_STIMULUS_MS_BY_DIFFICULTY: readonly number[] = [1100, 1000, 800, 1000, 800]

export function configForDifficulty(difficulty: number): DualNBackConfig {
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
    interStimulusMs: INTER_STIMULUS_MS_BY_DIFFICULTY[Number(level)] as number,
  }
}

/** حروف مشترک با ان-بک ساده — استخر بازاستفاده */
const LETTERS: readonly string[] = ['ب', 'ج', 'د', 'س', 'ف', 'ل', 'م', 'ت']

/**
 * کارخانهٔ تعریف — منطق برای هر دو گونهٔ دیداری و شنیداری یکی است؛
 * ارائهٔ حرف در کامپوننت تعیین می‌شود (شنیداری: گفتار محلی با fallback
 * دیداری). id جدا = رکورد جلسهٔ جدا برای هر گونه.
 */
export function dualNBackDefinitionFor(
  id: string,
): ExerciseDefinition<DualNBackConfig, DualNBackState, DualNBackTrial, DualNBackAnswer | null> {
  return {
    id,
    version: DUAL_NBACK_VERSION,
  contentVersion: DUAL_NBACK_CONTENT_VERSION,
  domain: 'working-memory',

  createSession(sessionId, config, seed) {
    return {
      sessionId,
      config,
      seed,
      nextTrialIndex: 0,
      currentTrial: null,
      letters: [],
      cells: [],
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

    // جریان حرف — همان ناوردای ان-بک ساده
    let letter: string
    let isLetterTarget: boolean
    if (trialIndex < n) {
      letter = rng.pick(LETTERS)
      isLetterTarget = false
    } else {
      const backLetter = state.letters[trialIndex - n]
      if (backLetter === undefined) throw new Error('تاریخچه حرف‌ها ناقص است')
      isLetterTarget = rng.bool(state.config.targetRate)
      letter = isLetterTarget
        ? backLetter
        : rng.pick(LETTERS.filter((c) => c !== backLetter))
    }

    // جریان مکان — همان منطق با استخر خانه‌ها؛ هم‌بستهٔ حرف نیست
    let cell: number
    let isCellTarget: boolean
    if (trialIndex < n) {
      cell = rng.int(0, DUAL_NBACK_CELL_COUNT - 1)
      isCellTarget = false
    } else {
      const backCell = state.cells[trialIndex - n]
      if (backCell === undefined) throw new Error('تاریخچه خانه‌ها ناقص است')
      isCellTarget = rng.bool(state.config.targetRate)
      if (isCellTarget) {
        cell = backCell
      } else {
        // هر خانه‌ای جز خانهٔ N-قبل → غیرتطبیقِ واقعی تضمین می‌شود
        const offset = rng.int(1, DUAL_NBACK_CELL_COUNT - 1)
        cell = (backCell + offset) % DUAL_NBACK_CELL_COUNT
      }
    }

    const trial: DualNBackTrial = {
      trialIndex,
      letter,
      cell,
      n,
      isLetterTarget,
      isCellTarget,
      stimulusMs: state.config.stimulusMs,
      interStimulusMs: state.config.interStimulusMs,
      responseWindowMs: state.config.stimulusMs + state.config.interStimulusMs,
    }
    return {
      state: {
        ...state,
        nextTrialIndex: trialIndex + 1,
        currentTrial: trial,
        letters: [...state.letters, letter],
        cells: [...state.cells, cell],
      },
      trial,
    }
  },

  submitAnswer(state, answer, reactionTimeMs) {
    const trial = state.currentTrial
    if (!trial) throw new Error('محرک فعالی برای ثبت پاسخ وجود ندارد')
    const claimed = answer ?? {
      letterClaimed: false,
      cellClaimed: false,
      letterRtMs: null,
      cellRtMs: null,
    }

    // نتیجهٔ هر جریان به تفکیک چهارمحصولی
    const letterOutcome = trial.isLetterTarget
      ? claimed.letterClaimed
        ? 'hit'
        : 'miss'
      : claimed.letterClaimed
        ? 'falseAlarm'
        : 'correctRejection'
    const cellOutcome = trial.isCellTarget
      ? claimed.cellClaimed
        ? 'hit'
        : 'miss'
      : claimed.cellClaimed
        ? 'falseAlarm'
        : 'correctRejection'

    // outcome مرحله = بدترین جریان (commission مقدم بر omission)
    const outcome =
      letterOutcome === 'falseAlarm' || cellOutcome === 'falseAlarm'
        ? 'commission'
        : letterOutcome === 'miss' || cellOutcome === 'miss'
          ? 'omission'
          : 'correct'

    const record: RecordedTrial = {
      trialIndex: trial.trialIndex,
      stimulus: {
        letter: trial.letter,
        cell: trial.cell,
        n: trial.n,
        isLetterTarget: trial.isLetterTarget,
        isCellTarget: trial.isCellTarget,
      },
      expected: {
        letter: trial.isLetterTarget ? 'match' : null,
        cell: trial.isCellTarget ? 'match' : null,
      },
      given: {
        letterClaimed: claimed.letterClaimed,
        cellClaimed: claimed.cellClaimed,
        letterRtMs: claimed.letterRtMs,
        cellRtMs: claimed.cellRtMs,
      },
      outcome,
      correct: outcome === 'correct',
      reactionTimeMs,
    }
    return { ...state, currentTrial: null, results: [...state.results, record] }
  },

  isComplete(state) {
    return state.results.length >= state.config.totalTrials
  },

  getSummary(state): ExerciseSummary {
    const totals = summarizeOutcomes(state.results)
    const streamOf = (r: RecordedTrial, stream: 'letter' | 'cell') => {
      const s = r.stimulus as { isLetterTarget?: boolean; isCellTarget?: boolean } | null
      const isTarget = stream === 'letter' ? s?.isLetterTarget : s?.isCellTarget
      const g = r.given as { letterClaimed?: boolean; cellClaimed?: boolean } | null
      const claimed = stream === 'letter' ? g?.letterClaimed : g?.cellClaimed
      if (isTarget) return claimed ? 'hit' : 'miss'
      return claimed ? 'falseAlarm' : 'correctRejection'
    }
    const count = (stream: 'letter' | 'cell', kind: string) =>
      state.results.filter((r) => streamOf(r, stream) === kind).length

    return {
      exerciseId: id,
      sessionId: state.sessionId,
      exerciseVersion: DUAL_NBACK_VERSION,
      contentVersion: DUAL_NBACK_CONTENT_VERSION,
      domain: 'working-memory',
      difficulty: state.config.difficulty,
      ...totals,
      metrics: {
        letterHits: count('letter', 'hit'),
        letterMisses: count('letter', 'miss'),
        letterFalseAlarms: count('letter', 'falseAlarm'),
        letterCorrectRejections: count('letter', 'correctRejection'),
        cellHits: count('cell', 'hit'),
        cellMisses: count('cell', 'miss'),
        cellFalseAlarms: count('cell', 'falseAlarm'),
        cellCorrectRejections: count('cell', 'correctRejection'),
      },
    }
  },
  }
}

export const dualNBackDefinition = dualNBackDefinitionFor(DUAL_NBACK_ID)

/** گونهٔ شنیداری — جریان حرف با صدای دستگاه (fallback دیداری خودکار) */
export const DUAL_NBACK_AUDITORY_ID = 'dual-n-back-auditory'
export const dualNBackAuditoryDefinition = dualNBackDefinitionFor(DUAL_NBACK_AUDITORY_ID)
