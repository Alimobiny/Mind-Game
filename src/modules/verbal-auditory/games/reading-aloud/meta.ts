import type { ExerciseMeta } from '../../../../core/registry/game-registry'

/**
 * متادیتای فارسی «بلندخوانی» — موج زبانی.
 */
export const READING_ALOUD_META_FA: Pick<
  ExerciseMeta,
  'nameFa' | 'descriptionFa' | 'exerciseType' | 'effects' | 'instructionsFa' | 'difficultyLevels' | 'plannedTrials' | 'metricLabelsFa'
> = {
  nameFa: 'بلندخوانی',
  descriptionFa:
    'متن کوتاه را با صدای بلند بخوان؛ سرعت خواندنت زمان‌گیری و فهمت با سؤال‌های همان متن سنجیده می‌شود.',
  exerciseType: 'verbal',
  effects: ['verbal-auditory'],
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
