import { useEffect } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import { useTrialGuards } from '../../../../components/game/useTrialGuards'
import gameStyles from '../../../../components/game/game.module.css'
import { toFaDigits } from '../../../../utils/format'
import type { NumberComparisonTrial, NumberDisplayFormat } from './engine'
import styles from './number-comparison.module.css'

/**
 * مقایسه اعداد — UI
 *
 * دو عدد بزرگ کنار هم؛ بازیکن روی عدد بزرگ‌تر می‌زند. خودِ اعداد هدف
 * لمسی هستند (نه دکمه‌های جدا) تا نگاشت چپ/راست شهودی بماند: «بزرگ‌تر
 * را بزن».
 *
 * نگاشت چپ/راست (مستند): ظرفِ جفت با dir="ltr" رندر می‌شود تا data-testid
 * «numcmp-left» همیشه سمت فیزیکی چپِ صفحه باشد — مستقل از جهت RTL کل
 * اپ. اعداد فارسی ذاتاً چپ‌به‌راست خوانده می‌شوند، پس این همسویی
 * طبیعی است. پاسخ موتور همین مختصات فیزیکی است: 'left' | 'right'.
 *
 * گردهای صحت (قفل پاسخ + advance امن + مهلتِ دقیقاً یک‌بار با re-arm
 * پس از rollback) همه در useTrialGuards است.
 */
function formatQuantityFa(value: number, format: NumberDisplayFormat): string {
  return format === 'digits' ? toFaDigits(String(value).split('').join(' ')) : toFaDigits(value)
}

export function NumberComparisonGame({ ctx }: { ctx: ActiveGameContext }) {
  const trial = ctx.trial as NumberComparisonTrial
  const guards = useTrialGuards(ctx, trial.trialIndex)

  // با هر مرحله جدید ریست می‌شود
  useEffect(() => {
    // انقضای مهلت پاسخ → ثبت بی‌پاسخی (دقیقاً یک‌بار) و رفتن به مرحله بعد
    const remaining = ctx.timeRemainingMs()
    if (remaining !== null) {
      guards.armDeadline(() => null, remaining)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trial.trialIndex])

  const answer = (side: 'left' | 'right') => {
    if (ctx.paused) return
    void guards.submitOnce(side)
  }

  return (
    <div className={styles.stage}>
      {/* dir=ltr تضمین می‌کند 'left' = سمت فیزیکی چپ، مستقل از RTL صفحه */}
      <div className={styles.pairRow} role="group" aria-label="انتخاب عدد بزرگ‌تر" dir="ltr" key={trial.trialIndex}>
        <button
          type="button"
          className={styles.choiceCard}
          data-testid="numcmp-left"
          data-side="left"
          data-format={trial.leftFormat}
          onClick={() => answer('left')}
          disabled={ctx.paused}
          aria-label="عدد سمت چپ"
        >
          <span className={trial.leftFormat === 'digits' ? styles.digits : styles.numeral}>
            {formatQuantityFa(trial.left, trial.leftFormat)}
          </span>
        </button>
        <span className={styles.separator} aria-hidden="true">
          یا
        </span>
        <button
          type="button"
          className={styles.choiceCard}
          data-testid="numcmp-right"
          data-side="right"
          data-format={trial.rightFormat}
          onClick={() => answer('right')}
          disabled={ctx.paused}
          aria-label="عدد سمت راست"
        >
          <span className={trial.rightFormat === 'digits' ? styles.digits : styles.numeral}>
            {formatQuantityFa(trial.right, trial.rightFormat)}
          </span>
        </button>
      </div>
      <p className={gameStyles.hint}>عدد بزرگ‌تر را هرچه سریع‌تر انتخاب کن</p>
    </div>
  )
}
