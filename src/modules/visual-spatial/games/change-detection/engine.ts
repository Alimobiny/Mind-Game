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
 * Change Detection — تشخیص تغییر (دیداری-فضایی)
 *
 * آرایه‌ای از مربع‌های رنگی کوتاه دیده می‌شود؛ پس از فاصلهٔ خالی، همان
 * آرایه دوباره می‌آید که یکی از رنگ‌ها «ممکن است» تغییر کرده باشد.
 * بازیکن فقط دوداوری می‌کند: تغییر کرد / تغییر نکرد — قاب قراردادی
 * برو/نرو با بار حافظهٔ دیداری.
 *
 * متریک k (ظرفیت حافظهٔ کاری دیداری) با فرمول استانداردِ تصحیح حدس
 * محاسبه می‌شود: k = اندازهٔ آرایه × (نرخ درستی − نرخ زنگ خطر) —
 * توضیح این فرمول در متادیتای بازی آمده است (قید سند پژوهش).
 *
 * نسخهٔ مکان‌یابی («کدام خانه تغییر کرد» — سطح بالا) به contentVersion
 * بعدی موکول شده است.
 *
 * اقتباس از پارادایم Luck & Vogel در ادبیات حافظهٔ دیداری؛
 * بدون دارایی بصری هیچ محصول تجاری.
 */

/** کلیدهای پالت — نگاشت CSS در کامپوننت است؛ موتور خالص می‌ماند */
export const CD_PALETTE = [
  'sky',
  'rose',
  'amber',
  'emerald',
  'violet',
  'cyan',
  'orange',
  'pink',
  'lime',
  'scarlet',
] as const

export type CdColor = (typeof CD_PALETTE)[number]

export interface ChangeDetectionConfig extends ExerciseConfig {
  readonly totalTrials: number
  /** تعداد مربع‌های آرایه */
  readonly arraySize: number
  /** مدت نمایش آرایهٔ نمونه (ms) */
  readonly displayMs: number
  /** فاصلهٔ خالی بین نمونه و آزمون (ms) */
  readonly blankMs: number
}

export interface ChangeDetectionState extends ExerciseState<ChangeDetectionConfig> {
  readonly currentTrial: ChangeDetectionTrial | null
}

export interface ChangeDetectionTrial extends ExerciseTrial {
  /** خانه‌های فعال شبکهٔ ۳×۳ (۰..۸) — مرتب */
  readonly positions: readonly number[]
  /** رنگ نمونه، هم‌تراز با positions */
  readonly colors: readonly CdColor[]
  /** آیا در آرایهٔ آزمون رنگی عوض شده؟ */
  readonly changed: boolean
  /** اندیسِ درون positions خانهٔ تغییرکرده — فقط وقتی changed */
  readonly changedIndex: number | null
  /** رنگ جدید در آرایهٔ آزمون — فقط وقتی changed */
  readonly testColor: CdColor | null
  readonly displayMs: number
  readonly blankMs: number
}

/** دوداوری بازیکن: تغییر کرد / تغییر نکرد */
export type ChangeDetectionAnswer = 'changed' | 'unchanged'

export const CHANGE_DETECTION_ID = 'change-detection'
export const CHANGE_DETECTION_VERSION = '1.0.0'
export const CHANGE_DETECTION_CONTENT_VERSION = '1'
const TOTAL_TRIALS = 16

/** اندازهٔ آرایه و فاصلهٔ خالی با دشواری بالا می‌روند: ۲→۸ مربع، ۹۰۰→۱۵۰۰ms */
export function configForDifficulty(difficulty: number): ChangeDetectionConfig {
  if (difficulty < 1 || difficulty > 5) {
    throw new RangeError('دشواری باید بین ۱ تا ۵ باشد')
  }
  const arraySize = [2, 3, 4, 6, 8][difficulty - 1] as number
  return {
    difficulty,
    totalTrials: TOTAL_TRIALS,
    arraySize,
    displayMs: 500,
    blankMs: 900 + (difficulty - 1) * 150,
  }
}

