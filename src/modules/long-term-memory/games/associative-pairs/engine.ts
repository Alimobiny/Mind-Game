import type {
  ExerciseConfig,
  ExerciseDefinition,
  ExerciseState,
  ExerciseSummary,
  ExerciseTrial,
  RecordedTrial,
} from '../../../../core/types'
import { SeededRandom } from '../../../../core/randomization/seeded-random'
import { summarizeOutcomes } from '../../../../core/scoring/scoring'

/**
 * Associative Pairs — حافظهٔ انجمنی (حافظه بلندمدت)
 *
 * بلوک مطالعه: K جفت واژهٔ ملموس یکی‌یکی نمایش داده می‌شود (فقط تماشا).
 * بلوک آزمون: نشانهٔ هر جفت با چند گزینه می‌آید — واژهٔ جفت‌شده را انتخاب کن.
 * در سطح‌های ۳+ همان جفت‌ها یک بار دیگر (با ترتیب گزینهٔ تازه) پرسیده
 * می‌شوند: بلوک یادآوری دوباره — جنبهٔ «بلندمدتِ» تمرین همین‌جاست.
 *
 * طرح جلسه (جفت‌ها و گزینه‌ها) یک‌جا در createSession از بذر نشست ساخته
 * می‌شود و nextTrial فقط عنصر i ام را می‌خواند — قطعی و بدون وابستگی به
 * پاسخ‌ها. واژهٔ نشانه همیشه سمت اول جفت است.
 */

/** استخر واژه‌های ملموس — متمایز و تک‌هجایی/دوهجایی برای رمزآوری آسان */
export const AP_WORDS: readonly string[] = [
  'درخت', 'ماهی', 'کلید', 'صندلی', 'پنجره', 'قاشق',
  'سیب', 'کتاب', 'ماه', 'ستاره', 'کوه', 'ابر',
  'باران', 'گل', 'قایق', 'قلم', 'ساعت', 'عینک',
  'کیف', 'کفش', 'پرنده', 'دریا', 'شمع', 'سنگ',
]

export interface AssociativePairsConfig extends ExerciseConfig {
  /** تعداد جفت‌های جلسه */
  readonly pairCount: number
  /** تعداد گزینه‌های هر آزمون (شامل واژهٔ درست) */
  readonly choiceCount: number
  /** آیا بلوک یادآوری دوباره هم هست (سطح ۳+) */
  readonly hasRetestBlock: boolean
  /** مدت نمایش هر جفت در بلوک مطالعه (ms) */
  readonly studyDisplayMs: number
}

export interface AssociativePairsPlanItem {
  readonly phase: 'study' | 'test'
  readonly pairId: number
  /** واژهٔ نشانه (سمت اول جفت) */
  readonly cue: string
  /** واژهٔ هدف (سمت دوم جفت) */
  readonly target: string
  /** فقط فاز test — گزینه‌ها به ترتیب نمایش؛ عنصر correctIndex درست است */
  readonly choices: readonly string[]
  readonly correctIndex: number
  /** شمارهٔ بلوک آزمون (۱ = بلافاصله، ۲ = یادآوری دوباره) */
  readonly block: number
}

export interface AssociativePairsState extends ExerciseState<AssociativePairsConfig> {
  readonly currentTrial: AssociativePairsTrial | null
  /** طرح کامل جلسه — قطعی از بذر نشست */
  readonly plan: readonly AssociativePairsPlanItem[]
}

export interface AssociativePairsTrial extends ExerciseTrial {
  readonly trialIndex: number
  readonly item: AssociativePairsPlanItem
  readonly studyDisplayMs: number
}

/** پاسخ: در فاز test اندیس گزینهٔ انتخابی؛ null = بی‌پاسخ/انقضای مهلت مطالعه */
export type AssociativePairsAnswer = number | null

export const ASSOCIATIVE_PAIRS_ID = 'associative-pairs'
export const ASSOCIATIVE_PAIRS_VERSION = '1.0.0'
export const ASSOCIATIVE_PAIRS_CONTENT_VERSION = '1'

/** K جفت بر حسب دشواری ۱..۵ */
const PAIR_COUNT_BY_DIFFICULTY: readonly number[] = [4, 5, 6, 7, 8]
const CHOICE_COUNT_BY_DIFFICULTY: readonly number[] = [3, 3, 4, 5, 5]
const HAS_RETEST_BY_DIFFICULTY: readonly boolean[] = [false, false, true, true, true]
const STUDY_DISPLAY_MS_BY_DIFFICULTY: readonly number[] = [3000, 2800, 2600, 2400, 2200]

export function configForDifficulty(difficulty: number): AssociativePairsConfig {
  if (difficulty < 1 || difficulty > 5) {
    throw new RangeError('دشواری باید بین ۱ تا ۵ باشد')
  }
  const level = difficulty - 1
  return {
    difficulty,
    pairCount: PAIR_COUNT_BY_DIFFICULTY[level] as number,
    choiceCount: CHOICE_COUNT_BY_DIFFICULTY[level] as number,
    hasRetestBlock: HAS_RETEST_BY_DIFFICULTY[level] as boolean,
    studyDisplayMs: STUDY_DISPLAY_MS_BY_DIFFICULTY[level] as number,
  }
}

