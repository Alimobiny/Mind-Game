import type { ExerciseMeta } from '../../../../core/registry/game-registry'

/**
 * متادیتای کامل «استرووپ» — منبع یگانه برای کاتالوگ (catalog.ts)،
 * رجیستری و فهرست مرجع. id/version/contentVersion باید با engine یکی
 * بماند — نگهبان: registry-invariants.test.ts.
 */
export const STROOP_META_FA: ExerciseMeta = {
  id: 'stroop',
  nameFa: 'استرووپ',
  descriptionFa: 'رنگِ جوهرِ کلمه را انتخاب کن، نه معنی کلمه را — تمرین کلاسیک مهار تداخل.',
  domain: 'attention-control',
  exerciseType: 'verbal',
  family: 'stroop',
  nameEn: 'Stroop Task',
  keywordsFa: ['استروپ', 'مهار تداخل', 'رنگ جوهر'],
  effects: ['attention-control', 'processing-speed'],
  version: '1.0.0',
  contentVersion: '2',
  instructionsFa: [
    'نام یک رنگ با جوهرِ رنگ دیگری نوشته می‌شود.',
    'فقط رنگِ جوهر (رنگی که کلمه با آن نوشته شده) را انتخاب کن.',
    'به معنی کلمه توجه نکن — همین تداخل است که تمرین را می‌سازد.',
    '۲۰ محرک در هر جلسه؛ با بالا رفتن سطح، ناهم‌خوان‌ها بیشتر و زمان کمتر می‌شود.',
  ],
  difficultyLevels: [1, 2, 3, 4, 5],
  plannedTrials: 18,
  metricLabelsFa: {
    congruentAccuracy: 'دقت محرک‌های هم‌خوان (٪)',
    incongruentAccuracy: 'دقت محرک‌های ناهم‌خوان (٪)',
    stroopCostMs: 'هزینه استروپ (میلی‌ثانیه)',
  },
}
