import type { ExerciseMeta } from '../../../../core/registry/game-registry'

/**
 * متادیتای کامل «شمارش معکوس پیوسته» — منبع یگانه برای کاتالوگ، رجیستری
 * و فهرست مرجع. id/version/contentVersion باید با engine یکی بماند —
 * نگهبان: registry-invariants.test.ts. (plannedTrials = TOTAL_TRIALS موتور)
 */
export const CONTINUOUS_COUNTDOWN_META_FA: ExerciseMeta = {
  id: 'continuous-countdown',
  nameFa: 'شمارش معکوس پیوسته',
  descriptionFa:
    'عدد شروع را ببین، اعداد کم‌شونده را یکی‌یکی از باقیماندهٔ ذهنی‌ات کم کن و مقدار نهایی را وارد کن — محاسبهٔ پیوسته زیر بار حافظه.',
  domain: 'processing-speed',
  exerciseType: 'numeric',
  family: 'arithmetic-fluency',
  nameEn: 'Continuous Countdown (Serial Subtraction)',
  keywordsFa: ['تفریق زنجیره‌ای', 'تفریق پیوسته', 'باقیمانده ذهنی'],
  effects: ['processing-speed', 'working-memory'],
  version: '1.0.0',
  contentVersion: '2',
  instructionsFa: [
    'یک عدد شروع به‌مدت کوتاه نمایش داده می‌شود؛ آن را به خاطر بسپار.',
    'سپس چند عدد کوچک یکی‌یکی ظاهر می‌شوند؛ هر عدد را همان لحظه از باقیماندهٔ ذهنی‌ات کم کن.',
    'پس از پنهان‌شدن اعداد، باقیماندهٔ نهایی را با صفحه‌کلید عددی وارد و تأیید کن.',
    '۱۰ مرحله در هر جلسه؛ با بالا رفتن سطح، عدد شروع بزرگ‌تر، توالی طولانی‌تر و نمایش سریع‌تر می‌شود.',
  ],
  difficultyLevels: [1, 2, 3, 4, 5],
  plannedTrials: 7,
  metricLabelsFa: {
    meanAnswerTimeMs: 'میانگین زمان پاسخ نهایی (میلی‌ثانیه)',
    meanAbsoluteDeviation: 'میانگین انحراف از باقیماندهٔ درست',
    stepsPerTrial: 'تعداد اعداد کم‌شونده در هر مرحله',
  },
}
