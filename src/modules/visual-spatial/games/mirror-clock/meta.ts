import type { ExerciseMeta } from '../../../../core/registry/game-registry'

/**
 * متادیتای کامل «ساعت آینه‌ای» — منبع یگانه برای کاتالوگ، رجیستری و فهرست
 * مرجع. id/version/contentVersion باید با engine یکی بماند — نگهبان:
 * registry-invariants.test.ts.
 */
export const MIRROR_CLOCK_META_FA: ExerciseMeta = {
  id: 'mirror-clock',
  nameFa: 'ساعت آینه‌ای',
  domain: 'visual-spatial',
  exerciseType: 'spatial',
  family: 'mirror-reading',
  nameEn: 'Mirror Clock (Mirror Reading)',
  keywordsFa: ['آینه', 'ساعت آنالوگ', 'بازتاب'],
  effects: ['visual-spatial', 'reasoning'],
  version: '1.0.0',
  contentVersion: '1',
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
  plannedTrials: 7,
  metricLabelsFa: {
    naiveMirrorErrorCount: 'خطای خوانش آینه‌ای (انتخاب زمانِ آینه‌ای)',
    swapErrorCount: 'خطای جابه‌جایی نقش عقربه‌ها',
  },
}
