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
import { accuracyPercent, median, summarizeOutcomes } from '../../../../core/scoring/scoring'

/**
 * جابه‌جایی تکلیف (Task-Switching) — توجه و کنترل اجرایی
 *
 * پارادایم نشانه‌دار جابه‌جایی تکلیف (cued task-switching): نشانه‌ای بالای
 * صفحه می‌گوید این مرحله کدام بُعد شکل رنگی باید دسته‌بندی شود — «رنگ»
 * (آبی/قرمز)، «شکل» (دایره/مثلث) و در سطح ۵ «اندازه» (کوچک/بزرگ). نشانه
 * CSI میلی‌ثانیه پیش از محرک ظاهر می‌شود. پاسخ با دو دکمهٔ ثابت داده
 * می‌شود و دنبالهٔ نشانه‌ها (الگوی اجراهای متناوب رنگ،رنگ،شکل،شکل،…)
 * از بذر جلسه با نسبت جابه‌جایی هدفِ سطح دشواری ساخته می‌شود. هر مرحله
 * با پرچم isSwitch (نشانهٔ این مرحله ≠ نشانهٔ مرحلهٔ قبل) برچسب می‌خورد و
 * «هزینهٔ جابه‌جایی» = میانه RT مراحل جابه‌جایی منهای میانه RT مراحل
 * تکراری محاسبه می‌شود — متریک اصلی پژوهشی این تکلیف.
 *
 * اقتباس از پارادایم جابه‌جایی تکلیف با نشانه (Rogers & Monsell و
 * ادبیات تمرین تطبیقی بعدی)؛ بدون دارایی بصری هیچ محصول تجاری.
 */

// ---------------------------------------------------------------------------
// انواع اختصاصی
// ---------------------------------------------------------------------------

/** بُعدهای دسته‌بندی — سطح ۵ «اندازه» را هم اضافه می‌کند */
export type TaskDimension = 'color' | 'shape' | 'size'
export type TaskColor = 'blue' | 'red'
export type TaskShape = 'circle' | 'triangle'
export type TaskSize = 'small' | 'large'

/** سمت فیزیکی دکمهٔ پاسخ — در طول جلسه جابه‌جا نمی‌شود */
export type ResponseSide = 'right' | 'left'

/** پاسخ کاربر: سمت دکمه؛ null یعنی انقضای مهلت (بی‌پاسخی) */
export type TaskSwitchingAnswer = ResponseSide | null

export interface TaskSwitchingConfig extends ExerciseConfig {
  /** تعداد کل مراحل */
  readonly totalTrials: number
  /** نسبت هدف مراحل جابه‌جایی (۰.۲ تا ۰.۵) */
  readonly switchRatio: number
  /** فاصلهٔ نشانه تا محرک — cue-stimulus interval (ms) */
  readonly cueStimulusIntervalMs: number
  /** پنجرهٔ پاسخ از لحظهٔ ظاهرشدن محرک (ms) */
  readonly responseWindowMs: number
  /** ابعاد دسته‌بندی فعال این جلسه (۲ یا ۳ عضو) */
  readonly dimensions: readonly TaskDimension[]
}

export interface TaskSwitchingTrial extends ExerciseTrial {
  /** نشانهٔ این مرحله — بُعد مورد قضاوت */
  readonly dimension: TaskDimension
  readonly color: TaskColor
  readonly shape: TaskShape
  readonly size: TaskSize
  /** آیا نشانهٔ این مرحله با مرحلهٔ قبل فرق دارد (مرحلهٔ اول همیشه false) */
  readonly isSwitch: boolean
  /** ابعاد فعال جلسه — برای برچسب دکمه‌های ثابت در UI */
  readonly dimensions: readonly TaskDimension[]
  readonly cueStimulusIntervalMs: number
  /** مهلت از شروع مرحله (ظاهرشدن نشانه) = CSI + پنجرهٔ پاسخ محرک */
  readonly responseWindowMs: number
}

export interface TaskSwitchingState extends ExerciseState<TaskSwitchingConfig> {
  readonly currentTrial: TaskSwitchingTrial | null
}

// ---------------------------------------------------------------------------
// ثابت‌ها و نگاشت پاسخ
// ---------------------------------------------------------------------------

