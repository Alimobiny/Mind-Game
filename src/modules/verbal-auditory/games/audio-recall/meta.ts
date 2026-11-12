import type { ExerciseMeta } from '../../../../core/registry/game-registry'

/**
 * متادیتای فارسی «یادآوری شنیداری» — موج زبانی.
 */
export const AUDIO_RECALL_META_FA: Pick<
  ExerciseMeta,
  'nameFa' | 'descriptionFa' | 'exerciseType' | 'effects' | 'instructionsFa' | 'difficultyLevels' | 'plannedTrials' | 'metricLabelsFa'
> = {
  nameFa: 'یادآوری شنیداری',
  descriptionFa:
    'واژه‌ها را یکی‌یکی بشنو و بعد به همان ترتیب از میان گزینه‌ها بازیابی کن.',
  exerciseType: 'verbal',
  effects: ['verbal-auditory', 'working-memory'],
  instructionsFa: [
    'چند واژه یکی‌یکی و با فاصله ارائه می‌شود — با صدای دستگاه می‌شنوی و باید به همان ترتیب به خاطر بسپاری.',
    'پایان ارائه، جدولی از واژه‌ها می‌آید؛ واژه‌های همان دسته را به همان ترتیبی که شنیدی لمس کن و تأیید بزن.',
    'ترتیب مهم است — فقط جایگاه درست امتیاز دارد و توالی کامل جداگانه گزارش می‌شود.',
    'اگر دستگاه صدای فارسی نداشته باشد، واژه‌ها به‌جای شنیدن یکی‌یکی نمایش داده می‌شوند — چالش همان می‌ماند.',
    'با بالا رفتن سطح، تعداد واژه‌ها (دهانه) بیشتر و سرعت ارائه بیشتر می‌شود.',
  ],
  difficultyLevels: [1, 2, 3, 4, 5],
  plannedTrials: 6,
  metricLabelsFa: {
    spanCount: 'دهانه (تعداد واژه)',
    positionMatchRate: 'نرخ جایگاه درست (٪)',
    exactSequences: 'توالی‌های کامل',
  },
}
