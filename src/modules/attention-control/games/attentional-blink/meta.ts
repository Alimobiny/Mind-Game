import type { ExerciseMeta } from '../../../../core/registry/game-registry'

/**
 * متادیتای فارسی «پلک توجه» — موج نهم؛ تنها پارادایم توجه زمانی کاتالوگ.
 */
export const ATTENTIONAL_BLINK_META_FA: Pick<
  ExerciseMeta,
  'nameFa' | 'descriptionFa' | 'exerciseType' | 'effects' | 'instructionsFa' | 'difficultyLevels' | 'plannedTrials' | 'metricLabelsFa'
> = {
  nameFa: 'پلک توجه',
  descriptionFa:
    'جریان سریع حروف می‌گذرد؛ دو هدف رنگی داخل آن پنهان شده — هر دو را تا پایان جریان به خاطر بسپار.',
  exerciseType: 'visual',
  effects: ['attention-control'],
  instructionsFa: [
    'حروف فارسی یکی‌یکی و بسیار سریع (حدود ۱۰ حرف در ثانیه) وسط صفحه رد می‌شوند.',
    'دو هدف داخل جریان رنگی‌اند: هدف اول روشن‌آبی و هدف دوم سبز — فاصلهٔ هدف دوم از اولی هر بار فرق می‌کند.',
    'در پایان جریان، هر دو حرفِ هدف را به‌ترتیب از جدول حروف انتخاب می‌کنی (اول روشن‌آبی، بعد سبز).',
    'مهم: اگر هدف دوم را در فاصله‌های کوتاه از دست بادی «پلک توجه» است و بخش طبیعی این پارادایم است — خطای زیاد غیرعادی نیست.',
    '۱۲ جریان در هر جلسه؛ با بالا رفتن سطح، جریان تندتر می‌شود (۸ تا ~۱۲ حرف بر ثانیه).',
  ],
  difficultyLevels: [1, 2, 3, 4, 5],
  plannedTrials: 12,
  metricLabelsFa: {
    t1Accuracy: 'تشخیص هدف اول (٪)',
    t2Accuracy: 'تشخیص هدف دوم (٪)',
    t2GivenT1Accuracy: 'تشخیص هدف دوم وقتی هدف اول درست بوده (٪)',
    blinkMagnitude: 'اندازهٔ پلک: برتری تأخیر ۷ بر تأخیر ۳ (واحد درصد)',
    lagOneSparing: 'سهیم‌شدن تأخیر ۱ (واحد درصد)',
  },
}
