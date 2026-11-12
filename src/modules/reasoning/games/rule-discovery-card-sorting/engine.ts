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
 * کارت‌بندی قاعده (Rule Discovery Card Sorting) — استدلال / انعطاف اجرایی؛
 * پیشنهاد ۶ سند پژوهش؛ اقتباس چارچوب آزمون دسته‌بندی کارت ویسکانسین،
 * بدون دارایی هیچ محصول تجاری.
 *
 * چهار کارت مرجع ثابت بالای صفحه (هر کدام ترکیبی یکتا از رنگ/شکل/تعداد)؛
 * کارت جدید پایین می‌آید و بازیکن آن را زیر یکی از چهار کارت مرجع می‌گذارد.
 * قاعدهٔ پنهان — رنگ، شکل یا تعداد — فقط از بازخورد درست/غلط کشف می‌شود و
 * پس از چند پاسخ درست متوالی، بی‌خبر عوض می‌شود.
 *
 * موتور حالت‌دار است — قاعدهٔ جاری و شمارندهٔ پاسخ‌های درست متوالی در وضعیت
 * بازی زنده می‌مانند و تعویض قاعده از تاریخچهٔ پاسخ‌ها تغذیه می‌شود (دقیقاً
 * مثل نگه‌داری تاریخچهٔ حروف در ان-بک؛ مجاز طبق قرارداد هسته). خود کارت‌ها
 * answer-independent از بذر مرحله ساخته می‌شوند: هر بُعد از فضای مقادیر
 * چهارگانه انتخاب می‌شود تا زیر هر قاعده دقیقاً یک کارت مرجع درست باشد.
 *
 * خطای پایدار — پاسخِ مطابق قاعدهٔ منقضی‌شده — متریک اصلی پژوهشی است.
 * سطح ۵ بازخورد احتمالیِ گاه‌گمراه‌کننده دارد؛ داوری داده خام همیشه با
 * قاعدهٔ واقعی است و بازخورد نمایشی جدا در محرک ثبت می‌شود.
 */

/** بُعدهای ممکن قاعده */
export type SortDimension = 'color' | 'shape' | 'count'

/** کارت — هر بُعد یکی از چهار مقدار (اندیس کارت مرجع همان بُعد) */
export interface CardStimulus {
  readonly color: number
  readonly shape: number
  readonly count: number
}

/** چهار کارت مرجع ثابت — کارت i روی هر سه بُعد مقدار i دارد */
export const REF_CARDS: readonly CardStimulus[] = [
  { color: 0, shape: 0, count: 0 },
  { color: 1, shape: 1, count: 1 },
  { color: 2, shape: 2, count: 2 },
  { color: 3, shape: 3, count: 3 },
]

export interface RuleDiscoveryConfig extends ExerciseConfig {
  readonly trialCount: number
  /** تعداد پاسخ درست متوالی لازم برای تعویض قاعده */
  readonly switchAfter: number
  /** ابعاد فعال — سطح ۱ دو بُعد، سطوح بالاتر سه بُعد */
  readonly dimensions: readonly SortDimension[]
  /** نرخ بازخورد گمراه‌کننده (فقط سطح ۵) */
  readonly misleadingFeedbackRate: number
  readonly responseWindowMs: number
  readonly feedbackMs: number
}

export interface RuleDiscoveryState extends ExerciseState<RuleDiscoveryConfig> {
  readonly currentTrial: RuleDiscoveryTrial | null
  readonly activeRule: SortDimension
  /** قاعدهٔ پیش از آخرین تعویض — برای شناسایی خطای پایدار */
  readonly previousRule: SortDimension | null
  readonly correctStreak: number
  readonly categoriesCompleted: number
  /** شمارهٔ مرحلهٔ نخستین دستهٔ کامل‌شده (۱-محور) یا null */
  readonly firstCategoryTrial: number | null
  readonly failureToMaintainSetCount: number
}

export interface RuleDiscoveryTrial extends ExerciseTrial {
  readonly trialIndex: number
  readonly card: CardStimulus
  /** برای نمایش و e2e — در UI به کاربر نشان داده نمی‌شود */
  readonly activeRule: SortDimension
  readonly correctPile: number
  readonly feedbackMs: number
}

