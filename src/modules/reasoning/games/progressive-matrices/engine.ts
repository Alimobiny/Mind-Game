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
import { accuracyPercent, summarizeOutcomes } from '../../../../core/scoring/scoring'

/**
 * Progressive Matrices — ماتریس پیشرونده (استدلال)
 *
 * ماتریس ۳×۳ نمادهای چندصفته (شکل × رنگ × تعداد) که خانهٔ پایین-راست خالی
 * است و باید از میان گزینه‌ها کامل شود. هر صفت زیر یک قاعده از خانواده‌های
 * ریون است: توزیع-سه‌تایی (dist3)، پیشروی عددی (progression — فقط تعداد)،
 * عمل منطقی روی صفت (logicalOp: (بالا+چپ) mod ۳ با حاشیهٔ بذری)، و قاعدهٔ
 * موقعیتی (positional — نوار سطری/ستونی). دشواری = تعداد صفات غیرثابت
 * (۱→۳) + حضور عمل منطقی.
 *
 * یکتایی پاسخ «برحسب ساخت» است: ماتریس کاملاً با قواعد تعیین می‌شود، پس
 * خانهٔ ۹ یکتاست. حواس‌پرتی‌ها «نقض قاعده»اند: همان سلول با جایگزینی مقدار
 * یک (یا دو) صفت — همان طراحی حواس‌پرتی اصولی ریون.
 *
 * چرخش شکل، ۶ گزینه و مهلت پاسخ سطح بالا به contentVersion بعدی موکول‌اند.
 *
 * اقتباس از پارادایم ماتریس‌های پیشروندهٔ ریون (خانوادهٔ قواعد Carpenter,
 * Just & Shell 1990)؛ بدون دارایی بصری هیچ محصول تجاری.
 */

export type PmShape = 'circle' | 'square' | 'triangle'
export type PmColor = 'red' | 'blue' | 'green'

/** سلول ماتریس — همان سه‌گانهٔ زبان بصری تکمیل الگو (۲۷ ترکیب) */
export interface PmCell {
  readonly shape: PmShape
  readonly color: PmColor
  readonly count: number
}

export type PmRuleFamily = 'dist3' | 'progression' | 'logicalOp' | 'positional'
export type PmAttr = 'shape' | 'color' | 'count'
type PmFamily = PmRuleFamily | 'constant'

const SHAPES: readonly PmShape[] = ['circle', 'square', 'triangle']
const COLORS: readonly PmColor[] = ['red', 'blue', 'green']

/** قاعدهٔ یک صفت — پارامترها در ساخت پر می‌شوند؛ ارزیابی خالص است */
interface AttrRule {
  readonly family: PmFamily
  /** ثابت: مقدار ۰..۲ | positional/progression: 'row'|'col' */
  readonly param: number | 'row' | 'col' | null
  /** فقط logicalOp: جدول ۹تایی مقدارها */
  readonly table: readonly number[] | null
}

function valueAt(rule: AttrRule, row: number, col: number): number {
  switch (rule.family) {
    case 'constant':
      return rule.param as number
    case 'dist3':
      return (row + col) % 3
    case 'positional':
    case 'progression':
      return rule.param === 'row' ? row : col
    case 'logicalOp':
      return (rule.table as readonly number[])[row * 3 + col] as number
  }
}

export interface ProgressiveMatricesConfig extends ExerciseConfig {
  readonly totalTrials: number
  /** تعداد گزینه‌ها (پاسخ + حواس‌پرتی) */
  readonly optionCount: number
}

export interface ProgressiveMatricesState extends ExerciseState<ProgressiveMatricesConfig> {
  readonly currentTrial: ProgressiveMatricesTrial | null
}

export interface ProgressiveMatricesTrial extends ExerciseTrial {
  readonly matrix: readonly (PmCell | null)[]
  readonly answer: PmCell
  readonly options: readonly PmCell[]
  readonly correctIndex: number
  /** خانوادهٔ قاعدهٔ هر صفت — null یعنی ثابت */
  readonly rules: Readonly<Record<PmAttr, PmRuleFamily | null>>
  /** تعداد صفات غیرثابت = هم‌زمانی قواعد این مرحله */
  readonly nonConstantRules: number
}

