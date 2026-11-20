import type { ExerciseMeta } from '../../../../core/registry/game-registry'

/**
 * متادیتای کامل «واژهٔ به‌هم‌ریخته» — موج زبانی. منبع یگانه برای کاتالوگ،
 * رجیستری و فهرست مرجع. id/version/contentVersion باید با engine یکی
 * بماند — نگهبان: registry-invariants.test.ts.
 */
export const WORD_SCRAMBLE_META_FA: ExerciseMeta = {
  id: 'word-scramble',
  nameFa: 'واژهٔ به‌هم‌ریخته',
  descriptionFa:
    'حروف یک واژه به‌هم ریخته‌اند — با لمس به ترتیب، واژه را از نو بساز و به یاد بیاور.',
  domain: 'verbal-auditory',
  exerciseType: 'verbal',
  family: 'anagram',
  nameEn: 'Word Scramble (Anagram)',
  keywordsFa: ['آناماگرام', 'واژه بهم ریخته', 'بازسازی واژه'],
  effects: ['verbal-auditory', 'working-memory'],
  version: '1.0.0',
  contentVersion: '2',
  instructionsFa: [
    'حروف یک واژهٔ فارسی به‌هم ریخته و به‌صورت کاشی نمایش داده می‌شوند.',
    'به ترتیب روی حروف بزن تا واژه در نوار بالا ساخته شود؛ «برگشت آخر» آخرین حرف را برمی‌گرداند.',
    'وقتی واژه کامل شد، «تأیید» را بزن.',
    'در سطح‌های بالاتر واژه‌ها طولانی‌تر می‌شوند و از سطح ۴، یک «حرف فریب» هم میان حروف است که نباید استفاده کنی.',
    'مرحله مهلت ندارد — با آرامش به یاد بیاور.',
  ],
  difficultyLevels: [1, 2, 3, 4, 5],
  plannedTrials: 6,
  metricLabelsFa: {
    meanAnswerTimeMs: 'میانگین زمان پاسخ (میلی‌ثانیه)',
    decoyTrials: 'مراحل دارای حرف فریب',
  },
}
