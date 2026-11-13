import type { ExerciseMeta } from '../../../../core/registry/game-registry'

/**
 * متادیتای فارسی «تداخل مکانی» (تکلیف سایمون) — موج نهم.
 */
export const SIMON_META_FA: Pick<
  ExerciseMeta,
  'nameFa' | 'descriptionFa' | 'exerciseType' | 'effects' | 'instructionsFa' | 'difficultyLevels' | 'plannedTrials' | 'metricLabelsFa'
> = {
  nameFa: 'تداخل مکانی',
  descriptionFa:
    'دایرهٔ رنگی چپ یا راست وسط صفحه ظاهر می‌شود؛ فقط به رنگش پاسخ بده و مکانش را نادیده بگیر.',
  exerciseType: 'reaction',
  effects: ['attention-control'],
  instructionsFa: [
    'یک نقطهٔ ثابت وسط صفحه دیده می‌شود و دایرهٔ آبی یا قرمز در سمت چپ یا راست آن روشن می‌شود.',
    'فقط بر اساس رنگ پاسخ بده: دایرهٔ آبی یعنی دکمهٔ آبی، دایرهٔ قرمز یعنی دکمهٔ قرمز.',
    'مکان دایره فریبنده است — گاهی درست همان سمتی است که دکمهٔ رنگش هست (سازگار) و گاهی مقابل (ناسازگار).',
    'کندیِ تو در مراحل ناسازگار همان «اثر سایمون» است و جداگانه گزارش می‌شود؛ خطای زیاد در مراحل ناسازگار طبیعی است.',
    '۴۰ مرحله در هر جلسه؛ در سطح ۵ دکمه‌ها در میانهٔ جلسه جای خود را عوض می‌کنند و نشان «نگاشت وارونه» این را اعلام می‌کند.',
  ],
  difficultyLevels: [1, 2, 3, 4, 5],
  plannedTrials: 40,
  metricLabelsFa: {
    rtCongruentMs: 'میانه واکنش مراحل سازگار (میلی‌ثانیه)',
    rtIncongruentMs: 'میانه واکنش مراحل ناسازگار (میلی‌ثانیه)',
    simonEffectMs: 'اثر سایمون: کندی ناسازگار نسبت به سازگار (میلی‌ثانیه)',
    congruencySequenceEffectMs: 'اثر توالی تجانس (میلی‌ثانیه)',
    congruentTrials: 'تعداد مراحل سازگار',
    incongruentTrials: 'تعداد مراحل ناسازگار',
    accuracyCongruent: 'دقت مراحل سازگار (٪)',
    accuracyIncongruent: 'دقت مراحل ناسازگار (٪)',
    omissionErrors: 'بی‌پاسخی‌ها',
  },
}
