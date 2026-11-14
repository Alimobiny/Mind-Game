import type { ExerciseMeta } from '../../../../core/registry/game-registry'

/**
 * متادیتای کامل «زمان واکنش» — منبع یگانه برای کاتالوگ (catalog.ts)،
 * رجیستری و فهرست مرجع. id/version/contentVersion باید با engine یکی
 * بماند — نگهبان: registry-invariants.test.ts.
 */
export const REACTION_TIME_META_FA: ExerciseMeta = {
  id: 'reaction-time',
  nameFa: 'زمان واکنش',
  descriptionFa: 'به محض ظاهرشدن دایره، هرچه سریع‌تر بزن؛ زودتر از موعد نزن.',
  domain: 'sensorimotor',
  exerciseType: 'reaction',
  family: 'reaction-time',
  nameEn: 'Simple Reaction Time',
  keywordsFa: ['سرعت واکنش', 'واکنش سریع', 'RT'],
  effects: ['sensorimotor', 'processing-speed'],
  version: '1.0.0',
  contentVersion: '2',
  instructionsFa: [
    'پس از شروع، صفحه ساکت می‌ماند — صبر کن.',
    'به محض ظاهرشدن دایره درخشان، سریع بزن.',
    'زدنِ پیش از ظاهرشدن محرک، «پیش‌دستی» ثبت می‌شود.',
    '۱۰ محرک در هر جلسه؛ میانه و بهترین زمان واکنشت گزارش می‌شود.',
  ],
  difficultyLevels: [1, 2, 3, 4, 5],
  plannedTrials: 10,
  metricLabelsFa: {
    medianReactionTimeMs: 'میانه زمان واکنش (میلی‌ثانیه)',
    bestReactionTimeMs: 'بهترین زمان واکنش (میلی‌ثانیه)',
    meanReactionTimeMs: 'میانگین زمان واکنش (میلی‌ثانیه)',
    anticipationErrors: 'خطای پیش‌دستی',
    tooSlowErrors: 'پاسخ دیرهنگام',
  },
}
