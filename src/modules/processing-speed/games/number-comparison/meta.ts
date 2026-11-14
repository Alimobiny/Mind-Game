import type { ExerciseMeta } from '../../../../core/registry/game-registry'

/**
 * متادیتای کامل «مقایسه اعداد» — منبع یگانه برای کاتالوگ، رجیستری و فهرست
 * مرجع. id/version/contentVersion باید با engine یکی بماند — نگهبان:
 * registry-invariants.test.ts.
 */
export const NUMBER_COMPARISON_META_FA: ExerciseMeta = {
  id: 'number-comparison',
  nameFa: 'مقایسه اعداد',
  domain: 'processing-speed',
  exerciseType: 'numeric',
  family: 'arithmetic-fluency',
  nameEn: 'Number Comparison',
  keywordsFa: ['عدد بزرگتر', 'بزرگتر کوچکتر'],
  effects: ['processing-speed'],
  version: '1.0.0',
  contentVersion: '1',
  difficultyLevels: [1, 2, 3, 4, 5],
  plannedTrials: 36,
  descriptionFa:
    'دو عدد کنار هم نمایش داده می‌شوند؛ هرچه سریع‌تر عدد بزرگ‌تر را انتخاب کن.',
  instructionsFa: [
    'در هر مرحله دو عدد کنار هم دیده می‌شوند.',
    'روی عدد بزرگ‌تر بزن — خود اعداد دکمهٔ انتخاب هستند.',
    'در سطح‌های بالا اعداد طولانی‌تر و به‌هم نزدیک‌تر می‌شوند و گاهی یک سمت به‌جای عدد، رشته‌رقم جداشده است.',
    '۳۶ مرحله در هر جلسه؛ دقت و میانگین زمان پاسخِ درست گزارش می‌شود.',
  ],
  metricLabelsFa: {
    meanReactionTimeMs: 'میانگین زمان پاسخ درست (میلی‌ثانیه)',
    medianReactionTimeMs: 'میانه زمان پاسخ درست (میلی‌ثانیه)',
    timeoutErrors: 'مراحل بی‌پاسخ (انقضای مهلت)',
  },
}
