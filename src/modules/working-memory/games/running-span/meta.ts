import type { ExerciseMeta } from '../../../../core/registry/game-registry'

/**
 * متادیتای کامل «دهانهٔ جاری» — موج نهم؛ سنجش به‌روزرسانی خالص. منبع یگانه
 * برای کاتالوگ، رجیستری و فهرست مرجع. id/version/contentVersion باید با
 * engine یکی بماند — نگهبان: registry-invariants.test.ts.
 */
export const RUNNING_SPAN_META_FA: ExerciseMeta = {
  id: 'running-span',
  nameFa: 'دهانهٔ جاری',
  descriptionFa:
    'ارقام سریع می‌گذرند و نمی‌دانی کی تمام می‌شوند — به‌محض توقف، چند رقم آخر را به ترتیب وارد کن.',
  domain: 'working-memory',
  exerciseType: 'numeric',
  family: 'running-span',
  nameEn: 'Running Span',
  keywordsFa: ['به روزرسانی', 'ارقام آخر', 'پایان پیش بینی ناپذیر'],
  effects: ['working-memory'],
  version: '1.0.0',
  contentVersion: '2',
  instructionsFa: [
    'ارقام یکی‌یکی و سریع نمایش داده می‌شوند.',
    'طول جریان اعلام نمی‌شود — نمی‌دانی کی تمام می‌شود، پس مدام «آخرین ارقام» را در ذهن نگه دار.',
    'به‌محض توقف جریان، چند رقم آخر (۳ تا ۵ رقم بسته به سطح) را به همان ترتیب وارد کن.',
    'شمردن از ابتدا کمکی نمی‌کند — ترفند این بازی به‌روزرسانی مداوم است، نه مرور ذهنی.',
    '۱۰ جریان در هر جلسه؛ با بالا رفتن سطح، عمق یادآوری بیشتر و نمایش تندتر می‌شود.',
  ],
  difficultyLevels: [1, 2, 3, 4, 5],
  plannedTrials: 5,
  metricLabelsFa: {
    lastNInOrderRate: 'میانگین ارقام درست در جای درست از دنبالهٔ انتظار (٪)',
    partialCreditScore: 'امتیاز اعتبار جزئی (٪)',
    itemErrors: 'خطای قلم (رقم خارج از دنبالهٔ انتظار)',
    orderErrors: 'خطای ترتیب (رقم درست در جای غلط)',
    primacyIntrusionRate: 'نرخ تهاجم آغازین — فرورفتن ارقام قدیمی (٪)',
    recallDepth: 'عمق یادآوری',
  },
}
