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
 * Pattern Completion — تکمیل الگو (حوزه استدلال)
 *
 * ماتریس ۳×۳ از خانه‌های انتزاعی (شکل + رنگ + تعداد) که بر اساس یک قاعده
 * از چهار خانواده قاعده چیده شده‌اند؛ خانه پایین-راست خالی است و کاربر باید
 * خانه کامل‌کننده را از میان ۴ گزینه انتخاب کند. هر خانواده قاعده به‌ساخت
 * (by construction) فقط یک پاسخ یکتا دارد.
 *
 * اقتباس از طرح ماتریس‌های پیشرونده (سبک آزمون‌های ماتریسی) با محتوای
 * هندسی انتزاعی؛ بدون استفاده از دارایی بصری هیچ محصول تجاری.
 */

/** یک خانه الگو — serialize-friendly و قابل رندر با SVG/CSS */
export interface PatternCell {
  readonly shape: 'circle' | 'square' | 'triangle'
  readonly color: 'red' | 'blue' | 'green' | 'yellow'
  readonly count: 1 | 2 | 3
}

/** برچسب فارسی رنگ‌ها — برای دسترس‌پذیری UI */
export const PATTERN_COLORS_FA: Readonly<Record<PatternCell['color'], string>> = {
  red: 'قرمز',
  blue: 'آبی',
  green: 'سبز',
  yellow: 'زرد',
}

export const PATTERN_SHAPES: readonly PatternCell['shape'][] = ['circle', 'square', 'triangle']
export const PATTERN_COLORS: readonly PatternCell['color'][] = ['red', 'blue', 'green', 'yellow']
export const PATTERN_COUNTS: readonly PatternCell['count'][] = [1, 2, 3]

/** خانواده‌های قاعده — به ترتیب ساده → دشوار */
export type PatternRuleFamily =
  | 'count-progression'
  | 'color-progression'
  | 'shape-per-row'
  | 'rotation-like'

export const PATTERN_RULE_FAMILIES: readonly PatternRuleFamily[] = [
  'count-progression',
  'color-progression',
  'shape-per-row',
  'rotation-like',
]

export interface PatternCompletionConfig extends ExerciseConfig {
  /** تعداد کل مراحل جلسه */
  readonly totalTrials: number
  /** خانواده‌های قاعده مجاز در این دشواری (پیشوندی از فهرست خانواده‌ها) */
  readonly allowedFamilies: readonly PatternRuleFamily[]
  /** حداکثر(و دقیقاً) تعداد ویژگی متفاوت حواس‌پرتی‌ها با پاسخ: ۱ یا ۲ */
  readonly distractorAttributeDiffs: 1 | 2
}

export interface PatternCompletionTrial extends ExerciseTrial {
  /** خانواده قاعده این پازل — برای متریک تنوع و تحلیل نتایج */
  readonly family: PatternRuleFamily
  /** ۹ خانه ماتریس (row-major)؛ خانه پایین-راست (نمایه ۸) null است */
  readonly matrix: readonly (PatternCell | null)[]
  /** خانه کامل‌کننده — پاسخ درست طبق قاعده */
  readonly answer: PatternCell
  /** ۴ گزینه (شامل پاسخ) به‌هم‌ریخته */
  readonly options: readonly PatternCell[]
  /** نمایه پاسخ در آرایه options — اعتبارسنجی: given === correctIndex */
  readonly correctIndex: number
  /** بازی غیرزمانی است؛ پنجره پاسخی وجود ندارد */
  readonly responseWindowMs: null
}

export interface PatternCompletionState extends ExerciseState<PatternCompletionConfig> {
  readonly currentTrial: PatternCompletionTrial | null
}

/** پاسخ کاربر: نمایه گزینه ۰..۳؛ null یعنی بی‌پاسخی */
export type PatternCompletionAnswer = number | null

export const PATTERN_COMPLETION_ID = 'pattern-completion'
export const PATTERN_COMPLETION_VERSION = '1.0.0'
export const PATTERN_COMPLETION_CONTENT_VERSION = '1'
const TOTAL_TRIALS = 12
const OPTION_COUNT = 4
const EMPTY_CELL_INDEX = 8

/**
 * تنظیمات سطح دشواری ۱..۵:
 *  ۱ → فقط خانواده ۱؛ ۲ → خانواده ۱-۲؛ ۳ → ۱-۳؛ ۴ و ۵ → هر چهار خانواده.
 *  در سطح ۴ و ۵ حواس‌پرتی‌ها به‌جای ۱ ویژگی، در ۲ ویژگی با پاسخ فرق می‌کنند
 *  (تشخیص گزینه درست سخت‌تر می‌شود).
 */
