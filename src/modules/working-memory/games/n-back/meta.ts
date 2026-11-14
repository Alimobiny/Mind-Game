import type { ExerciseMeta } from '../../../../core/registry/game-registry'

/**
 * متادیتای کامل «ان-بک» — منبع یگانه برای کاتالوگ (catalog.ts)، رجیستری
 * و فهرست مرجع. id/version/contentVersion باید با engine یکی بماند —
 * نگهبان: registry-invariants.test.ts.
 */
export const NBACK_META_FA: ExerciseMeta = {
  id: 'n-back',
  nameFa: 'ان-بک',
  descriptionFa: 'اگر حرف فعلی با حرف N مرحله قبل یکی بود، دکمه تطبیق را بزن.',
  domain: 'working-memory',
  exerciseType: 'verbal',
  family: 'n-back',
  nameEn: 'N-Back',
  keywordsFa: ['انبک', 'ان بک', 'n back', 'تطبیق حرف'],
  effects: ['working-memory', 'attention-control'],
  version: '1.0.0',
  contentVersion: '2',
  instructionsFa: [
    'حروف یکی‌یکی نمایش داده می‌شوند.',
    'اگر حرف فعلی با حرفِ N مرحله قبل یکسان بود، «تطبیق» را بزن.',
    'اگر یکسان نبود، هیچ دکمه‌ای نزن و صبر کن.',
    '۲۵ محرک در هر جلسه؛ با بالا رفتن سطح، N و سرعت نمایش بیشتر می‌شود.',
  ],
  difficultyLevels: [1, 2, 3, 4, 5],
  plannedTrials: 25,
  metricLabelsFa: {
    hits: 'تطبیق‌های درست (hit)',
    misses: 'اهداف ازقلم‌افتاده (miss)',
    falseAlarms: 'تطبیق‌های نابجا (false alarm)',
    correctRejections: 'خودداری‌های درست',
    dPrime: 'حساسیت d′ (loglinear)',
  },
}
