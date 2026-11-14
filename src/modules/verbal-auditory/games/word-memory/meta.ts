import type { ExerciseMeta } from '../../../../core/registry/game-registry'

/**
 * متادیتای کامل «حافظه واژه‌ها» — منبع یگانه برای کاتالوگ (catalog.ts)،
 * رجیستری و فهرست مرجع. id/version/contentVersion باید با engine یکی
 * بماند — نگهبان: registry-invariants.test.ts.
 */
export const WORD_MEMORY_META_FA: ExerciseMeta = {
  id: 'word-memory',
  nameFa: 'حافظه واژه‌ها',
  descriptionFa: 'کلمات را یکی‌یکی به خاطر بسپار و همان‌ها را از میان واژه‌های جدید پیدا کن.',
  domain: 'verbal-auditory',
  exerciseType: 'verbal',
  family: 'word-list',
  nameEn: 'Word Memory (Word-List Recognition)',
  keywordsFa: ['حافظه واژه', 'فهرست کلمات', 'بازیابی واژه'],
  effects: ['working-memory', 'verbal-auditory'],
  version: '1.0.0',
  contentVersion: '2',
  instructionsFa: [
    'چند کلمه یکی‌یکی و به‌ترتیب نمایش داده می‌شوند.',
    'آن‌ها را به خاطر بسپار.',
    'پس از پنهان‌شدن، از میان ۲ برابر کلمه، فقط همان‌هایی که دیدی را انتخاب کن.',
    '۶ مرحله در هر جلسه؛ با بالا رفتن سطح، تعداد کلمات بیشتر و زمان کمتر می‌شود.',
  ],
  difficultyLevels: [1, 2, 3, 4, 5],
  plannedTrials: 6,
  metricLabelsFa: {
    hits: 'کلمات به‌یادآورده‌شده',
    falseAlarms: 'کلمات نابجا انتخاب‌شده',
    missedWords: 'کلمات ازقلم‌افتاده',
    meanRecallRate: 'میانگین بازیابی (٪)',
  },
}