export function configForDifficulty(difficulty: number): PatternCompletionConfig {
  if (difficulty < 1 || difficulty > 5) {
    throw new RangeError('دشواری باید بین ۱ تا ۵ باشد')
  }
  const familyCount = Math.min(difficulty, PATTERN_RULE_FAMILIES.length)
  return {
    difficulty,
    totalTrials: TOTAL_TRIALS,
    allowedFamilies: PATTERN_RULE_FAMILIES.slice(0, familyCount),
    distractorAttributeDiffs: difficulty >= 4 ? 2 : 1,
  }
}

/**
 * ساخت قاعده خانواده به‌همراه پارامترهای تصادفی‌اش. تابع برگشتی خانه
 * (row, col) را می‌سازد؛ row و col هر دو ۰..۲ هستند.
 */
function buildFamilyRule(
  family: PatternRuleFamily,
  rng: SeededRandom,
): (row: number, col: number) => PatternCell {
  switch (family) {
    // ۱) پیشرفت تعداد: در هر ردیف از چپ به راست +۱ (چرخشی در بازه ۱..۳ تا
    //    دامنه نوع count حفظ شود)؛ ردیف r از مقدار r+1 شروع می‌شود.
    //    شکل و رنگ در کل پازل ثابت‌اند.
    case 'count-progression': {
      const shape = rng.pick(PATTERN_SHAPES)
      const color = rng.pick(PATTERN_COLORS)
      return (row, col) => ({
        shape,
        color,
        count: (((row + col) % 3) + 1) as PatternCell['count'],
      })
    }
    // ۲) پیشرفت رنگ: نمایه رنگ در هر ردیف +۱ شیفت پیدا می‌کند؛
    //    خانه (r, c) → رنگ[(r+c) % 4]. شکل و تعداد ثابت‌اند.
    case 'color-progression': {
      const shape = rng.pick(PATTERN_SHAPES)
      const count = rng.pick(PATTERN_COUNTS)
      return (row, col) => ({ shape, color: PATTERN_COLORS[(row + col) % 4], count })
    }
    // ۳) شکلِ هر ردیف: هر ردیف شکل مخصوص خودش را دارد؛ تعداد در طول ردیف
    //    از ۱ به ۳ زیاد می‌شود؛ همه خانه‌ها یک رنگ دارند.
    case 'shape-per-row': {
      const color = rng.pick(PATTERN_COLORS)
      const rowShapes = rng.shuffle(PATTERN_SHAPES)
      return (row, col) => ({
        shape: rowShapes[row] as PatternCell['shape'],
        color,
        count: (col + 1) as PatternCell['count'],
      })
    }
    // ۴) چرخش‌مانند: شکل در هر ردیف دایره→مربع→مثلث می‌چرخد (چیدمان مربع
    //    لاتین با نمایه (r+c)%3)؛ رنگ فقط به ستون وابسته است (چرخشی در
    //    طول ستون‌ها)؛ تعداد ثابت است.
    case 'rotation-like': {
      const count = rng.pick(PATTERN_COUNTS)
      return (row, col) => ({
        shape: PATTERN_SHAPES[(row + col) % 3],
        color: PATTERN_COLORS[col % 4],
        count,
      })
    }
  }
}

/** تعداد ویژگی‌های متفاوت دو خانه (شکل، رنگ، تعداد) */
function attributeDiff(a: PatternCell, b: PatternCell): number {
  return (a.shape !== b.shape ? 1 : 0) + (a.color !== b.color ? 1 : 0) + (a.count !== b.count ? 1 : 0)
}

/**
 * استخر همه خانه‌های ممکن که «دقیقاً diff» ویژگی با پاسخ دارند.
 * چون همه ۳۶ ترکیب (۳ شکل × ۴ رنگ × ۳ تعداد) فهرست می‌شوند، عناصر
 * استخر ذاتاً یکتا هستند؛ نمونه‌گیری ۳تایی همیشه ممکن است
 * (اندازه استخر: diff=1 → ۷، diff=2 → ۱۶).
 */
function distractorPool(answer: PatternCell, diff: 1 | 2): PatternCell[] {
  const pool: PatternCell[] = []
  for (const shape of PATTERN_SHAPES) {
    for (const color of PATTERN_COLORS) {
      for (const count of PATTERN_COUNTS) {
        const candidate: PatternCell = { shape, color, count }
        if (attributeDiff(candidate, answer) === diff) pool.push(candidate)
      }
    }
  }
  return pool
}

