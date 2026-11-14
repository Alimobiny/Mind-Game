import type { ExerciseMeta } from '../../../../core/registry/game-registry'

/**
 * متادیتای کامل «منطق توالی» — منبع یگانه برای کاتالوگ (catalog.ts)،
 * رجیستری و فهرست مرجع. id/version/contentVersion باید با engine یکی
 * بماند — نگهبان: registry-invariants.test.ts.
 */
export const SEQUENCE_LOGIC_META_FA: ExerciseMeta = {
  id: 'sequence-logic',
  nameFa: 'منطق توالی',
  descriptionFa: 'قاعده پنهان توالی اعداد را کشف کن و عدد بعدی را انتخاب کن.',
  domain: 'reasoning',
  exerciseType: 'logic',
  family: 'number-series',
  nameEn: 'Sequence Logic (Number Series)',
  keywordsFa: ['سری اعداد', 'منطق اعداد', 'قاعده توالی'],
  effects: ['reasoning'],
  version: '1.0.0',
  contentVersion: '1',
  instructionsFa: [
    'توالی‌ای از اعداد با قاعده‌ای پنهان نمایش داده می‌شود.',
    'قاعده را کشف کن (جمعی، ضربی، متناوب و…).',
    'عدد بعدی را از میان ۴ گزینه انتخاب کن.',
    '۱۲ سؤال در هر جلسه؛ با بالا رفتن سطح، قاعده‌ها پیچیده‌تر می‌شوند.',
  ],
  difficultyLevels: [1, 2, 3, 4, 5],
  plannedTrials: 12,
  metricLabelsFa: {
    difficultyWeightedScore: 'امتیاز وزن‌دار سطح',
    avgShownLength: 'میانگین طول توالی',
  },
}
