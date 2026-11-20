import type { ExerciseMeta } from '../../../../core/registry/game-registry'

/**
 * متادیتای کامل «شمارش هجا» — منبع یگانه برای کاتالوگ (catalog.ts)،
 * رجیستری و فهرست مرجع. id/version/contentVersion باید با engine یکی
 * بماند — نگهبان: registry-invariants.test.ts.
 */
export const SYLLABLE_COUNTING_META_FA: ExerciseMeta = {
  id: 'syllable-counting',
  nameFa: 'شمارش هجا',
  descriptionFa: 'تعداد هجای جمله را بشمار و با صفحه‌کلید وارد کن.',
  domain: 'verbal-auditory',
  exerciseType: 'verbal',
  family: 'phonological-awareness',
  nameEn: 'Syllable Counting',
  keywordsFa: ['هجا', 'آگاهی واجی', 'شمارش هجاهای جمله'],
  effects: ['verbal-auditory', 'processing-speed'],
  version: '1.0.0',
  contentVersion: '1',
  instructionsFa: [
    'یک جمله فارسی نمایش داده می‌شود.',
    'تعداد هجاهای جمله را بشمار (واژه‌به‌واژه بلند بخوان کمک می‌کند).',
    'عدد را با صفحه‌کلید وارد و تأیید کن.',
    '۱۲ جمله در هر جلسه؛ با بالا رفتن سطح، جمله‌ها طولانی‌تر می‌شوند.',
  ],
  difficultyLevels: [1, 2, 3, 4, 5],
  plannedTrials: 6,
  metricLabelsFa: {
    meanAbsoluteError: 'میانگین خطای مطلق (هجا)',
    exactAnswerRate: 'درصد پاسخ دقیق (٪)',
  },
}
