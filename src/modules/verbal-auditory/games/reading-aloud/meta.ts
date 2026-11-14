import type { ExerciseMeta } from '../../../../core/registry/game-registry'

/**
 * متادیتای کامل «بلندخوانی» — موج زبانی. منبع یگانه برای کاتالوگ، رجیستری
 * و فهرست مرجع. id/version/contentVersion باید با engine یکی بماند —
 * نگهبان: registry-invariants.test.ts.
 */
export const READING_ALOUD_META_FA: ExerciseMeta = {
  id: 'reading-aloud',
  nameFa: 'بلندخوانی',
  descriptionFa:
    'متن کوتاه را با صدای بلند بخوان؛ سرعت خواندنت زمان‌گیری و فهمت با سؤال‌های همان متن سنجیده می‌شود.',
  domain: 'verbal-auditory',
  exerciseType: 'verbal',
  family: 'repeated-reading',
  nameEn: 'Reading Aloud (Repeated Reading)',
  keywordsFa: ['بلند خواندن', 'روان خوانی', 'سرعت خواندن'],
  effects: ['verbal-auditory'],
  version: '1.0.0',
  contentVersion: '3',
  instructionsFa: [
    'یک متن کوتاه فارسی نمایش داده می‌شود — وقتی آماده‌ای، «شروع خواندن» را بزن و متن را با صدای بلند بخوان.',
    'هیچ میکروفونی در کار نیست؛ زمان‌سنجی دست خودت است — در پایان خواندن، «پایان خواندن» را بزن.',
    'سپس متن پنهان می‌شود و دو سؤال از همان متن می‌آید — پاسخ‌ها را از حفظ انتخاب کن.',
    'با بالا رفتن سطح، متن‌ها طولانی‌تر و سؤال‌ها دقیق‌تر می‌شوند.',
    'سرعت خواندن (واژه بر دقیقه)، زمان خواندن و دقت فهم جداگانه گزارش می‌شوند.',
  ],
  difficultyLevels: [1, 2, 3, 4, 5],
  plannedTrials: 3,
  metricLabelsFa: {
    passagesRead: 'متن‌های خوانده‌شده',
    meanReadingMs: 'میانگین زمان خواندن (میلی‌ثانیه)',
    wordsPerMinute: 'سرعت خواندن (واژه بر دقیقه)',
    comprehensionAccuracy: 'دقت فهم (٪)',
  },
}