/** پاسخ: اندیس کارت مرجین انتخابی (0..3)؛ null = بی‌پاسخ */
export type RuleDiscoveryAnswer = number | null

export const RULE_DISCOVERY_CARD_SORTING_ID = 'rule-discovery-card-sorting'
export const RULE_DISCOVERY_CARD_SORTING_VERSION = '1.0.0'
export const RULE_DISCOVERY_CARD_SORTING_CONTENT_VERSION = '1'

/** تعداد مراحل در همهٔ سطوح ثابت (قرارداد plannedTrials کاتالوگ) */
const TRIAL_COUNT = 36
const SWITCH_AFTER_BY_DIFFICULTY: readonly number[] = [5, 6, 7, 8, 10]
const DIMENSIONS_BY_DIFFICULTY: readonly (readonly SortDimension[])[] = [
  ['color', 'shape'],
  ['color', 'shape', 'count'],
  ['color', 'shape', 'count'],
  ['color', 'shape', 'count'],
  ['color', 'shape', 'count'],
]
const MISLEADING_RATE_BY_DIFFICULTY: readonly number[] = [0, 0, 0, 0, 0.15]
const RESPONSE_WINDOW_MS_BY_DIFFICULTY: readonly number[] = [8000, 7500, 7000, 6500, 6000]
const FEEDBACK_MS_BY_DIFFICULTY: readonly number[] = [700, 700, 600, 600, 600]

/** آستانهٔ «شکست در حفظ دسته» — خطا پس از این تعداد پاسخ درست متوالی */
const MAINTAIN_SET_STREAK_THRESHOLD = 3

export function configForDifficulty(difficulty: number): RuleDiscoveryConfig {
  if (difficulty < 1 || difficulty > 5) {
    throw new RangeError('دشواری باید بین ۱ تا ۵ باشد')
  }
  const level = difficulty - 1
  return {
    difficulty,
    trialCount: TRIAL_COUNT,
    switchAfter: SWITCH_AFTER_BY_DIFFICULTY[level] as number,
    dimensions: DIMENSIONS_BY_DIFFICULTY[level] as readonly SortDimension[],
    misleadingFeedbackRate: MISLEADING_RATE_BY_DIFFICULTY[level] as number,
    responseWindowMs: RESPONSE_WINDOW_MS_BY_DIFFICULTY[level] as number,
    feedbackMs: FEEDBACK_MS_BY_DIFFICULTY[level] as number,
  }
}

/** کارت مرجع درست برای یک کارت زیر قاعدهٔ داده‌شده */
export function correctPileFor(card: CardStimulus, rule: SortDimension): number {
  if (rule === 'color') return card.color
  if (rule === 'shape') return card.shape
  return card.count
}

/** بُعد بعدی در چرخهٔ ابعاد فعال */
function nextRule(dimensions: readonly SortDimension[], current: SortDimension): SortDimension {
  const index = dimensions.indexOf(current)
  const next = dimensions[(index + 1) % dimensions.length]
  return next as SortDimension
}

export const ruleDiscoveryCardSortingDefinition: ExerciseDefinition<
  RuleDiscoveryConfig,
  RuleDiscoveryState,
  RuleDiscoveryTrial,
  RuleDiscoveryAnswer