/** ساخت طرح قطعی جلسه: مطالعه K → آزمون K → (یادآوری K در سطح ۳+) */
function buildPlan(config: AssociativePairsConfig, seed: number): AssociativePairsPlanItem[] {
  const rng = new SeededRandom(seed)
  const words = rng.sample(AP_WORDS, config.pairCount * 2)
  const pairs = Array.from({ length: config.pairCount }, (_, i) => ({
    pairId: i,
    cue: words[(i * 2) as number] as string,
    target: words[(i * 2 + 1) as number] as string,
  }))
  const plan: AssociativePairsPlanItem[] = []

  for (const p of pairs) {
    plan.push({ phase: 'study', ...p, choices: [], correctIndex: -1, block: 0 })
  }
  const testBlocks = config.hasRetestBlock ? [1, 2] : [1]
  for (const block of testBlocks) {
    const order = block === 2 ? rng.shuffle(pairs) : [...pairs]
    for (const p of order) {
      // گزینه‌های حواس‌پرتی از واژه‌های خارج از این جفت — ترتیب از بذر نشست
      const distractors = rng.sample(
        AP_WORDS.filter((w) => w !== p.cue && w !== p.target),
        config.choiceCount - 1,
      )
      const choices = rng.shuffle([p.target, ...distractors])
      plan.push({ ...p, phase: 'test', choices, correctIndex: choices.indexOf(p.target), block })
    }
  }
  return plan
}

export const associativePairsDefinition: ExerciseDefinition<
  AssociativePairsConfig,
  AssociativePairsState,
  AssociativePairsTrial,
  AssociativePairsAnswer
> = {
  id: ASSOCIATIVE_PAIRS_ID,
  version: ASSOCIATIVE_PAIRS_VERSION,
  contentVersion: ASSOCIATIVE_PAIRS_CONTENT_VERSION,
  domain: 'long-term-memory',

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
    const item = state.plan[state.nextTrialIndex] as AssociativePairsPlanItem
    const trial: AssociativePairsTrial = {
      trialIndex: state.nextTrialIndex,
      item,
      studyDisplayMs: state.config.studyDisplayMs,
      // مطالعه: پنجره = مدت نمایش (تماشا)؛ آزمون: بی‌مهلت (تشخیص خودآگاه)
      responseWindowMs: item.phase === 'study' ? state.config.studyDisplayMs : null,
    }
    return {
      state: { ...state, nextTrialIndex: trial.trialIndex + 1, currentTrial: trial },
      trial,
    }
  },

  submitAnswer(state, answer, reactionTimeMs) {
    const trial = state.currentTrial
    if (!trial) throw new Error('مرحله فعالی برای ثبت پاسخ وجود ندارد')
    const { item } = trial

    let record: RecordedTrial
    if (item.phase === 'study') {
      // تماشا — همیشه درست ثبت می‌شود تا در دقت بی‌اثر باشد
      record = {
        trialIndex: trial.trialIndex,
        stimulus: { phase: 'study', pairId: item.pairId, cue: item.cue, target: item.target },
        expected: null,
        given: null,
        outcome: 'correct',
        correct: true,
        reactionTimeMs: null,
      }
    } else {
      const correct = answer === item.correctIndex
      record = {
        trialIndex: trial.trialIndex,
        stimulus: { phase: 'test', block: item.block, pairId: item.pairId, cue: item.cue, target: item.target },
        expected: item.correctIndex,
        given: answer,
        outcome: correct ? 'correct' : answer === null ? 'omission' : 'incorrect',
        correct,
        reactionTimeMs,
      }
    }
    return { ...state, currentTrial: null, results: [...state.results, record] }
  },

  isComplete(state) {
    return state.results.length >= state.plan.length
  },

  getSummary(state): ExerciseSummary {
    const totals = summarizeOutcomes(state.results)
    const testResults = state.results.filter((r) => (r.stimulus as { phase?: string }).phase === 'test')
    const pct = (rs: readonly RecordedTrial[]) =>
      rs.length === 0 ? 0 : Math.round((rs.filter((r) => r.correct).length / rs.length) * 100)
    const firstBlock = testResults.filter((r) => (r.stimulus as { block?: number }).block === 1)
    const secondBlock = testResults.filter((r) => (r.stimulus as { block?: number }).block === 2)
    return {
      exerciseId: ASSOCIATIVE_PAIRS_ID,
      sessionId: state.sessionId,
      exerciseVersion: ASSOCIATIVE_PAIRS_VERSION,
      contentVersion: ASSOCIATIVE_PAIRS_CONTENT_VERSION,
      domain: 'long-term-memory',
      difficulty: state.config.difficulty,
      ...totals,
      metrics: {
        studiedPairs: state.config.pairCount,
        firstBlockAccuracy: pct(firstBlock),
        // سطح ۱و۲ بلوک دوباره ندارند — صفر گزارش می‌شود (برچسب توضیح می‌دهد)
        secondBlockAccuracy: pct(secondBlock),
      },
    }
  },
}
