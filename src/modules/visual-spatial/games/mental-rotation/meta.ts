import type { ExerciseMeta } from '../../../../core/registry/game-registry'

/**
 * متادیتای فارسی «چرخش ذهنی» برای ثبت مرکزی — هماهنگ‌کننده این شیء را
 * در Registry با id/domain/version/contentVersion از engine ترکیب می‌کند.
 */
export const MENTAL_ROTATION_META_FA: Pick<
  ExerciseMeta,
  'nameFa' | 'descriptionFa' | 'instructionsFa' | 'difficultyLevels' | 'plannedTrials' | 'metricLabelsFa'
> = {
  nameFa: 'چرخش ذهنی',
  descriptionFa:
    'شکل مرجع را در ذهن بچرخان و داوری کن: گزینه همان شکلِ چرخیده است یا تصویر آینه‌ای آن؟',
  instructionsFa: [
    'در هر مرحله دو شکل بلوکی می‌بینی: «مرجع» و «گزینه».',
    'اگر گزینه همان شکل مرجع باشد که فقط در صفحه چرخیده (۰ تا ۲۷۰ درجه)، دکمهٔ «یکسان (چرخیده)» را بزن.',
    'اگر گزینه تصویر آینه‌ای شکل مرجع باشد — چه چرخیده چه نچرخیده — دکمهٔ «آینه‌ای» را بزن.',
    'در سطح‌های بالاتر شکل‌ها بزرگ‌تر می‌شوند و برای پاسخ زمان محدود داری؛ بی‌پاسخی هم خطا ثبت می‌شود.',
    'دقت و زمان پاسخ جداگانه اندازه‌گیری می‌شوند؛ شتابِ بدون دقت امتیاز بیشتری نمی‌آورد.',
  ],
  difficultyLevels: [1, 2, 3, 4, 5],
  plannedTrials: 16,
  metricLabelsFa: {
    meanReactionTimeMs: 'میانگین زمان پاسخ (میلی‌ثانیه)',
    accuracyLowAngleBand: 'دقت در چرخش کم (۰ تا ۹۰ درجه)',
    accuracyHighAngleBand: 'دقت در چرخش زیاد (۱۸۰ تا ۲۷۰ درجه)',
  },
}
