import type { ExerciseMeta } from '../../../../core/registry/game-registry'

/**
 * متادیتای فارسی «دهانهٔ جاری» — موج نهم؛ سنجش به‌روزرسانی خالص.
 */
export const RUNNING_SPAN_META_FA: Pick<
  ExerciseMeta,
  'nameFa' | 'descriptionFa' | 'exerciseType' | 'effects' | 'instructionsFa' | 'difficultyLevels' | 'plannedTrials' | 'metricLabelsFa'
> = {
  nameFa: 'دهانهٔ جاری',
  descriptionFa:
    'ارقام سریع می‌گذرند و نمی‌دانی کی تمام می‌شوند — به‌محض توقف، چند رقم آخر را به ترتیب وارد کن.',
  exerciseType: 'numeric',
  effects: ['working-memory'],
  instructionsFa: [
    'ارقام یکی‌یکی و سریع نمایش داده می‌شوند.',
    'طول جریان اعلام نمی‌شود — نمی‌دانی کی تمام می‌شود، پس مدام «آخرین ارقام» را در ذهن نگه دار.',
    'به‌محض توقف جریان، چند رقم آخر (۳ تا ۵ رقم بسته به سطح) را به همان ترتیب وارد کن.',
    'شمردن از ابتدا کمکی نمی‌کند — ترفند این بازی به‌روزرسانی مداوم است، نه مرور ذهنی.',
    '۱۰ جریان در هر جلسه؛ با بالا رفتن سطح، عمق یادآوری بیشتر و نمایش تندتر می‌شود.',
  ],
  difficultyLevels: [1, 2, 3, 4, 5],
  plannedTrials: 10,
  metricLabelsFa: {
    lastNInOrderRate: 'میانگین ارقام درست در جای درست از دنبالهٔ انتظار (٪)',
    partialCreditScore: 'امتیاز اعتبار جزئی (٪)',
    itemErrors: 'خطای قلم (رقم خارج از دنبالهٔ انتظار)',
    orderErrors: 'خطای ترتیب (رقم درست در جای غلط)',
    primacyIntrusionRate: 'نرخ تهاجم آغازین — فرورفتن ارقام قدیمی (٪)',
    recallDepth: 'عمق یادآوری',
  },
}
