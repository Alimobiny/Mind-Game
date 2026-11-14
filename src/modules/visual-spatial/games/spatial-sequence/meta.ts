import type { ExerciseMeta } from '../../../../core/registry/game-registry'

/**
 * متادیتای کامل «توالی مکانی» — منبع یگانه برای کاتالوگ (catalog.ts)،
 * رجیستری و فهرست مرجع. id/version/contentVersion باید با engine یکی
 * بماند — نگهبان: registry-invariants.test.ts.
 */
export const SPATIAL_SEQUENCE_META_FA: ExerciseMeta = {
  id: 'spatial-sequence',
  nameFa: 'توالی مکانی',
  descriptionFa: 'خانه‌ها یکی‌یکی و به‌ترتیب روشن می‌شوند؛ همان ترتیب را بازسازی کن.',
  domain: 'visual-spatial',
  exerciseType: 'spatial',
  family: 'corsi',
  nameEn: 'Spatial Sequence (Corsi Block-Tapping)',
  keywordsFa: ['کورسی', 'بلوک تپینگ', 'توالی خانه‌ها'],
  effects: ['visual-spatial', 'working-memory'],
  version: '1.0.0',
  contentVersion: '2',
  instructionsFa: [
    'خانه‌های شبکه یکی‌یکی و به‌ترتیب روشن می‌شوند.',
    'ترتیب روشن‌شدن را به خاطر بسپار.',
    'پس از اتمام، همان خانه‌ها را به همان ترتیب بزن و تأیید کن.',
    '۱۰ مرحله در هر جلسه؛ با بالا رفتن سطح، توالی طولانی‌تر می‌شود.',
  ],
  difficultyLevels: [1, 2, 3, 4, 5],
  plannedTrials: 10,
  metricLabelsFa: {
    meanOrderMatchRate: 'میانگین خانه‌های درست در جای درست (٪)',
    gridSize: 'ابعاد شبکه',
    sequenceLength: 'طول توالی',
  },
}