export const PROGRESSIVE_MATRICES_ID = 'progressive-matrices'
export const PROGRESSIVE_MATRICES_VERSION = '1.0.0'
export const PROGRESSIVE_MATRICES_CONTENT_VERSION = '1'
const TOTAL_TRIALS = 12
const OPTION_COUNT = 4

/** تنظیمات سطح دشواری: تعداد صفات غیرثابت + الزام عمل منطقی */
export function configForDifficulty(difficulty: number): ProgressiveMatricesConfig {
  if (difficulty < 1 || difficulty > 5) {
    throw new RangeError('دشواری باید بین ۱ تا ۵ باشد')
  }
  return { difficulty, totalTrials: TOTAL_TRIALS, optionCount: OPTION_COUNT }
}

/** خانواده‌های مجاز هر صفت — پیشروی فقط برای تعداد (صفت عددی)، موقعیتی فقط شکل/رنگ */
const ELIGIBLE: Readonly<Record<PmAttr, readonly PmRuleFamily[]>> = {
  shape: ['dist3', 'positional', 'logicalOp'],
  color: ['dist3', 'positional', 'logicalOp'],
  count: ['dist3', 'progression', 'logicalOp'],
}

/** ساخت قاعدهٔ یک صفت با خانوادهٔ داده‌شده (پارامترها از بذر) */
function buildRule(rng: SeededRandom, family: PmRuleFamily): AttrRule {
  switch (family) {
    case 'dist3':
      return { family, param: null, table: null }
    case 'positional':
    case 'progression':
      return { family, param: rng.bool() ? 'row' : 'col', table: null }
    case 'logicalOp': {
      // حاشیهٔ بذری (سطر و ستون نخست) + جمع مُد ۳ برای بقیهٔ خانه‌ها
      const table = new Array<number>(9)
      for (let j = 0; j < 3; j += 1) table[j] = rng.int(0, 2)
      for (let i = 1; i < 3; i += 1) table[i * 3] = rng.int(0, 2)
      for (let i = 1; i < 3; i += 1) {
        for (let j = 1; j < 3; j += 1) {
          table[i * 3 + j] = ((table[(i - 1) * 3 + j] as number) + (table[i * 3 + j - 1] as number)) % 3
        }
      }
      return { family, param: null, table }
    }
  }
}

/**
 * ساخت قواعد مرحله — ترتیب صفات ثابت (شکل، رنگ، تعداد) تا خروجی قطعی باشد.
 * requireLogicalOp یک صفتِ مجاز را به عمل منطقی مجبور می‌کند.
 */
function buildRules(rng: SeededRandom, difficulty: number): Readonly<Record<PmAttr, AttrRule>> {
  const nonConstantCount = [1, 2, 2, 3, 3][difficulty - 1] as number
  const requireLogicalOp = difficulty >= 3 && difficulty % 2 === 1
  const attrs: PmAttr[] = ['shape', 'color', 'count']
  const active = nonConstantCount === 3 ? attrs : rng.sample(attrs, nonConstantCount)

  const rules: Partial<Record<PmAttr, AttrRule>> = {}
  let logicalAssigned = false
  if (requireLogicalOp) {
    const eligible = active.filter((a) => ELIGIBLE[a].includes('logicalOp'))
    const chosen = rng.pick(eligible)
    rules[chosen] = buildRule(rng, 'logicalOp')
    logicalAssigned = true
  }
  for (const attr of active) {
    if (rules[attr] !== undefined) continue
    // یک عمل منطقی در هر مرحله کافی است و از دشواری ۳ به بالا گشوده می‌شود
    const pool = ELIGIBLE[attr].filter(
      (f) =>
        (f !== 'logicalOp' || (!logicalAssigned && difficulty >= 3)) &&
        (difficulty > 1 || f === 'dist3' || f === 'progression'),
    )
    rules[attr] = buildRule(rng, rng.pick(pool))
  }
  for (const attr of attrs) {
    if (rules[attr] === undefined) {
      rules[attr] = { family: 'constant', param: rng.int(0, 2), table: null }
    }
  }
  return rules as Readonly<Record<PmAttr, AttrRule>>
}