> = {
  id: RULE_DISCOVERY_CARD_SORTING_ID,
  version: RULE_DISCOVERY_CARD_SORTING_VERSION,
  contentVersion: RULE_DISCOVERY_CARD_SORTING_CONTENT_VERSION,
  domain: 'reasoning',

  createSession(sessionId, config, seed) {
    return {
      sessionId,
      config,
      seed,
      nextTrialIndex: 0,
      currentTrial: null,
      // قاعدهٔ آغازین همیشه بُعد اول (رنگ) — نقطهٔ شروع قطعی
      activeRule: config.dimensions[0] as SortDimension,
      previousRule: null,
      correctStreak: 0,
      categoriesCompleted: 0,
      firstCategoryTrial: null,
      failureToMaintainSetCount: 0,
      results: [],
    }
  },

  nextTrial(state) {
    if (state.nextTrialIndex >= state.config.trialCount) {
      throw new Error('همه مراحل جلسه تولید شده‌اند')
    }
    const rng = new SeededRandom(deriveTrialSeed(state.seed, state.nextTrialIndex))
    const card: CardStimulus = {
      color: rng.int(0, 3),
      shape: rng.int(0, 3),
      count: rng.int(0, 3),
    }
    const trial: RuleDiscoveryTrial = {
      trialIndex: state.nextTrialIndex,
      card,
      activeRule: state.activeRule,
      correctPile: correctPileFor(card, state.activeRule),
      feedbackMs: state.config.feedbackMs,
      responseWindowMs: state.config.responseWindowMs,
    }
    return {
      state: { ...state, nextTrialIndex: trial.trialIndex + 1, currentTrial: trial },
      trial,
    }
  },

  submitAnswer(state, answer, reactionTimeMs) {
    const trial = state.currentTrial
    if (!trial) throw new Error('مرحله فعلی برای ثبت پاسخ وجود ندارد')

    const isCorrect = answer !== null && answer === trial.correctPile

    // بازخورد نمایشی — در سطح ۵ با نرخ بذری گاهی وارونه می‌شود
    const rng = new SeededRandom(deriveTrialSeed(state.seed, trial.trialIndex) ^ 0x5eed)
    const misleading = rng.bool(state.config.misleadingFeedbackRate)
    const shownCorrect = misleading ? !isCorrect : isCorrect

    // خطای پایدار: پاسخ غلطِ مطابق کارتِ درستِ قاعدهٔ منقضی‌شده
    const perseverative =
      answer !== null &&
      !isCorrect &&
      state.previousRule !== null &&
      answer === correctPileFor(trial.card, state.previousRule)

    // منطق چرخهٔ قاعده — با صحتِ واقعی، نه بازخورد نمایشی
    let { activeRule, previousRule, correctStreak, categoriesCompleted, firstCategoryTrial, failureToMaintainSetCount } = state
    if (isCorrect) {
      correctStreak += 1
      if (correctStreak >= state.config.switchAfter) {
        categoriesCompleted += 1
        if (firstCategoryTrial === null) firstCategoryTrial = trial.trialIndex + 1
        previousRule = activeRule
        activeRule = nextRule(state.config.dimensions, activeRule)
        correctStreak = 0
      }
    } else {
      if (correctStreak >= MAINTAIN_SET_STREAK_THRESHOLD) failureToMaintainSetCount += 1
      correctStreak = 0
    }

    const record: RecordedTrial = {
      trialIndex: trial.trialIndex,
      stimulus: {
        card: trial.card,
        activeRule: trial.activeRule,
        correctPile: trial.correctPile,
        shownCorrect,
        misleading,
        perseverative,
      },
      expected: trial.correctPile,
      given: answer,
      outcome: answer === null ? 'omission' : isCorrect ? 'correct' : 'incorrect',
      correct: isCorrect,
      reactionTimeMs,
    }
    return {
      ...state,
      currentTrial: null,
      activeRule,
      previousRule,
      correctStreak,
      categoriesCompleted,
      firstCategoryTrial,
      failureToMaintainSetCount,
      results: [...state.results, record],
    }
  },

  isComplete(state) {
    return state.results.length >= state.config.trialCount
  },

  getSummary(state): ExerciseSummary {
    const totals = summarizeOutcomes(state.results)
    const perseverativeErrors = state.results.filter(
      (r) => (r.stimulus as { perseverative?: boolean }).perseverative === true,
    ).length
    return {
      exerciseId: RULE_DISCOVERY_CARD_SORTING_ID,
      sessionId: state.sessionId,
      exerciseVersion: RULE_DISCOVERY_CARD_SORTING_VERSION,
      contentVersion: RULE_DISCOVERY_CARD_SORTING_CONTENT_VERSION,
      domain: 'reasoning',
      difficulty: state.config.difficulty,
      ...totals,
      metrics: {
        categoriesCompleted: state.categoriesCompleted,
        perseverativeErrors,
        totalErrors: totals.incorrectTrials,
        trialsToFirstCategory: state.firstCategoryTrial ?? 0,
        failureToMaintainSet: state.failureToMaintainSetCount,
      },
    }
  },
}