export const patternCompletionDefinition: ExerciseDefinition<
  PatternCompletionConfig,
  PatternCompletionState,
  PatternCompletionTrial,
  PatternCompletionAnswer
> = {
  id: PATTERN_COMPLETION_ID,
  version: PATTERN_COMPLETION_VERSION,
  contentVersion: PATTERN_COMPLETION_CONTENT_VERSION,
  domain: 'reasoning',

  createSession(sessionId, config, seed) {
    return { sessionId, config, seed, nextTrialIndex: 0, currentTrial: null, results: [] }
  },

  nextTrial(state) {
    if (state.nextTrialIndex >= state.config.totalTrials) {
      throw new Error('همه محرک‌ها تولید شده‌اند')
    }
    const trialIndex = state.nextTrialIndex
    const rng = new SeededRandom(deriveTrialSeed(state.seed, trialIndex))
    const family = rng.pick(state.config.allowedFamilies)
    // ماتریس کامل طبق قاعده؛ خانه ۸ پاسخ یکتای قاعده است
    const rule = buildFamilyRule(family, rng)
    const full: PatternCell[] = []
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) full.push(rule(row, col))
    }
    const answer = full[EMPTY_CELL_INDEX] as PatternCell
    const matrix: readonly (PatternCell | null)[] = full.map((cell, i) =>
      i === EMPTY_CELL_INDEX ? null : cell,
    )
    // حواس‌پرتی‌ها + به‌هم‌ریختن گزینه‌ها و پیش‌محاسبه نمایه پاسخ
    const distractors = rng.sample(
      distractorPool(answer, state.config.distractorAttributeDiffs),
      OPTION_COUNT - 1,
    )
    const options = rng.shuffle([answer, ...distractors])
    const correctIndex = options.findIndex((option) => attributeDiff(option, answer) === 0)
    const trial: PatternCompletionTrial = {
      trialIndex,
      family,
      matrix,
      answer,
      options,
      correctIndex,
      responseWindowMs: null,
    }
    return { state: { ...state, nextTrialIndex: trialIndex + 1, currentTrial: trial }, trial }
  },

  submitAnswer(state, answer, reactionTimeMs) {
    const trial = state.currentTrial
    if (!trial) throw new Error('محرک فعلی برای ثبت پاسخ وجود ندارد')
    // خانواده قاعده هم در محرک ثبت می‌شود تا متریک تنوع از داده خام قابل محاسبه باشد
    const stimulus = { matrix: trial.matrix, family: trial.family }
    const correct = answer !== null && answer === trial.correctIndex
    const record: RecordedTrial = correct
      ? {
          trialIndex: trial.trialIndex,
          stimulus,
          expected: trial.correctIndex,
          given: answer,
          outcome: 'correct',
          correct: true,
          reactionTimeMs,
        }
      : answer === null
        ? {
            // بی‌پاسخی: در این بازی فقط از مسیر انقضای مهلت/تزریق بیرونی می‌رسد
            trialIndex: trial.trialIndex,
            stimulus,
            expected: trial.correctIndex,
            given: null,
            outcome: 'omission',
            correct: false,
            reactionTimeMs: null,
          }
        : {
            trialIndex: trial.trialIndex,
            stimulus,
            expected: trial.correctIndex,
            given: answer,
            outcome: 'incorrect',
            correct: false,
            reactionTimeMs,
          }
    return { ...state, currentTrial: null, results: [...state.results, record] }
  },

  isComplete(state) {
    return state.results.length >= state.config.totalTrials
  },

  getSummary(state): ExerciseSummary {
    const totals = summarizeOutcomes(state.results)
    // تنوع خانواده‌های دیده‌شده در جلسه — از خانواده ثبت‌شده در محرک خام
    const families = new Set<PatternRuleFamily>()
    for (const record of state.results) {
      families.add((record.stimulus as { family: PatternRuleFamily }).family)
    }
    // امتیاز وزن‌دار به دشواری: فقط پاسخ‌های درست، هر کدام به‌اندازه سطح
    const difficultyWeightedScore = state.results.reduce(
      (sum, record) => sum + (record.correct ? state.config.difficulty : 0),
      0,
    )
    return {
      exerciseId: PATTERN_COMPLETION_ID,
      sessionId: state.sessionId,
      exerciseVersion: PATTERN_COMPLETION_VERSION,
      contentVersion: PATTERN_COMPLETION_CONTENT_VERSION,
      domain: 'reasoning',
      difficulty: state.config.difficulty,
      ...totals,
      metrics: {
        ruleFamilyVariety: families.size,
        difficultyWeightedScore,
      },
    }
  },
}
