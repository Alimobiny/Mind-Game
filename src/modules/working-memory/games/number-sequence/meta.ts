import type { ExerciseMeta } from '../../../../core/registry/game-registry'

/**
 * متادیتای کامل «توالی اعداد» — منبع یگانه برای کاتالوگ (catalog.ts)،
 * رجیستری و فهرست مرجع (docs/GAMES-CATALOG.md). id/version/contentVersion
 * باید با engine یکی بماند — نگهبان: registry-invariants.test.ts.
 */
export const NUMBER_SEQUENCE_META_FA: ExerciseMeta = {
  id: 'number-sequence',
  nameFa: 'توالی اعداد',
  descriptionFa: 'ارقام یکی‌یکی نمایش داده می‌شوند؛ باید همان ترتیب را از حافظه بازسازی کنی.',
  domain: 'working-memory',
  exerciseType: 'numeric',
  family: 'digit-span',
  nameEn: 'Number Sequence (Digit Span)',
  keywordsFa: ['دهانه ارقام', 'حافظه ارقام', 'بازسازی توالی'],
  effects: ['working-memory'],
  version: '1.0.0',
  contentVersion: '2',
  instructionsFa: [
    'ارقام به‌ترتیب و یکی‌یکی روی صفحه ظاهر می‌شوند.',
    'توالی را به همان ترتیب به خاطر بسپار.',
    'پس از پنهان‌شدن ارقام، همان ترتیب را با صفحه‌کلید وارد کن.',
    '۱۰ مرحله در هر جلسه؛ با بالا رفتن سطح، توالی طولانی‌تر و سریع‌تر می‌شود.',
  ],
  difficultyLevels: [1, 2, 3, 4, 5],
  plannedTrials: 10,
  metricLabelsFa: {
    meanCorrectPositionRate: 'میانگین ارقام درست در جای درست (٪)',
    sequenceLength: 'طول توالی',
  },
}