export const TASK_SWITCHING_ID = 'task-switching'
export const TASK_SWITCHING_VERSION = '1.0.0'
export const TASK_SWITCHING_CONTENT_VERSION = '1'
const TOTAL_TRIALS = 40

/** برچسب فارسی هر بُعد — متن نشانهٔ بالای صفحه */
export const DIMENSION_LABELS_FA: Readonly<Record<TaskDimension, string>> = {
  color: 'رنگ',
  shape: 'شکل',
  size: 'اندازه',
}

/** برچسب فارسی مقادیر محرک — برای دکمه‌های پاسخ ثابت */
export const VALUE_LABELS_FA: Readonly<
  Record<TaskColor | TaskShape | TaskSize, string>
> = {
  blue: 'آبی',
  red: 'قرمز',
  circle: 'دایره',
  triangle: 'مثلث',
  small: 'کوچک',
  large: 'بزرگ',
}

/**
 * نگاشت پاسخِ ثابتِ کل جلسه (pure switch-cost بدون یادگیری نگاشت جدید):
 * هر «اولین مقدارِ» هر بُعد → دکمهٔ راست؛ مقدار دوم → دکمهٔ چپ.
 *   رنگ: آبی→راست، قرمز→چپ · شکل: دایره→راست، مثلث→چپ · اندازه: کوچک→راست، بزرگ→چپ
 * یعنی دکمهٔ راست = «آبی / دایره / کوچک» و دکمهٔ چپ = «قرمز / مثلث / بزرگ».
 */
const CORRECT_SIDE: Readonly<Record<TaskColor | TaskShape | TaskSize, ResponseSide>> = {
  blue: 'right',
  red: 'left',
  circle: 'right',
  triangle: 'left',
  small: 'right',
  large: 'left',
}

/** پاسخ درست هر مرحله از روی نشانه و محتوای محرک — قابل استنتاج برای هر آزمون */
export function correctSideForTrial(trial: {
  readonly dimension: TaskDimension
  readonly color: TaskColor
  readonly shape: TaskShape
  readonly size: TaskSize
}): ResponseSide {
  switch (trial.dimension) {
    case 'color':
      return CORRECT_SIDE[trial.color]
    case 'shape':
      return CORRECT_SIDE[trial.shape]
    case 'size':
      return CORRECT_SIDE[trial.size]
  }
}

const COLORS: readonly TaskColor[] = ['blue', 'red']
const SHAPES: readonly TaskShape[] = ['circle', 'triangle']
const SIZES: readonly TaskSize[] = ['small', 'large']

// ---------------------------------------------------------------------------
// دشواری
// ---------------------------------------------------------------------------

/** نسبت جابه‌جایی، CSI و پنجرهٔ پاسخ برای دشواری ۱..۵ — آرایه تا مقادیر دقیق بمانند */
const SWITCH_RATIOS = [0.2, 0.3, 0.35, 0.4, 0.5] as const
const CSI_MS = [900, 725, 550, 375, 200] as const
const RESPONSE_WINDOWS_MS = [4000, 3550, 3100, 2650, 2200] as const

/** تنظیمات سطح دشواری: نسبت جابه‌جایی بیشتر، CSI و پنجرهٔ پاسخ کوتاه‌تر؛ سطح ۵ سه‌بُعدی */
export function configForDifficulty(difficulty: number): TaskSwitchingConfig {
  if (difficulty < 1 || difficulty > 5) {
    throw new RangeError('دشواری باید بین ۱ تا ۵ باشد')
  }
  const level = difficulty - 1
  return {
    difficulty,
    totalTrials: TOTAL_TRIALS,
    switchRatio: SWITCH_RATIOS[level],
    cueStimulusIntervalMs: CSI_MS[level],
    responseWindowMs: RESPONSE_WINDOWS_MS[level],
    dimensions: difficulty >= 5 ? ['color', 'shape', 'size'] : ['color', 'shape'],
  }
}

// ---------------------------------------------------------------------------
// مولد دنبالهٔ نشانه‌ها (الگوی اجراهای متناوب با نسبت جابه‌جایی دقیق)
// ---------------------------------------------------------------------------

