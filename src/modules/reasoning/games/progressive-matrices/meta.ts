import type { ExerciseMeta } from '../../../../core/registry/game-registry'

/**
 * متادیتای فارسی «ماتریس پیشرونده» — موج دهم؛ خانوادهٔ قواعد کامل ریون.
 */
export const PROGRESSIVE_MATRICES_META_FA: Pick<
  ExerciseMeta,
  'nameFa' | 'descriptionFa' | 'exerciseType' | 'effects' | 'instructionsFa' | 'difficultyLevels' | 'plannedTrials' | 'metricLabelsFa'
> = {
  nameFa: 'ماتریس پیشرونده',
  descriptionFa:
    'ماتریس ۳×۳ نمادهایی که زیر قاعده‌های پنهان شکل، رنگ و تعداد چیده شده‌اند — خانهٔ خالی را کامل کن.',
  exerciseType: 'logic',
  effects: ['reasoning'],
  instructionsFa: [
    'ماتریس ۳×۳ نمادهای چندصفته (شکل، رنگ، تعداد) دیده می‌شود و خانهٔ پایین-راست خالی است.',
    'قاعده‌ها در سطرها و ستون‌ها پنهان‌اند: توزیع سه‌تایی مقادیر، پیشروی عددی، عمل منطقی روی صفت‌ها، یا چیدمان موقعیتی.',
    'در سطوح بالاتر چند قاعده هم‌زمان کار می‌کنند — مثلاً شکل با یک قاعده و تعداد با قاعده‌ای دیگر.',
    'گزینه‌ای که همهٔ قاعده‌ها را برآورده کند دقیقاً یکی است؛ نزدیک‌ترین گزینه‌های فریبنده عمداً فقط یک صفت را نقض می‌کنند.',
    '۱۲ مرحله در هر جلسه؛ بازی غیرزمانی است — تحلیل دقیق مهم‌تر از سرعت است.',
  ],
  difficultyLevels: [1, 2, 3, 4, 5],
  plannedTrials: 12,
  metricLabelsFa: {
    difficultyWeightedScore: 'دقت وزنی با هم‌زمانی قواعد (٪)',
    meanRtMs: 'میانگین زمان پاسخ (میلی‌ثانیه)',
    maxSimultaneousRules: 'بیشترین هم‌زمانی قواعد در جلسه',
    accuracyDist3: 'دقت مراحل با قاعدهٔ توزیع سه‌تایی (٪)',
    accuracyProgression: 'دقت مراحل با قاعدهٔ پیشروی عددی (٪)',
    accuracyLogicalOp: 'دقت مراحل با عمل منطقی (٪)',
    accuracyPositional: 'دقت مراحل با چیدمان موقعیتی (٪)',
  },
}
