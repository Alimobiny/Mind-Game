import type { ExerciseMeta } from '../../../../core/registry/game-registry'

/**
 * متادیتای فارسی «جابه‌جایی تکلیف» برای ثبت مرکزی — هماهنگ‌کننده این شیء را
 * در Registry با id/domain/version/contentVersion از engine ترکیب می‌کند.
 *
 * متریک‌های اختصاصی بر اساس پیشنهاد ۴ سند پژوهشی
 * (docs/ADVANCED-GAMES-RESEARCH.md): rtRepeatMs، rtSwitchMs، switchCostMs،
 * switchAccuracy، repeatAccuracy — به‌همراه شمارنده‌های تفسیری.
 */
export const TASK_SWITCHING_META_FA: Pick<
  ExerciseMeta,
  'nameFa' | 'descriptionFa' | 'exerciseType' | 'effects' | 'instructionsFa' | 'difficultyLevels' | 'plannedTrials' | 'metricLabelsFa'
> = {
  nameFa: 'جابه‌جایی تکلیف',
  exerciseType: 'visual',
  effects: ['attention-control'],
  descriptionFa:
    'نشانهٔ بالای صفحه می‌گوید این‌بار به کدام ویژگی شکل پاسخ بدهی — رنگ، شکل یا اندازه. سرعتِ تطبیق ذهن‌ات با عوض‌شدن قاعده به‌صورت «هزینهٔ جابه‌جایی» اندازه‌گیری می‌شود.',
  instructionsFa: [
    'نشانهٔ بالای صفحه مشخص می‌کند این مرحله کدام ویژگی شکل مهم است: «رنگ» یعنی آبی یا قرمز، «شکل» یعنی دایره یا مثلث، و در سطح ۵ «اندازه» یعنی کوچک یا بزرگ.',
    'دو دکمهٔ پاسخ در کل جلسه ثابت می‌مانند: دکمهٔ سمت راست = آبی / دایره / کوچک و دکمهٔ سمت چپ = قرمز / مثلث / بزرگ.',
    'چند مرحله پشت‌سرهم روی یک ویژگی می‌مانی و بعد بی‌خبر نشانه عوض می‌شود — سعی کن قاعدهٔ جدید را سریع اجرا کنی.',
    'زمان پاسخ از لحظهٔ ظاهرشدن شکل اندازه‌گیری می‌شود؛ اگر تا پایان مهلت پاسخ ندهی، مرحله «بی‌پاسخی» ثبت می‌شود.',
    'هدف، هم سریعی و هم درستی است: اختلاف سرعتِ مراحل پس از تعویض قاعده با مراحل تکراری، به‌عنوان هزینهٔ جابه‌جایی گزارش می‌شود.',
  ],
  difficultyLevels: [1, 2, 3, 4, 5],
  plannedTrials: 40,
  metricLabelsFa: {
    rtRepeatMs: 'میانه زمان پاسخ مراحل تکراری (میلی‌ثانیه)',
    rtSwitchMs: 'میانه زمان پاسخ مراحل جابه‌جایی (میلی‌ثانیه)',
    switchCostMs: 'هزینهٔ جابه‌جایی (میلی‌ثانیه)',
    switchAccuracy: 'دقت مراحل جابه‌جایی (٪)',
    repeatAccuracy: 'دقت مراحل تکراری (٪)',
    switchTrials: 'تعداد مراحل جابه‌جایی',
    repeatTrials: 'تعداد مراحل تکراری',
  },
}