/** ساخت حواس‌پرتی — همان پاسخ با نقض ۱ (یا ۲) صفت؛ در d4/d5 فقط ۱-تفاوت */
function buildDistractors(
  rng: SeededRandom,
  answer: PmCell,
  count: number,
  oneDiffOnly: boolean,
): PmCell[] {
  const swap = (cell: PmCell, attr: PmAttr, value: number): PmCell => ({
    shape: attr === 'shape' ? (SHAPES[value] as PmShape) : cell.shape,
    color: attr === 'color' ? (COLORS[value] as PmColor) : cell.color,
    count: attr === 'count' ? value + 1 : cell.count,
  })
  const indexOf = (cell: PmCell, attr: PmAttr): number =>
    attr === 'shape' ? SHAPES.indexOf(cell.shape) : attr === 'color' ? COLORS.indexOf(cell.color) : cell.count - 1

  const attrs: PmAttr[] = ['shape', 'color', 'count']
  const oneDiff: PmCell[] = []
  const twoDiff: PmCell[] = []
  for (const a of attrs) {
    const base = indexOf(answer, a)
    for (let v = 0; v < 3; v += 1) {
      if (v === base) continue
      oneDiff.push(swap(answer, a, v))
    }
  }
  for (let i = 0; i < attrs.length; i += 1) {
    for (let j = i + 1; j < attrs.length; j += 1) {
      const a = attrs[i] as PmAttr
      const b = attrs[j] as PmAttr
      const bi = indexOf(answer, a)
      const bj = indexOf(answer, b)
      for (let va = 0; va < 3; va += 1) {
        if (va === bi) continue
        for (let vb = 0; vb < 3; vb += 1) {
          if (vb === bj) continue
          twoDiff.push(swap(swap(answer, a, va), b, vb))
        }
      }
    }
  }
  const pool = oneDiffOnly ? oneDiff : [...oneDiff, ...twoDiff]
  return rng.sample(pool, count)
}

export const progressiveMatricesDefinition: ExerciseDefinition<
  ProgressiveMatricesConfig,
  ProgressiveMatricesState,
  ProgressiveMatricesTrial,
  number | null
