import type { ExerciseMeta } from '../../../../core/registry/game-registry'

/**
 * متادیتای کامل «دهانهٔ تقارن» — موج ۷. منبع یگانه برای کاتالوگ، رجیستری
 * و فهرست مرجع. id/version/contentVersion باید با engine یکی بماند —
 * نگهبان: registry-invariants.test.ts.
 */
export const SYMMETRY_SPAN_META_FA: ExerciseMeta = {
  id: 'symmetry-span',
  nameFa: 'دهانهٔ تقارن',
  descriptionFa:
    'وسط قضاوت تقارن الگوها، مکان خانه‌های روشن را در ذهن نگه دار و پایان هر دسته به ترتیب بازسازی کن.',
  domain: 'visual-spatial',
  exerciseType: 'spatial',
  family: 'complex-span',
  nameEn: 'Symmetry Span',
  keywordsFa: ['اسپن تقارن', 'دهانه تقارن', 'قضاوت تقارن'],
  effects: ['working-memory', 'visual-spatial'],
  version: '1.0.0',
  contentVersion: '3',
  instructionsFa: [
    'هر دسته چند زوج پشت‌سرهم دارد: اول یک الگوی شبکه‌ای می‌آید — با دکمه‌های «متقارن» یا «نامتقارن» قضاوت کن.',
    'بلافاصله بعد از قضاوت، یک خانه در شبکهٔ خالی روشن می‌شود — مکانش را به خاطر بسپار.',
    'پایان دسته، همان شبکه می‌آید؛ خانه‌ها را به همان ترتیبی که روشن شدند لمس کن و تأیید بزن.',
    'با بالا رفتن سطح، دسته‌ها طولانی‌تر می‌شوند، خانه‌های هدف به هم نزدیک‌تر می‌شوند و زمان کمتری داری.',
    'در سطح ۵ باید بازیابی را به ترتیب وارونه انجام دهی.',
  ],
  difficultyLevels: [1, 2, 3, 4, 5],
  plannedTrials: 3,
  metricLabelsFa: {
    setsCompleted: 'دسته‌های انجام‌شده',
    partialCreditUnitScore: 'امتیاز اعتبار جزئی (٪)',
    symmetryAccuracy: 'دقت قضاوت تقارن (٪)',
    orderErrors: 'خطای ترتیب',
    intrusionErrors: 'خطای تجاوز (خانهٔ نابجا)',
    invalidSessionFlag: 'جلسهٔ بی‌اعتبار (۱ = دقت تقارن زیر ۸۵٪)',
  },
}
