import type { ExerciseMeta } from '../../../../core/registry/game-registry'

/**
 * متادیتای فارسی «محاسبه × ۱۰۰» برای ثبت مرکزی — هماهنگ‌کننده این شیء را
 * در Registry با id/domain/version/contentVersion از engine ترکیب می‌کند.
 */
export const CALCULATION_100_META_FA: Pick<
  ExerciseMeta,
  'nameFa' | 'descriptionFa' | 'exerciseType' | 'effects' | 'instructionsFa' | 'difficultyLevels' | 'plannedTrials' | 'metricLabelsFa'
> = {
  nameFa: 'محاسبه × ۱۰۰',
  exerciseType: 'numeric',
  effects: ['processing-speed'],
  descriptionFa:
    'به ۱۰۰ سؤال حساب کوتاه و پیوسته پاسخ بده؛ سرعت و دقت جداگانه سنجیده می‌شوند.',
  instructionsFa: [
    '۱۰۰ سؤال کوتاه جمع، تفریق، ضرب و (در سطح‌های بالا) تقسیم دقیق داری.',
    'پاسخ را با صفحه‌کلید عددی — یا کلیدهای عددی دستگاه و Enter — وارد و تأیید کن.',
    'سؤال منفرد مهلت زمانی ندارد؛ زمان پاسخ هر سؤال جداگانه اندازه‌گیری می‌شود.',
    'پس از هر پاسخ فقط یک بازخورد کوتاه می‌بینی و بلافاصله سؤال بعدی می‌آید — ریتم را حفظ کن.',
    'پاسخ سریع ولی نادرست امتیاز بیشتری نمی‌آورد؛ دقت جداگانه ثبت می‌شود.',
  ],
  difficultyLevels: [1, 2, 3, 4, 5],
  plannedTrials: 100,
  metricLabelsFa: {
    correctPerMinute: 'پاسخ درست بر دقیقه',
    meanReactionTimeMs: 'میانگین زمان پاسخ (میلی‌ثانیه)',
    totalAnswerTimeMs: 'مجموع زمان پاسخ (میلی‌ثانیه)',
  },
}
