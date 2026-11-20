import type { ExerciseMeta } from '../../../../core/registry/game-registry'

/**
 * متادیتای کامل «کارت‌بندی قاعده» — موج ۷. منبع یگانه برای کاتالوگ، رجیستری
 * و فهرست مرجع. id/version/contentVersion باید با engine یکی بماند —
 * نگهبان: registry-invariants.test.ts.
 */
export const RULE_DISCOVERY_CARD_SORTING_META_FA: ExerciseMeta = {
  id: 'rule-discovery-card-sorting',
  nameFa: 'کارت‌بندی قاعده',
  descriptionFa:
    'قاعدهٔ پنهان دسته‌بندی کارت‌ها — رنگ، شکل یا تعداد — را از بازخوردها کشف کن و با عوض‌شدنش انعطاف نشان بده.',
  domain: 'reasoning',
  exerciseType: 'visual',
  family: 'wcst',
  nameEn: 'Rule Discovery (WCST-style)',
  keywordsFa: ['ویسکانسین', 'WCST', 'کارت بندی', 'کشف قاعده'],
  effects: ['reasoning', 'attention-control'],
  version: '1.0.0',
  contentVersion: '2',
  instructionsFa: [
    'چهار کارت مرجع بالای صفحه ثابت‌اند؛ هر کارت جدیدی که می‌آید را زیر یکی از آن‌ها بگذار.',
    'فقط «درست» یا «غلط» می‌شنوی — قاعدهٔ پنهان (رنگ، شکل یا تعداد) را با آزمون و خطا کشف کن.',
    'بعد از چند پاسخ درست پشت‌سرهم قاعده بی‌خبر عوض می‌شود؛ باید از قاعدهٔ قبلی چشم‌پوشی کنی.',
    'تکرار پاسخ طبق قاعدهٔ منقضی‌شده «خطای پایدار» ثبت می‌شود — متریک اصلی انعطاف اجرایی.',
    'در سطح ۵ بازخوردها گاهی گمراه‌کننده‌اند؛ به الگوی کلی اعتماد کن، نه تک‌بازخورد.',
  ],
  difficultyLevels: [1, 2, 3, 4, 5],
  plannedTrials: 22,
  metricLabelsFa: {
    categoriesCompleted: 'دسته‌های کامل‌شده',
    perseverativeErrors: 'خطای پایدار (قاعدهٔ منقضی)',
    totalErrors: 'کل خطاها',
    trialsToFirstCategory: 'مرحلهٔ نخستین دستهٔ کامل',
    failureToMaintainSet: 'شکست در حفظ دسته',
  },
}
