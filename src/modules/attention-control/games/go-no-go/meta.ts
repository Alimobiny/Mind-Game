import type { ExerciseMeta } from '../../../../core/registry/game-registry'

/**
 * متادیتای کامل «برو / نرو» — منبع یگانه برای کاتالوگ (catalog.ts)،
 * رجیستری و فهرست مرجع. id/version/contentVersion باید با engine یکی
 * بماند — نگهبان: registry-invariants.test.ts.
 */
export const GO_NO_GO_META_FA: ExerciseMeta = {
  id: 'go-no-go',
  nameFa: 'برو / نرو',
  descriptionFa: 'به دایره سریع واکنش نشان بده و به مربع هیچ واکنشی نشان نده.',
  domain: 'attention-control',
  exerciseType: 'reaction',
  family: 'go-no-go',
  nameEn: 'Go/No-Go',
  keywordsFa: ['برونرو', 'گو نگو', 'مهار پاسخ', 'مهار تکانه'],
  effects: ['attention-control'],
  version: '1.0.0',
  contentVersion: '2',
  instructionsFa: [
    'دایره سبز = برو: در سریع‌ترین زمان روی صفحه بزن.',
    'مربع قرمز = نرو: دست خود را نگه دار و واکنش نشان نده.',
    'واکنش به مربع «خطای ارتکاب» و بی‌واکنشی به دایره «خطای ازقلم‌افتادن» ثبت می‌شود.',
    '۴۰ محرک در هر جلسه؛ با بالا رفتن سطح، زمان کمتری برای تصمیم داری.',
  ],
  difficultyLevels: [1, 2, 3, 4, 5],
  plannedTrials: 40,
  metricLabelsFa: {
    commissionErrors: 'خطای ارتکاب (واکنش به مربع)',
    omissionErrors: 'خطای ازقلم‌افتادن (بی‌واکنشی به دایره)',
    medianGoReactionTimeMs: 'میانه واکنش به دایره (میلی‌ثانیه)',
    goTrials: 'تعداد محرک برو',
    nogoTrials: 'تعداد محرک نرو',
  },
}
