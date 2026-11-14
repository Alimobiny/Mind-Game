import type { ExerciseMeta } from '../../../../core/registry/game-registry'

/**
 * متادیتای کامل «تکمیل الگو» — منبع یگانه برای کاتالوگ (catalog.ts)،
 * رجیستری و فهرست مرجع. id/version/contentVersion باید با engine یکی
 * بماند — نگهبان: registry-invariants.test.ts.
 */
export const PATTERN_COMPLETION_META_FA: ExerciseMeta = {
  id: 'pattern-completion',
  nameFa: 'تکمیل الگو',
  descriptionFa: 'قاعده سطر و ستون ماتریس را بفهم و خانه خالی را کامل کن.',
  domain: 'reasoning',
  exerciseType: 'logic',
  family: 'pattern-completion',
  nameEn: 'Pattern Completion',
  keywordsFa: ['ماتریس الگو', 'خانه خالی', 'قاعده سطر و ستون'],
  effects: ['reasoning', 'visual-spatial'],
  version: '1.0.0',
  contentVersion: '2',
  instructionsFa: [
    'ماتریس ۳×۳ از نمادهای رنگی نمایش داده می‌شود؛ خانه آخر خالی است.',
    'قاعده سطرها یا ستون‌ها را پیدا کن (تعداد، رنگ یا شکل).',
    'گزینه‌ای که خانه خالی را کامل می‌کند انتخاب کن.',
    '۱۲ سؤال در هر جلسه؛ با بالا رفتن سطح، گزینه‌های گمراه‌کننده شبیه‌تر می‌شوند.',
  ],
  difficultyLevels: [1, 2, 3, 4, 5],
  plannedTrials: 12,
  metricLabelsFa: {
    ruleFamilyVariety: 'تنوع قواعد دیده‌شده',
    difficultyWeightedScore: 'امتیاز وزن‌دار سطح',
  },
}
