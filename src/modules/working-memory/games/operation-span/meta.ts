import type { ExerciseMeta } from '../../../../core/registry/game-registry'

/**
 * متادیتای فارسی «دهانهٔ عملیاتی» — موج ۷.
 */
export const OPERATION_SPAN_META_FA: Pick<
  ExerciseMeta,
  'nameFa' | 'descriptionFa' | 'exerciseType' | 'effects' | 'instructionsFa' | 'difficultyLevels' | 'plannedTrials' | 'metricLabelsFa'
> = {
  nameFa: 'دهانهٔ عملیاتی',
  descriptionFa:
    'وسط حل مسئله‌های محاسبه، واژه‌ها را در ذهن نگه دار و پایان هر دسته به ترتیب بازیابی کن.',
  exerciseType: 'numeric',
  effects: ['working-memory', 'processing-speed'],
  instructionsFa: [
    'هر دسته چند زوج پشت‌سرهم دارد: اول یک معادله می‌آید — با دکمه‌های «درست» یا «غلط» قضاوت کن.',
    'بلافاصله بعد از قضاوت، یک واژه کوتاه نمایش داده می‌شود — آن را به خاطر بسپار.',
    'پایان دسته، جدولی از واژه‌ها می‌آید؛ واژه‌های همان دسته را به همان ترتیبی که دیدی انتخاب و تأیید کن.',
    'در سطح بالاتر دسته‌ها طولانی‌تر می‌شوند، محاسبه‌ها چهارعملی می‌شوند و در سطح ۵ باید به ترتیب وارونه بازیابی کنی.',
    'اگر دقت محاسبه‌هایت زیر ۸۵٪ بیفتد، جلسه «فاقد اعتبار» ثبت می‌شود — این قرارداد پژوهشی ظرفیت‌سنجی است.',
  ],
  difficultyLevels: [1, 2, 3, 4, 5],
  plannedTrials: 3,
  metricLabelsFa: {
    setsCompleted: 'دسته‌های انجام‌شده',
    partialCreditUnitScore: 'امتیاز اعتبار جزئی (٪)',
    mathAccuracy: 'دقت محاسبه (٪)',
    recallInOrderRate: 'دسته‌های کامل و به‌ترتیب (٪)',
    orderErrors: 'خطای ترتیب',
    intrusionErrors: 'خطای تجاوز (واژهٔ نابجا)',
    invalidSessionFlag: 'جلسهٔ بی‌اعتبار (۱ = دقت محاسبه زیر ۸۵٪)',
  },
}
