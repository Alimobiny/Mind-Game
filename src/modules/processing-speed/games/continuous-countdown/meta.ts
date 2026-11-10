import type { ExerciseMeta } from '../../../../core/registry/game-registry'
import {
  CONTINUOUS_COUNTDOWN_CONTENT_VERSION,
  CONTINUOUS_COUNTDOWN_ID,
  CONTINUOUS_COUNTDOWN_VERSION,
  configForDifficulty,
} from './engine'

/**
 * متادیتای نمایشی «شمارش معکوس پیوسته» — شکل کامل ExerciseMeta تا
 * هماهنگ‌کننده بتواند آن را مستقیم در registry ثبت کند
 * (ثبت در src/modules/index.ts خارج از دامنهٔ این ایجنت است).
 */
export const CONTINUOUS_COUNTDOWN_META_FA: ExerciseMeta = {
  id: CONTINUOUS_COUNTDOWN_ID,
  nameFa: 'شمارش معکوس پیوسته',
  descriptionFa:
    'عدد شروع را ببین، اعداد کم‌شونده را یکی‌یکی از باقیماندهٔ ذهنی‌ات کم کن و مقدار نهایی را وارد کن — محاسبهٔ پیوسته زیر بار حافظه.',
  domain: 'processing-speed',
  version: CONTINUOUS_COUNTDOWN_VERSION,
  contentVersion: CONTINUOUS_COUNTDOWN_CONTENT_VERSION,
  instructionsFa: [
    'یک عدد شروع به‌مدت کوتاه نمایش داده می‌شود؛ آن را به خاطر بسپار.',
    'سپس چند عدد کوچک یکی‌یکی ظاهر می‌شوند؛ هر عدد را همان لحظه از باقیماندهٔ ذهنی‌ات کم کن.',
    'پس از پنهان‌شدن اعداد، باقیماندهٔ نهایی را با صفحه‌کلید عددی وارد و تأیید کن.',
    '۱۰ مرحله در هر جلسه؛ با بالا رفتن سطح، عدد شروع بزرگ‌تر، توالی طولانی‌تر و نمایش سریع‌تر می‌شود.',
  ],
  difficultyLevels: [1, 2, 3, 4, 5],
  plannedTrials: configForDifficulty(1).totalTrials,
  metricLabelsFa: {
    meanAnswerTimeMs: 'میانگین زمان پاسخ نهایی (میلی‌ثانیه)',
    meanAbsoluteDeviation: 'میانگین انحراف از باقیماندهٔ درست',
    stepsPerTrial: 'تعداد اعداد کم‌شونده در هر مرحله',
  },
}
