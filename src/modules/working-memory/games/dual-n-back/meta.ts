import type { ExerciseMeta } from '../../../../core/registry/game-registry'

/**
 * متادیتای فارسی «ان-بک دوگانه» برای ثبت مرکزی — هماهنگ‌کننده این شیء را
 * در Registry با id/domain/version/contentVersion از engine ترکیب می‌کند.
 */
export const DUAL_NBACK_META_FA: Pick<
  ExerciseMeta,
  'nameFa' | 'descriptionFa' | 'exerciseType' | 'effects' | 'instructionsFa' | 'difficultyLevels' | 'plannedTrials' | 'metricLabelsFa'
> = {
  nameFa: 'ان-بک دوگانه',
  descriptionFa:
    'هم‌زمان حرف و مکان دنبال کن: اگر هر کدام با N مرحله قبل یکی بود، دکمهٔ همان جریان را بزن.',
  exerciseType: 'visual',
  effects: ['working-memory', 'attention-control'],
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
  },
}