/**
 * دنبالهٔ نشانهٔ کل جلسه — تابعی خالص از (seed، تنظیمات).
 *
 * ساختار: تعداد جابه‌جایی هدف S = round(totalTrials × switchRatio) →
 * جلسه به S+1 «اجرا» (run) تقسیم می‌شود؛ هر اجرا یک بُعد را تکرار می‌کند و
 * گذر از اجرایی به اجرای بعدی همان جابه‌جایی است. طول اجراها به‌گونه‌ای
 * پخش می‌شود که مجموع دقیقاً totalTrials شود (پخشِ تصادفی با بذر، تا
 * الگو قابل پیش‌بینی نباشد). بُعد هر اجرا تصادفی و متفاوت از اجرای قبل
 * است. خروجی تضمین می‌کند نسبت جابه‌جایی دقیقاً هدف باشد و هم مرحلهٔ
 * جابه‌جایی و هم تکراری وجود داشته باشد.
 */
export function planCueSequence(
  seed: number,
  totalTrials: number,
  dimensions: readonly TaskDimension[],
  switchRatio: number,
): TaskDimension[] {
  if (totalTrials < 2) throw new RangeError('totalTrials باید حداقل ۲ باشد')
  if (dimensions.length < 2) throw new RangeError('حداقل دو بُعد لازم است')
  const rng = new SeededRandom(seed)

  // حداقل ۱ جابه‌جایی و حداقل ۱ مرحلهٔ تکراری تضمین شود
  const switchCount = Math.min(Math.max(Math.round(totalTrials * switchRatio), 1), totalTrials - 2)
  const runCount = switchCount + 1
  const baseLength = Math.floor(totalTrials / runCount)
  const remainder = totalTrials % runCount
  // پخش تصادفی طول اجراها (مجموع دقیق) — الگوی «همهٔ بلندها اول» رخ ندهد
  const runLengths = rng.shuffle(
    Array.from({ length: runCount }, (_, i) => (i < remainder ? baseLength + 1 : baseLength)),
  )

  const cues: TaskDimension[] = []
  let current = rng.pick(dimensions)
  for (const runLength of runLengths) {
    for (let i = 0; i < runLength; i++) cues.push(current)
    const others = dimensions.filter((d) => d !== current)
    current = others.length === 1 ? others[0] : rng.pick(others)
  }
  return cues.slice(0, totalTrials)
}

// ---------------------------------------------------------------------------
// تعریف بازی
// ---------------------------------------------------------------------------

export const taskSwitchingDefinition: ExerciseDefinition<
  TaskSwitchingConfig,
  TaskSwitchingState,
  TaskSwitchingTrial,
  TaskSwitchingAnswer
