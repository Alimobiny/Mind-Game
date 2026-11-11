import type { ExerciseMeta } from '../../../../core/registry/game-registry'

/**
 * متادیتای فارسی «ساعت آینه‌ای» برای ثبت مرکزی — هماهنگ‌کننده این شیء را
 * در Registry با id/domain/version/contentVersion از engine ترکیب می‌کند.
 */
export const MIRROR_CLOCK_META_FA: Pick<
  ExerciseMeta,
  'nameFa' | 'descriptionFa' | 'exerciseType' | 'effects' | 'instructionsFa' | 'difficultyLevels' | 'plannedTrials' | 'metricLabelsFa'
> = {
  nameFa: 'ساعت آینه‌ای',
  exerciseType: 'spatial',
  effects: ['visual-spatial', 'reasoning'],
  descriptionFa:
    'ساعت آنالوگ را در آینه ببین و زمان واقعی را از میان چهار گزینه تشخیص بده؛ چرخش ذهنی و تصویرسازی دیداری را تمرین می‌کند.',
  instructionsFa: [
    'در هر مرحله یک ساعت آنالوگ می‌بینی که کامل در آینه بازتاب یافته — صفحه، اعداد و عقربه‌ها همه آینه‌ای‌اند.',
    'زمان واقعی ساعت را در ذهنت بازسازی کن؛ انگار آینه را کنار می‌زنی.',
    'از میان چهار گزینهٔ «ساعت:دقیقه» فقط یکی درست است — با لمس انتخاب کن.',
    'گزینه‌های نزدیک، خطاهای رایج خوانش آینه‌اند (خوانش مستقیم صفحهٔ آینه‌ای، جابه‌جایی عقربه‌ها، ±۵ دقیقه)؛ دقت ملاک است، نه سرعتِ صرف.',
    'در سطح‌های بالاتر آینهٔ افقی و قطری، دقیقه‌های تک‌دار و مهلت زمانی اضافه می‌شود.',
  ],
  difficultyLevels: [1, 2, 3, 4, 5],
  plannedTrials: 12,
  metricLabelsFa: {
    naiveMirrorErrorCount: 'خطای خوانش آینه‌ای (انتخاب زمانِ آینه‌ای)',
    swapErrorCount: 'خطای جابه‌جایی نقش عقربه‌ها',
  },
}
