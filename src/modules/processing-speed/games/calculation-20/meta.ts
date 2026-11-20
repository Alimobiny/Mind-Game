import type { ExerciseMeta } from '../../../../core/registry/game-registry'

/**
 * متادیتای کامل «محاسبه × ۲۰» — منبع یگانه برای کاتالوگ (catalog.ts)،
 * رجیستری و فهرست مرجع. id/version/contentVersion باید با engine یکی
 * بماند — نگهبان: registry-invariants.test.ts.
 */
export const CALCULATION_20_META_FA: ExerciseMeta = {
  id: 'calculation-20',
  nameFa: 'محاسبه × ۲۰',
  descriptionFa: 'به ۲۰ سؤال حساب سریع و دقیق پاسخ بده؛ سرعت و دقت جداگانه سنجیده می‌شوند.',
  domain: 'processing-speed',
  exerciseType: 'numeric',
  family: 'arithmetic-fluency',
  nameEn: 'Calculation × 20',
  keywordsFa: ['حساب ذهنی', 'سرعت محاسبه'],
  effects: ['processing-speed'],
  version: '1.0.0',
  contentVersion: '1',
  instructionsFa: [
    '۲۰ سؤال جمع، تفریق، ضرب و (در سطح‌های بالا) تقسیم دقیق داری.',
    'پاسخ را با صفحه‌کلید عددی تایپ و تأیید کن.',
    'سؤال منفرد مهلت زمانی ندارد؛ مجموع زمان ملاک است.',
    'پاسخ سریع ولی نادرست امتیاز بیشتری نمی‌آورد — دقت جداگانه ثبت می‌شود.',
  ],
  difficultyLevels: [1, 2, 3, 4, 5],
  plannedTrials: 9,
  metricLabelsFa: {
    questionsPerMinute: 'سؤال بر دقیقه',
    totalAnswerTimeMs: 'مجموع زمان پاسخ (میلی‌ثانیه)',
  },
}
