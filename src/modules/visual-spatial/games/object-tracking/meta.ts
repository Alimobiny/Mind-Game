import type { ExerciseMeta } from '../../../../core/registry/game-registry'

/**
 * متادیتای فارسی «دنبال‌کردن اشیا» برای ثبت مرکزی — هماهنگ‌کننده این شیء را
 * در Registry با id/domain/version/contentVersion از engine ترکیب می‌کند.
 */
export const OBJECT_TRACKING_META_FA: Pick<
  ExerciseMeta,
  'nameFa' | 'descriptionFa' | 'exerciseType' | 'effects' | 'instructionsFa' | 'difficultyLevels' | 'plannedTrials' | 'metricLabelsFa'
> = {
  nameFa: 'دنبال‌کردن اشیا',
  exerciseType: 'visual',
  effects: ['visual-spatial', 'attention-control'],
  descriptionFa:
    'چند دایرهٔ هدف را به خاطر بسپار و در میان حرکت همهٔ دایره‌ها فقط همان‌ها را دنبال کن؛ در پایان بگو کدام‌ها بودند.',
  instructionsFa: [
    'در هر مرحله چند دایره می‌بینی؛ تعدادی از آن‌ها چند لحظه روشن می‌شوند — همان‌ها هدف‌اند.',
    'سپس همهٔ دایره‌ها یکسان به حرکت درمی‌آیند و از دیواره‌ها بازمی‌گردند؛ با چشم فقط اهداف را دنبال کن.',
    'در پایان حرکت، دایره‌ها ثابت و شماره‌گذاری می‌شوند؛ شمارهٔ اهدافی که به خاطر داری را با دکمه‌های زیر بوم انتخاب کن.',
    'وقتی به تعداد لازم انتخاب کردی، «تأیید» را بزن؛ انتخاب‌ها را پیش از تأیید می‌توانی برداری.',
    'با بالارفتن سطح، تعداد دایره‌ها و اهداف بیشتر و حرکت تندتر و طولانی‌تر می‌شود.',
  ],
  difficultyLevels: [1, 2, 3, 4, 5],
  plannedTrials: 8,
  metricLabelsFa: {
    targetOverlapRate: 'میانگین اهداف درست (٪)',
    objectCount: 'تعداد اشیا',
    targetCount: 'تعداد اهداف',
  },
}