> = {
  id: TASK_SWITCHING_ID,
  version: TASK_SWITCHING_VERSION,
  contentVersion: TASK_SWITCHING_CONTENT_VERSION,
  domain: 'attention-control',

  createSession(sessionId, config, seed) {
    return { sessionId, config, seed, nextTrialIndex: 0, currentTrial: null, results: [] }
  },

  nextTrial(state) {
    if (state.nextTrialIndex >= state.config.totalTrials) {
      throw new Error('همه مراحل تولید شده‌اند')
    }
    const trialIndex = state.nextTrialIndex
    // دنبالهٔ نشانه‌ها تابعی خالص از بذر و تنظیمات است — هر فراخوانی همان
    // دنباله را می‌ساند؛ محرک هر مرحله از بذر اختصاصی همان مرحله می‌آید
    const plan = planCueSequence(
      state.seed,
      state.config.totalTrials,
      state.config.dimensions,
      state.config.switchRatio,
    )
    const dimension = plan[trialIndex]
    const previousDimension = trialIndex > 0 ? plan[trialIndex - 1] : null
    const rng = new SeededRandom(deriveTrialSeed(state.seed, trialIndex))
    const trial: TaskSwitchingTrial = {
      trialIndex,
      dimension,
      color: rng.pick(COLORS),
      shape: rng.pick(SHAPES),
      size: rng.pick(SIZES),
      isSwitch: previousDimension !== null && previousDimension !== dimension,
      dimensions: state.config.dimensions,
      cueStimulusIntervalMs: state.config.cueStimulusIntervalMs,
      // ساعت مرحله با ظاهرشدن نشانه شروع می‌شود؛ مهلت کل = CSI + پنجرهٔ محرک
      responseWindowMs: state.config.cueStimulusIntervalMs + state.config.responseWindowMs,
    }
    return { state: { ...state, nextTrialIndex: trialIndex + 1, currentTrial: trial }, trial }
  },

  submitAnswer(state, answer, reactionTimeMs) {
    const trial = state.currentTrial
    if (!trial) throw new Error('محرک فعالی برای ثبت پاسخ وجود ندارد')
    const expected = correctSideForTrial(trial)
    const stimulus = {
      dimension: trial.dimension,
      color: trial.color,
      shape: trial.shape,
      size: trial.size,
      isSwitch: trial.isSwitch,
    }
    let record: RecordedTrial
    if (answer === expected) {
      record = {
        trialIndex: trial.trialIndex,
        stimulus,
        expected,
        given: answer,
        outcome: 'correct',
        correct: true,
        reactionTimeMs,
      }
    } else if (answer === null) {
      record = {
        // انقضای مهلت: بی‌پاسخی (omission) — الگوی برو/نرو
        trialIndex: trial.trialIndex,
        stimulus,
        expected,
        given: null,
        outcome: 'omission',
        correct: false,
        reactionTimeMs: null,
      }
    } else {
      record = {
        trialIndex: trial.trialIndex,
        stimulus,
        expected,
        given: answer,
        outcome: 'incorrect',
        correct: false,
        reactionTimeMs,
      }
    }
    return { ...state, currentTrial: null, results: [...state.results, record] }
  },

  isComplete(state) {
    return state.results.length >= state.config.totalTrials
  },

  getSummary(state): ExerciseSummary {
    const totals = summarizeOutcomes(state.results)
    // ساعت RT با ظاهرشدن «نشانه» شروع می‌شود؛ CSI در کل جلسه ثابت است،
    // پس برای گزارش استانداردِ قفل‌شده بر محرک، CSI از RT کم می‌شود
    // (هزینهٔ جابه‌جایی به‌هرحال از تفاضل دو میانه بی‌اثرِ CSI است).
    // پاسخ پیش از محرک (RT < CSI) به 0 محدود می‌شود.
    const csi = state.config.cueStimulusIntervalMs
    const stimulusLockedRt = (results: readonly RecordedTrial[]): number[] =>
      results
        .filter((r) => r.correct)
        .map((r) => r.reactionTimeMs)
        .filter((rt): rt is number => rt !== null)
        .map((rt) => Math.max(0, rt - csi))
    const isSwitchOf = (r: RecordedTrial): boolean =>
      (r.stimulus as { isSwitch: boolean }).isSwitch
    const switchResults = state.results.filter(isSwitchOf)
    const repeatResults = state.results.filter((r) => !isSwitchOf(r))
    const medianRepeat = median(stimulusLockedRt(repeatResults))
    const medianSwitch = median(stimulusLockedRt(switchResults))
    return {
      exerciseId: TASK_SWITCHING_ID,
      sessionId: state.sessionId,
      exerciseVersion: TASK_SWITCHING_VERSION,
      contentVersion: TASK_SWITCHING_CONTENT_VERSION,
      domain: 'attention-control',
      difficulty: state.config.difficulty,
      ...totals,
      metrics: {
        rtRepeatMs: Math.round(medianRepeat ?? 0),
        rtSwitchMs: Math.round(medianSwitch ?? 0),
        // هزینهٔ جابه‌جایی = میانه RT جابه‌جایی − میانه RT تکراری (هر دو درست‌پاسخ)
        // اگر یکی از زیرمجموعه‌ها پاسخ درست نداشته باشد، هزینه تعریف‌شده نیست → 0
        switchCostMs:
          medianRepeat !== null && medianSwitch !== null
            ? Math.round(medianSwitch - medianRepeat)
            : 0,
        switchAccuracy: accuracyPercent(
          switchResults.filter((r) => r.correct).length,
          switchResults.length,
        ),
        repeatAccuracy: accuracyPercent(
          repeatResults.filter((r) => r.correct).length,
          repeatResults.length,
        ),
        switchTrials: switchResults.length,
        repeatTrials: repeatResults.length,
      },
    }
  },
}