> = {
  id: PROGRESSIVE_MATRICES_ID,
  version: PROGRESSIVE_MATRICES_VERSION,
  contentVersion: PROGRESSIVE_MATRICES_CONTENT_VERSION,
  domain: 'reasoning',

  createSession(sessionId, config, seed) {
    return { sessionId, config, seed, nextTrialIndex: 0, currentTrial: null, results: [] }
  },

  nextTrial(state) {
    if (state.nextTrialIndex >= state.config.totalTrials) {
      throw new Error('همه مراحل تولید شده‌اند')
    }
    const trialIndex = state.nextTrialIndex
    const rng = new SeededRandom(deriveTrialSeed(state.seed, trialIndex))
    const rules = buildRules(rng, state.config.difficulty)

    // ماتریس کاملاً با قواعد تعیین می‌شود — پاسخِ خانهٔ ۹ برحسب ساخت یکتاست
    const matrix: (PmCell | null)[] = []
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        matrix.push({
          shape: SHAPES[valueAt(rules.shape, row, col)],
          color: COLORS[valueAt(rules.color, row, col)],
          count: valueAt(rules.count, row, col) + 1,
        })
      }
    }
    const answer = matrix[8] as PmCell
    matrix[8] = null

    const distractors = buildDistractors(
      rng,
      answer,
      state.config.optionCount - 1,
      state.config.difficulty >= 4,
    )
    const options = rng.shuffle([answer, ...distractors])
    const families: Readonly<Record<PmAttr, PmRuleFamily | null>> = {
      shape: rules.shape.family === 'constant' ? null : (rules.shape.family as PmRuleFamily),
      color: rules.color.family === 'constant' ? null : (rules.color.family as PmRuleFamily),
      count: rules.count.family === 'constant' ? null : (rules.count.family as PmRuleFamily),
    }
    const trial: ProgressiveMatricesTrial = {
      trialIndex,
      matrix,
      answer,
      options,
      correctIndex: options.indexOf(answer),
      rules: families,
      nonConstantRules: [families.shape, families.color, families.count].filter(Boolean).length,
      // بازی غیرزمانی است — مثل تکمیل الگو
      responseWindowMs: null,
    }
    return { state: { ...state, nextTrialIndex: trialIndex + 1, currentTrial: trial }, trial }
  },

  submitAnswer(state, answer, reactionTimeMs) {
    const trial = state.currentTrial
    if (!trial) throw new Error('مرحله فعالی برای ثبت پاسخ وجود ندارد')
    const given = answer
    const correct = given !== null && given === trial.correctIndex
    const outcome: TrialOutcome = given === null ? 'omission' : correct ? 'correct' : 'incorrect'
    const record: RecordedTrial = {
      trialIndex: trial.trialIndex,
      stimulus: { rules: trial.rules, nonConstantRules: trial.nonConstantRules },
      expected: trial.correctIndex,
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
    const rulesOf = (r: RecordedTrial) => r.stimulus as { rules: Record<PmAttr, PmRuleFamily | null>; nonConstantRules: number }

    // امتیاز وزنی: دقت وزن‌گرفته با هم‌زمانی قواعد هر مرحله
    let weightSum = 0
    let weightedCorrect = 0
    const rts: number[] = []
    let maxRules = 0
    const byFamily = new Map<PmRuleFamily, { correct: number; total: number }>()
    for (const r of state.results) {
      const { rules, nonConstantRules } = rulesOf(r)
      weightSum += nonConstantRules
      if (r.correct) weightedCorrect += nonConstantRules
      maxRules = Math.max(maxRules, nonConstantRules)
      if (r.reactionTimeMs !== null) rts.push(r.reactionTimeMs)
      for (const family of [rules.shape, rules.color, rules.count]) {
        if (family === null) continue
        const bucket = byFamily.get(family) ?? { correct: 0, total: 0 }
        bucket.total += 1
        if (r.correct) bucket.correct += 1
        byFamily.set(family, bucket)
      }
    }
    const metrics: Record<string, number> = {
      maxSimultaneousRules: maxRules,
      difficultyWeightedScore:
        weightSum === 0 ? 0 : Math.round((weightedCorrect / weightSum) * 1000) / 10,
      meanRtMs:
        rts.length === 0 ? 0 : Math.round(rts.reduce((a, b) => a + b, 0) / rts.length),
    }
    // دقت هر خانواده فقط وقتی آن خانواده در جلسه رخ داده باشد (الگوی صداقت متریک)
    for (const family of ['dist3', 'progression', 'logicalOp', 'positional'] as const) {
      const bucket = byFamily.get(family)
      if (bucket === undefined) continue
      const key =
        family === 'dist3'
          ? 'accuracyDist3'
          : family === 'progression'
            ? 'accuracyProgression'
            : family === 'logicalOp'
              ? 'accuracyLogicalOp'
              : 'accuracyPositional'
      metrics[key] = accuracyPercent(bucket.correct, bucket.total)
    }
    return {
      exerciseId: PROGRESSIVE_MATRICES_ID,
      sessionId: state.sessionId,
      exerciseVersion: PROGRESSIVE_MATRICES_VERSION,
      contentVersion: PROGRESSIVE_MATRICES_CONTENT_VERSION,
      domain: 'reasoning',
      difficulty: state.config.difficulty,
      ...totals,
      metrics,
    }
  },
}
