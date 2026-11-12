import type { ExerciseMeta } from '../../../../core/registry/game-registry'

/**
 * متادیتای فارسی «جمع زنجیره‌ای گام‌دار (پاسات)» برای ثبت مرکزی.
 */
export const PASAT_META_FA: Pick<
  ExerciseMeta,
  'nameFa' | 'descriptionFa' | 'exerciseType' | 'effects' | 'instructionsFa' | 'difficultyLevels' | 'plannedTrials' | 'metricLabelsFa'
> = {
  nameFa: 'جمع زنجیره‌ای گام‌دار',
  descriptionFa:
    'ارقام با ریتم ثابت می‌آیند؛ حاصل جمع هر رقم با رقم قبل را پیش از رقم بعدی وارد کن.',
  exerciseType: 'numeric',
  effects: ['processing-speed', 'working-memory'],
  instructionsFa: [
    'ارقام یکی‌یکی و با فاصلهٔ ثابت نمایش داده می‌شوند و بعد محو می‌شوند.',
    'رقم اول فقط برای تماشاست — به خاطر بسپار.',
    'از رقم دوم، جمع «رقم جدید + رقم قبل» را با صفحه‌کلید وارد و تأیید کن.',
    'پاسخ باید پیش از ظاهرشدن رقم بعدی ثبت شود؛ با رقم بعد، پنجرهٔ پاسخ می‌بندد.',
    'با بالا رفتن سطح، ریتم سریع‌تر می‌شود؛ دقت و میانگین زمان پاسخ جداگانه گزارش می‌شود.',
  ],
  difficultyLevels: [1, 2, 3, 4, 5],
  plannedTrials: 20,
  metricLabelsFa: {
    correctSums: 'جمع‌های درست',
    omissions: 'مراحل بی‌پاسخ',
    meanAnswerTimeMs: 'میانگین زمان پاسخ درست (میلی‌ثانیه)',
  },
}
