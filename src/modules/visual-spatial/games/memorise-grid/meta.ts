import type { ExerciseMeta } from '../../../../core/registry/game-registry'

/**
 * متادیتای کامل «شبکه حافظه» — منبع یگانه برای کاتالوگ (catalog.ts)،
 * رجیستری و فهرست مرجع. id/version/contentVersion باید با engine یکی
 * بماند — نگهبان: registry-invariants.test.ts.
 */
export const MEMORISE_GRID_META_FA: ExerciseMeta = {
  id: 'memorise-grid',
  nameFa: 'شبکه حافظه',
  descriptionFa: 'مکان خانه‌های روشن شبکه را به خاطر بسپار و همان‌ها را انتخاب کن.',
  domain: 'visual-spatial',
  exerciseType: 'spatial',
  family: 'grid-span',
  nameEn: 'Memorise Grid (Grid Span)',
  keywordsFa: ['دهانه شبکه', 'حافظه دیداری', 'بازسازی مکان'],
  effects: ['visual-spatial', 'working-memory'],
  version: '1.0.0',
  contentVersion: '2',
  instructionsFa: [
    'چند خانه از شبکه کوتاه روشن می‌شوند.',
    'مکان آن‌ها را به خاطر بسپار.',
    'پس از خاموش‌شدن، همان خانه‌ها را انتخاب و تأیید کن.',
    '۱۰ مرحله در هر جلسه؛ شبکه بزرگ‌تر و خانه‌های بیشتر با سطح بالاتر.',
  ],
  difficultyLevels: [1, 2, 3, 4, 5],
  plannedTrials: 10,
  metricLabelsFa: {
    meanOverlapRate: 'میانگین خانه‌های به‌خاطرسپرده‌شده (٪)',
    gridSize: 'ابعاد شبکه',
    activeCells: 'تعداد خانه‌های هدف',
  },
}
