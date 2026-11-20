import type { ExerciseMeta } from '../../../../core/registry/game-registry'

/**
 * متادیتای کامل «محاسبه × ۱۰۰» — منبع یگانه برای کاتالوگ، رجیستری و فهرست
 * مرجع. id/version/contentVersion باید با engine یکی بماند — نگهبان:
 * registry-invariants.test.ts.
 */
export const CALCULATION_100_META_FA: ExerciseMeta = {
  id: 'calculation-100',
  nameFa: 'محاسبه × ۱۰۰',
  domain: 'processing-speed',
  exerciseType: 'numeric',
  family: 'arithmetic-fluency',
  nameEn: 'Calculation × 100',
  keywordsFa: ['حساب ذهنی', 'سرعت محاسبه', 'صد سوال'],
  effects: ['processing-speed'],
  version: '1.0.0',
  contentVersion: '1',
  descriptionFa:
    'به ۱۰۰ سؤال حساب کوتاه و پیوسته پاسخ بده؛ سرعت و دقت جداگانه سنجیده می‌شوند.',
  instructionsFa: [
    '۱۰۰ سؤال کوتاه جمع، تفریق، ضرب و (در سطح‌های بالا) تقسیم دقیق داری.',
    'پاسخ را با صفحه‌کلید عددی — یا کلیدهای عددی دستگاه و Enter — وارد و تأیید کن.',
    'سؤال منفرد مهلت زمانی ندارد؛ زمان پاسخ هر سؤال جداگانه اندازه‌گیری می‌شود.',
    'پس از هر پاسخ فقط یک بازخورد کوتاه می‌بینی و بلافاصله سؤال بعدی می‌آید — ریتم را حفظ کن.',
    'پاسخ سریع ولی نادرست امتیاز بیشتری نمی‌آورد؛ دقت جداگانه ثبت می‌شود.',
  ],
  difficultyLevels: [1, 2, 3, 4, 5],
  plannedTrials: 22,
  metricLabelsFa: {
    correctPerMinute: 'پاسخ درست بر دقیقه',
    meanReactionTimeMs: 'میانگین زمان پاسخ (میلی‌ثانیه)',
    totalAnswerTimeMs: 'مجموع زمان پاسخ (میلی‌ثانیه)',
  },
}
