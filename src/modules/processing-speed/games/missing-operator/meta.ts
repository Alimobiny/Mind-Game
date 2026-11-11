/**
 * متادیتای فارسی «عملگر گم‌شده» — ورودی ادغام مرکزی در Registry
 * (ثبت در src/modules/index.ts + case در ExercisePage) توسط هماهنگ‌کننده.
 * id/version/domain از engine.ts خوانده می‌شود.
 */

export interface MissingOperatorMetaFa {
  readonly nameFa: string
  readonly descriptionFa: string
  readonly exerciseType: 'numeric'
  readonly effects: readonly ['processing-speed', 'reasoning']
  readonly instructionsFa: readonly string[]
  readonly metricLabelsFa: Readonly<Record<string, string>>
}

export const MISSING_OPERATOR_META_FA: MissingOperatorMetaFa = {
  nameFa: 'عملگر گم‌شده',
  exerciseType: 'numeric',
  effects: ['processing-speed', 'reasoning'],
  descriptionFa:
    'جای عملگر معادله خالی است؛ عملگری را انتخاب کن که معادله را درست کند. هر معادله از میان گزینه‌ها فقط یک جواب درست دارد.',
  instructionsFa: [
    'یک معادله مانند «۷ ؟ ۳ = ۴» نمایش داده می‌شود.',
    'از دکمه‌های پایین، عملگری را انتخاب کن که جواب معادله را درست می‌کند.',
    'هر معادله فقط با یکی از عملگرهای پیشنهادی درست است؛ سریع و دقیق تصمیم بگیر.',
    '۲۰ معادله در هر جلسه؛ با بالا رفتن سطح اعداد بزرگ‌تر و گزینه‌ها بیشتر می‌شود و از سطح ۳ زمان پاسخ هم محدود است.',
  ],
  metricLabelsFa: {
    meanReactionTimeMs: 'میانگین زمان پاسخ (میلی‌ثانیه)',
  },
}
