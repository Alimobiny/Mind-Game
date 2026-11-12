import type { ExerciseMeta } from '../../../../core/registry/game-registry'

/**
 * متادیتای فارسی «واژهٔ به‌هم‌ریخته» — موج زبانی.
 */
export const WORD_SCRAMBLE_META_FA: Pick<
  ExerciseMeta,
  'nameFa' | 'descriptionFa' | 'exerciseType' | 'effects' | 'instructionsFa' | 'difficultyLevels' | 'plannedTrials' | 'metricLabelsFa'
> = {
  nameFa: 'واژهٔ به‌هم‌ریخته',
  descriptionFa:
    'حروف یک واژه به‌هم ریخته‌اند — با لمس به ترتیب، واژه را از نو بساز و به یاد بیاور.',
  exerciseType: 'verbal',
  effects: ['verbal-auditory', 'working-memory'],
  instructionsFa: [
    'حروف یک واژهٔ فارسی به‌هم ریخته و به‌صورت کاشی نمایش داده می‌شوند.',
    'به ترتیب روی حروف بزن تا واژه در نوار بالا ساخته شود؛ «برگشت آخر» آخرین حرف را برمی‌گرداند.',
    'وقتی واژه کامل شد، «تأیید» را بزن.',
    'در سطح‌های بالاتر واژه‌ها طولانی‌تر می‌شوند و از سطح ۴، یک «حرف فریب» هم میان حروف است که نباید استفاده کنی.',
    'مرحله مهلت ندارد — با آرامش به یاد بیاور.',
  ],
  difficultyLevels: [1, 2, 3, 4, 5],
  plannedTrials: 12,
  metricLabelsFa: {
    meanAnswerTimeMs: 'میانگین زمان پاسخ (میلی‌ثانیه)',
    decoyTrials: 'مراحل دارای حرف فریب',
  },
}