export const changeDetectionDefinition: ExerciseDefinition<
  ChangeDetectionConfig,
  ChangeDetectionState,
  ChangeDetectionTrial,
  ChangeDetectionAnswer | null
> = {
  id: CHANGE_DETECTION_ID,
  version: CHANGE_DETECTION_VERSION,
  contentVersion: CHANGE_DETECTION_CONTENT_VERSION,
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
    const { arraySize } = state.config
    const positions = [...rng.sample([0, 1, 2, 3, 4, 5, 6, 7, 8], arraySize)].sort((a, b) => a - b)
    const colors = rng.sample(CD_PALETTE, arraySize)
    const changed = rng.bool(0.5)
    let changedIndex: number | null = null
    let testColor: CdColor | null = null
    if (changed) {
      changedIndex = rng.int(0, arraySize - 1)
      // رنگ جدید از خارجِ رنگ‌های نمونه — تغییر بی‌ابهام
      const used = new Set(colors)
      testColor = rng.pick(CD_PALETTE.filter((c) => !used.has(c)))
    }
    const trial: ChangeDetectionTrial = {
      trialIndex,
      positions,
      colors,
      changed,
      changedIndex,
      testColor,
      displayMs: state.config.displayMs,
      blankMs: state.config.blankMs,
      // دوداوری پس از آزمون زمان‌بندی نمی‌شود
      responseWindowMs: null,
    }
    return { state: { ...state, nextTrialIndex: trialIndex + 1, currentTrial: trial }, trial }
  },

  submitAnswer(state, answer, reactionTimeMs) {
    const trial = state.currentTrial
    if (!trial) throw new Error('مرحله فعالی برای ثبت پاسخ وجود ندارد')
    const correct = answer !== null && answer === (trial.changed ? 'changed' : 'unchanged')
    const outcome: TrialOutcome = answer === null ? 'omission' : correct ? 'correct' : 'incorrect'
    const record: RecordedTrial = {
      trialIndex: trial.trialIndex,
      stimulus: {
        positions: trial.positions,
        colors: trial.colors,
        changed: trial.changed,
        changedIndex: trial.changedIndex,
        testColor: trial.testColor,
        arraySize: trial.positions.length,
      },
      expected: trial.changed ? 'changed' : 'unchanged',
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
    const stimOf = (r: RecordedTrial) => r.stimulus as { changed: boolean; arraySize: number }
    const changedTrials = state.results.filter((r) => stimOf(r).changed)
    const unchangedTrials = state.results.filter((r) => !stimOf(r).changed)
    const saidChanged = (r: RecordedTrial) => r.given === 'changed'
    // کلیدهای نرخ فقط با دادهٔ واقعی منتشر می‌شوند (الگوی صداقت متریک)
    const metrics: Record<string, number> = {
      changedTrials: changedTrials.length,
      unchangedTrials: unchangedTrials.length,
    }
    if (changedTrials.length > 0) {
      metrics['hitRate'] = accuracyPercent(changedTrials.filter(saidChanged).length, changedTrials.length)
    }
    if (unchangedTrials.length > 0) {
      metrics['falseAlarmRate'] = accuracyPercent(
        unchangedTrials.filter(saidChanged).length,
        unchangedTrials.length,
      )
    }
    if (changedTrials.length > 0 && unchangedTrials.length > 0) {
      const meanArraySize =
        state.results.reduce((sum, r) => sum + stimOf(r).arraySize, 0) / state.results.length
      // ظرفیت حافظهٔ دیداری با تصحیح حدس: k = N × (درستی − زنگ خطر)
      const k = meanArraySize * ((metrics['hitRate'] as number) - (metrics['falseAlarmRate'] as number)) / 100
      metrics['kEstimate'] = Math.round(k * 10) / 10
      metrics['meanArraySize'] = Math.round(meanArraySize * 10) / 10
    }
    return {
      exerciseId: CHANGE_DETECTION_ID,
      sessionId: state.sessionId,
      exerciseVersion: CHANGE_DETECTION_VERSION,
      contentVersion: CHANGE_DETECTION_CONTENT_VERSION,
      domain: 'visual-spatial',
      difficulty: state.config.difficulty,
      ...totals,
      metrics,
    }
  },
}
