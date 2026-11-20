import type { ExerciseMeta } from '../../../../core/registry/game-registry'

/**
 * متادیتای کامل «حافظهٔ انجمنی» — نخستین بازی حوزهٔ حافظه بلندمدت.
 * id/version/contentVersion باید با engine یکی بماند — نگهبان:
 * registry-invariants.test.ts.
 */
export const ASSOCIATIVE_PAIRS_META_FA: ExerciseMeta = {
  id: 'associative-pairs',
  nameFa: 'حافظهٔ انجمنی',
  descriptionFa:
    'جفت‌های واژه را مطالعه کن و بعد نشانهٔ هر جفت را از میان گزینه‌ها به جفتش برسان.',
  domain: 'long-term-memory',
  exerciseType: 'verbal',
  family: 'associative-memory',
  nameEn: 'Associative Pairs (Paired-Associate Learning)',
  keywordsFa: ['جفت واژه', 'حافظه انجمنی', 'یادآوری جفت'],
  effects: ['long-term-memory', 'working-memory'],
  version: '1.0.0',
  contentVersion: '3',
  instructionsFa: [
    'اول چند جفت واژه یکی‌یکی نشان داده می‌شود — هر دو واژه را با هم به خاطر بسپار.',
    'سپس نشانهٔ هر جفت (واژهٔ اول) با چند گزینه می‌آید؛ واژهٔ جفت‌شده را انتخاب کن.',
    'در سطح‌های بالاتر، همان جفت‌ها یک بار دیگر در پایان پرسیده می‌شوند — یادآوریِ بافاصله.',
    'با بالا رفتن سطح، جفت‌ها بیشتر و گزینه‌ها بیشتر می‌شوند.',
    'دقت بلوک اول و بلوک یادآوری جداگانه گزارش می‌شود.',
  ],
  difficultyLevels: [1, 2, 3, 4, 5],
  // کفِ سطح ۱ برای کاتالوگ/برآورد برنامه؛ تعداد واقعی مراحل به سطح وابسته
  // است (config.totalTrials = ۸/۱۰/۱۸/۲۱/۲۴) و GameShell از config می‌خواند
  plannedTrials: 8,
  metricLabelsFa: {
    studiedPairs: 'جفت‌های مطالعه‌شده',
    firstBlockAccuracy: 'دقت آزمون بلافاصله (٪)',
    secondBlockAccuracy: 'دقت یادآوری دوباره (٪ — فقط سطح ۳ به بالا)',
  },
}
