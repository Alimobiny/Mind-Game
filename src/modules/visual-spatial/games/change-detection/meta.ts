import type { ExerciseMeta } from '../../../../core/registry/game-registry'

/**
 * متادیتای فارسی «تشخیص تغییر» — موج دهم؛ پارادایم Luck & Vogel.
 */
export const CHANGE_DETECTION_META_FA: Pick<
  ExerciseMeta,
  'nameFa' | 'descriptionFa' | 'exerciseType' | 'effects' | 'instructionsFa' | 'difficultyLevels' | 'plannedTrials' | 'metricLabelsFa'
> = {
  nameFa: 'تشخیص تغییر',
  descriptionFa:
    'چند مربع رنگی کوتاه دیده می‌شود؛ در نمایش دوم قضاوت کن: یکی از رنگ‌ها عوض شده یا نه.',
  exerciseType: 'visual',
  effects: ['visual-spatial'],
  instructionsFa: [
    'آرایه‌ای از مربع‌های رنگی حدود نیم‌ثانیه نمایش داده می‌شود.',
    'پس از یک فاصلهٔ خالی کوتاه، همان آرایه دوباره می‌آید — که یکی از رنگ‌ها ممکن است عوض شده باشد.',
    'فقط دوداوری می‌کنی: «تغییر کرد» یا «تغییر نکرد». سرعت کمتر مهم است؛ دقت حافظهٔ دیداری مهم است.',
    'گزارش «k» تخمین ظرفیت حافظهٔ کاری دیداری است و با فرمول استانداردِ تصحیح حدس محاسبه می‌شود: اندازهٔ آرایه × (نرخ تشخیص تغییر واقعی − نرخ زنگ‌خطر برای تغییر غیرواقعی). این یک سنجهٔ پژوهشی است، نه ارزیابی بالینی.',
    '۱۶ مرحله در هر جلسه؛ با بالا رفتن سطح، آرایه بزرگ‌تر (۲ تا ۸ مربع) و فاصلهٔ خالی طولانی‌تر می‌شود.',
  ],
  difficultyLevels: [1, 2, 3, 4, 5],
  plannedTrials: 16,
  metricLabelsFa: {
    hitRate: 'تشخیص تغییرهای واقعی (٪)',
    falseAlarmRate: 'زنگ‌خطر برای تغییرهای غیرواقعی (٪)',
    kEstimate: 'تخمین ظرفیت حافظهٔ دیداری k = N×(درستی−زنگ‌خطر)',
    meanArraySize: 'میانگین اندازهٔ آرایه (مربع)',
    changedTrials: 'مراحل با تغییر واقعی',
    unchangedTrials: 'مراحل بدون تغییر',
  },
}
