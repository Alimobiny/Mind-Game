import type { ExerciseMeta } from '../../../../core/registry/game-registry'

/**
 * متادیتای فارسی «حافظهٔ انجمنی» — نخستین بازی حوزهٔ حافظه بلندمدت.
 */
export const ASSOCIATIVE_PAIRS_META_FA: Pick<
  ExerciseMeta,
  'nameFa' | 'descriptionFa' | 'exerciseType' | 'effects' | 'instructionsFa' | 'difficultyLevels' | 'plannedTrials' | 'metricLabelsFa'
> = {
  nameFa: 'حافظهٔ انجمنی',
  descriptionFa:
    'جفت‌های واژه را مطالعه کن و بعد نشانهٔ هر جفت را از میان گزینه‌ها به جفتش برسان.',
  exerciseType: 'verbal',
  effects: ['long-term-memory', 'working-memory'],
  instructionsFa: [
    'اول چند جفت واژه یکی‌یکی نشان داده می‌شود — هر دو واژه را با هم به خاطر بسپار.',
    'سپس نشانهٔ هر جفت (واژهٔ اول) با چند گزینه می‌آید؛ واژهٔ جفت‌شده را انتخاب کن.',
    'در سطح‌های بالاتر، همان جفت‌ها یک بار دیگر در پایان پرسیده می‌شوند — یادآوریِ بافاصله.',
    'با بالا رفتن سطح، جفت‌ها بیشتر و گزینه‌ها بیشتر می‌شوند.',
    'دقت بلوک اول و بلوک یادآوری جداگانه گزارش می‌شود.',
  ],
  difficultyLevels: [1, 2, 3, 4, 5],
  plannedTrials: 8,
  metricLabelsFa: {
    studiedPairs: 'جفت‌های مطالعه‌شده',
    firstBlockAccuracy: 'دقت آزمون بلافاصله (٪)',
    secondBlockAccuracy: 'دقت یادآوری دوباره (٪ — فقط سطح ۳ به بالا)',
  },
}
