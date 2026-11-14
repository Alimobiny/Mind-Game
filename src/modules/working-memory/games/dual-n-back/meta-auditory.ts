import type { ExerciseMeta } from '../../../../core/registry/game-registry'

/**
 * متادیتای کامل «ان-بک دوگانهٔ شنیداری» — موج دهم. همان منطق گونهٔ
 * دیداری (کارخانهٔ engine مشترک)؛ جریان حرف با صدای محلی دستگاه ارائه
 * می‌شود و بدون صدای فارسی به نمایش دیداری برمی‌گردد. id/version/
 * contentVersion باید با engine یکی بماند — نگهبان: registry-invariants.
 */
export const DUAL_NBACK_AUDITORY_META_FA: ExerciseMeta = {
  id: 'dual-n-back-auditory',
  nameFa: 'ان-بک دوگانهٔ شنیداری',
  descriptionFa:
    'حرف‌ها را «بشنو» و مکان‌ها را ببین؛ اگر هر کدام با N مرحله قبل یکی بود، دکمهٔ همان جریان را بزن.',
  domain: 'working-memory',
  exerciseType: 'verbal',
  family: 'dual-n-back',
  nameEn: 'Dual N-Back (Auditory)',
  keywordsFa: ['انبک دوگانه شنیداری', 'انبک صوتی', 'شنیداری'],
  effects: ['working-memory', 'verbal-auditory'],
  version: '1.0.0',
  contentVersion: '2',
  instructionsFa: [
    'در هر مرحله یک حرف با صدای دستگاه گفته می‌شود و هم‌زمان یک خانهٔ روشن در شبکهٔ ۳×۳ دیده می‌شود.',
    'اگر حرف شنیده‌شده با N مرحله قبل یکی بود، «تطبیق حرف» را بزن.',
    'اگر مکان خانهٔ فعال با N مرحله قبل یکی بود، «تطبیق مکان» را بزن.',
    'هر دو، یکی، یا هیچ‌کدام می‌تواند مطابقت داشته باشد — هر جریان جداگانه سنجیده می‌شود.',
    'اگر دستگاه صدای فارسی نداشته باشد، حرف‌ها به‌جای شنیدن نمایش داده می‌شوند و بازی یکسان می‌گذرد.',
    'با بالا رفتن سطح، N و سرعت ارائه بیشتر می‌شود؛ پاسخ دیرهنگام بی‌پاسخ ثبت می‌شود.',
  ],
  difficultyLevels: [1, 2, 3, 4, 5],
  plannedTrials: 24,
  metricLabelsFa: {
    letterHits: 'تطبیق‌های درستِ حرف شنیده‌شده',
    letterMisses: 'اهداف حرف ازقلم‌افتاده',
    letterFalseAlarms: 'تطبیق‌های نابجای حرف',
    letterCorrectRejections: 'خودداری‌های درستِ حرف',
    cellHits: 'تطبیق‌های درستِ مکان',
    cellMisses: 'اهداف مکان ازقلم‌افتاده',
    cellFalseAlarms: 'تطبیق‌های نابجای مکان',
    cellCorrectRejections: 'خودداری‌های درستِ مکان',
    dPrimeLetter: 'حساسیت d′ جریان حرف (loglinear)',
    dPrimeCell: 'حساسیت d′ جریان مکان (loglinear)',
  },
}
