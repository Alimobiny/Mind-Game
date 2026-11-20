import type { ExerciseMeta } from '../../../../core/registry/game-registry'

/**
 * متادیتای کامل «ترکیب واژه» — موج زبانی؛ نخستین بازی صوتی. منبع یگانه برای
 * کاتالوگ، رجیستری و فهرست مرجع. id/version/contentVersion باید با engine
 * یکی بماند — نگهبان: registry-invariants.test.ts.
 */
export const WORD_BLEND_META_FA: ExerciseMeta = {
  id: 'word-blend',
  nameFa: 'ترکیب واژه',
  descriptionFa:
    'قطعات یک واژه را یکی‌یکی بشنو و واژهٔ کامل را از میان گزینه‌ها پیدا کن.',
  domain: 'verbal-auditory',
  exerciseType: 'verbal',
  family: 'phonemic-synthesis',
  nameEn: 'Word Blend (Phonemic Synthesis)',
  keywordsFa: ['ترکیب صدا', 'ادغام واج', 'ساخت واژه از قطعات'],
  effects: ['verbal-auditory', 'working-memory'],
  version: '1.0.0',
  contentVersion: '3',
  instructionsFa: [
    'قطعات یک واژه (مثلاً «کت» و «اب») یکی‌یکی و با فاصله ارائه می‌شود — با صدای دستگاه می‌شنوی.',
    'قطعات را در ذهنت به هم بچسبان و واژهٔ کامل را بساز.',
    'سپس چهار گزینه می‌آید؛ واژه‌ای که از قطعات ساخته شده را انتخاب کن.',
    'اگر دستگاه صدای فارسی نداشته باشد، قطعات به‌جای شنیدن یکی‌یکی نمایش داده می‌شوند.',
    'با بالا رفتن سطح، قطعات سریع‌تر پشت‌سرهم می‌آیند و واژه‌ها مرکب‌تر می‌شوند.',
  ],
  difficultyLevels: [1, 2, 3, 4, 5],
  plannedTrials: 11,
  metricLabelsFa: {
    meanAnswerTimeMs: 'میانگین زمان پاسخ (میلی‌ثانیه)',
  },
}
