import type { ExerciseMeta } from '../../../../core/registry/game-registry'

/**
 * متادیتای کامل «ان-بک دوگانه» — منبع یگانه برای کاتالوگ (catalog.ts)،
 * رجیستری و فهرست مرجع. id/version/contentVersion باید با engine یکی
 * بماند — نگهبان: registry-invariants.test.ts.
 */
export const DUAL_NBACK_META_FA: ExerciseMeta = {
  id: 'dual-n-back',
  nameFa: 'ان-بک دوگانه',
  descriptionFa:
    'هم‌زمان حرف و مکان دنبال کن: اگر هر کدام با N مرحله قبل یکی بود، دکمهٔ همان جریان را بزن.',
  domain: 'working-memory',
  exerciseType: 'visual',
  family: 'dual-n-back',
  nameEn: 'Dual N-Back',
  keywordsFa: ['انبک دوگانه', 'dual n back', 'دو جریان'],
  effects: ['working-memory', 'attention-control'],
  version: '1.0.0',
  contentVersion: '2',
  instructionsFa: [
    'در هر مرحله هم‌زمان یک حرف بالای صفحه و یک خانهٔ روشن در شبکهٔ ۳×۳ دیده می‌شود.',
    'اگر حرف فعلی با حرفِ N مرحله قبل یکی بود، «تطبیق حرف» را بزن.',
    'اگر مکان خانهٔ فعال با N مرحله قبل یکی بود، «تطبیق مکان» را بزن.',
    'هر دو، یکی، یا هیچ‌کدام می‌تواند مطابقت داشته باشد — هر جریان جداگانه سنجیده می‌شود.',
    'با بالا رفتن سطح، N و سرعت نمایش بیشتر می‌شود؛ پاسخ دیرهنگام بی‌پاسخ ثبت می‌شود.',
  ],
  difficultyLevels: [1, 2, 3, 4, 5],
  plannedTrials: 24,
  metricLabelsFa: {
    letterHits: 'تطبیق‌های درستِ حرف',
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
