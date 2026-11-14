import type { ExerciseMeta } from '../../../../core/registry/game-registry'

/**
 * متادیتای کامل «جمع زنجیره‌ای گام‌دار (پاسات)» — منبع یگانه برای کاتالوگ،
 * رجیستری و فهرست مرجع. id/version/contentVersion باید با engine یکی
 * بماند — نگهبان: registry-invariants.test.ts.
 */
export const PASAT_META_FA: ExerciseMeta = {
  id: 'pasat',
  nameFa: 'جمع زنجیره‌ای گام‌دار',
  descriptionFa:
    'ارقام با ریتم ثابت می‌آیند؛ حاصل جمع هر رقم با رقم قبل را پیش از رقم بعدی وارد کن.',
  domain: 'processing-speed',
  exerciseType: 'numeric',
  family: 'pasat',
  nameEn: 'PASAT (Paced Serial Addition)',
  keywordsFa: ['پاسات', 'PASAT', 'جمع زنجیره‌ای', 'جمع سریع'],
  effects: ['processing-speed', 'working-memory'],
  version: '1.0.0',
  contentVersion: '2',
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
    dyadErrors: 'خطای زوج‌ها (n+n)',
    stringErrors: 'طولانی‌ترین رشتهٔ خطا',
    answeredBeforeNextRate: 'نرخ پاسخ پیش از رقم بعد',
    meanAnswerTimeMs: 'میانگین زمان پاسخ درست (میلی‌ثانیه)',
  },
}
