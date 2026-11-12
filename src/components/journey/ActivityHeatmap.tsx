import type { HeatCell } from '../../analytics/journey'
import { JOURNEY_TEXTS_FA } from '../../i18n/fa'
import styles from './activity-heatmap.module.css'

/**
 * تقویم فعالیت (نقشهٔ حرارتی) — کامپوننت مشترک صفحهٔ «سیر پیشرفت» (۱۲ هفته)
 * و نسخهٔ فشردهٔ صفحهٔ اول. داده از buildHeatmapWeeks می‌آید؛ ظرف ltr است تا
 * ستون‌های زمانی (کهنه → جدید) چپ‌به‌راست خوانا باشند.
 */
export function ActivityHeatmap({
  weeks,
  compact = false,
}: {
  weeks: ReadonlyArray<ReadonlyArray<HeatCell>>
  compact?: boolean
}) {
  return (
    <div
      className={`${styles.heatmap} ${compact ? styles.compact : ''}`}
      role="img"
      aria-label={JOURNEY_TEXTS_FA.heatmapLabel}
    >
      {weeks.map((week, wi) => (
        <div className={styles.heatColumn} key={wi}>
          {week.map((cell) => (
            <span
              key={cell.isoDate}
              className={styles.heatCell}
              data-testid="heat-cell"
              data-level={cell.level}
              title={`${cell.isoDate} — ${JOURNEY_TEXTS_FA.heatmapCellTitle(cell.completedSessions)}`}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
