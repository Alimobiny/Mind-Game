import type { ExerciseMeta } from '../../../../core/registry/game-registry'

/**
 * متادیتای کامل «عملگر گم‌شده» — منبع یگانه برای کاتالوگ، رجیستری و فهرست
 * مرجع. id/version/contentVersion باید با engine یکی بماند — نگهبان:
 * registry-invariants.test.ts.
 */
export const MISSING_OPERATOR_META_FA: ExerciseMeta = {
  id: 'missing-operator',
  nameFa: 'عملگر گم‌شده',
  domain: 'processing-speed',
  exerciseType: 'numeric',
  family: 'arithmetic-fluency',
  nameEn: 'Missing Operator',
  keywordsFa: ['عملگر', 'معادله ناقص', 'جای خالی عملگر'],
  effects: ['processing-speed', 'reasoning'],
  version: '1.0.0',
  contentVersion: '1',
  difficultyLevels: [1, 2, 3, 4, 5],
  plannedTrials: 20,
  descriptionFa:
    'جای عملگر معادله خالی است؛ عملگری را انتخاب کن که معادله را درست کند. هر معادله از میان گزینه‌ها فقط یک جواب درست دارد.',
  instructionsFa: [
    'یک معادله مانند «۷ ؟ ۳ = ۴» نمایش داده می‌شود.',
    'از دکمه‌های پایین، عملگری را انتخاب کن که جواب معادله را درست می‌کند.',
    'هر معادله فقط با یکی از عملگرهای پیشنهادی درست است؛ سریع و دقیق تصمیم بگیر.',
    '۲۰ معادله در هر جلسه؛ با بالا رفتن سطح اعداد بزرگ‌تر و گزینه‌ها بیشتر می‌شود و از سطح ۳ زمان پاسخ هم محدود است.',
  ],
  metricLabelsFa: {
    meanReactionTimeMs: 'میانگین زمان پاسخ (میلی‌ثانیه)',
  },
}
