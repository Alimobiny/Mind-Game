import type { ExerciseMeta } from '../../../../core/registry/game-registry'

/**
 * متادیتای فارسی «ترکیب واژه» — موج زبانی؛ نخستین بازی صوتی.
 */
export const WORD_BLEND_META_FA: Pick<
  ExerciseMeta,
  'nameFa' | 'descriptionFa' | 'exerciseType' | 'effects' | 'instructionsFa' | 'difficultyLevels' | 'plannedTrials' | 'metricLabelsFa'
> = {
  nameFa: 'ترکیب واژه',
  descriptionFa:
    'قطعات یک واژه را یکی‌یکی بشنو و واژهٔ کامل را از میان گزینه‌ها پیدا کن.',
  exerciseType: 'verbal',
  effects: ['verbal-auditory', 'working-memory'],
  instructionsFa: [
    'قطعات یک واژه (مثلاً «کت» و «اب») یکی‌یکی و با فاصله ارائه می‌شود — با صدای دستگاه می‌شنوی.',
    'قطعات را در ذهنت به هم بچسبان و واژهٔ کامل را بساز.',
    'سپس چهار گزینه می‌آید؛ واژه‌ای که از قطعات ساخته شده را انتخاب کن.',
    'اگر دستگاه صدای فارسی نداشته باشد، قطعات به‌جای شنیدن یکی‌یکی نمایش داده می‌شوند.',
    'با بالا رفتن سطح، قطعات سریع‌تر پشت‌سرهم می‌آیند و واژه‌ها مرکب‌تر می‌شوند.',
  ],
  difficultyLevels: [1, 2, 3, 4, 5],
  plannedTrials: 12,
  metricLabelsFa: {
    meanAnswerTimeMs: 'میانگین زمان پاسخ (میلی‌ثانیه)',
  },
}
