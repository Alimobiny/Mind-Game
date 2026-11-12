import type { ExerciseMeta } from '../../../../core/registry/game-registry'

/**
 * متادیتای فارسی «دهانهٔ تقارن» — موج ۷.
 */
export const SYMMETRY_SPAN_META_FA: Pick<
  ExerciseMeta,
  'nameFa' | 'descriptionFa' | 'exerciseType' | 'effects' | 'instructionsFa' | 'difficultyLevels' | 'plannedTrials' | 'metricLabelsFa'
> = {
  nameFa: 'دهانهٔ تقارن',
  descriptionFa:
    'وسط قضاوت تقارن الگوها، مکان خانه‌های روشن را در ذهن نگه دار و پایان هر دسته به ترتیب بازسازی کن.',
  exerciseType: 'spatial',
  effects: ['working-memory', 'visual-spatial'],
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
