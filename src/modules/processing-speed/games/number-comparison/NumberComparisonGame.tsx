import { useEffect, useRef } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
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
 * گردهای صحت:
 *  - قفل submittedRef: تپ دومی روی یک مرحله دوباره submit نمی‌کند؛
 *    قفل فقط با result.accepted === false باز می‌شود.
 *  - پس از result.sessionCompleted === true هرگز advance() صدا زده
 *    نمی‌شود (جلسهٔ کامل‌شده advance را reject می‌کند).
 *  - انقضای مهلت دقیقاً یک‌بار null ثبت می‌کند (همان قفل را می‌بندد).
 */
function formatQuantityFa(value: number, format: NumberDisplayFormat): string {
  return format === 'digits' ? toFaDigits(String(value).split('').join(' ')) : toFaDigits(value)
}

export function NumberComparisonGame({ ctx }: { ctx: ActiveGameContext }) {
  const trial = ctx.trial as NumberComparisonTrial
  const deadlineRef = useRef<number | null>(null)
  const submittedRef = useRef(false)

  // با هر مرحله جدید ریست می‌شود
  useEffect(() => {
    submittedRef.current = false

    // انقضای مهلت پاسخ → ثبت بی‌پاسخی (دقیقاً یک‌بار) و رفتن به مرحله بعد
    const remaining = ctx.timeRemainingMs()
    if (remaining !== null) {
      deadlineRef.current = window.setTimeout(() => {
        if (submittedRef.current) return
        submittedRef.current = true
        void ctx.submit(null).then((result) => {
          if (result.accepted) {
            if (!result.sessionCompleted) ctx.advance()
          } else {
            submittedRef.current = false
          }
        })
      }, remaining)
    }
    return () => {
      if (deadlineRef.current !== null) window.clearTimeout(deadlineRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trial.trialIndex])

  const answer = (side: 'left' | 'right') => {
    if (submittedRef.current || ctx.paused) return
    submittedRef.current = true
    void ctx.submit(side).then((result) => {
      if (result.accepted) {
        // جلسهٔ کامل‌شده: فقط رها کن؛ advance روی جلسهٔ بسته خطا می‌دهد
        if (!result.sessionCompleted) ctx.advance()
      } else {
        // پاسخ رد شد (مثلاً wrong_phase) — قفل باز شود تا مسیر مجدد ممکن بماند
        submittedRef.current = false
      }
    })
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
