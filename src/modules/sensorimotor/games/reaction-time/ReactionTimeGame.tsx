import { useEffect, useRef, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import gameStyles from '../../../../components/game/game.module.css'
import type { ReactionTimeTrial } from './engine'
import styles from './reaction-time.module.css'

/**
 * زمان واکنش — UI
 *
 * جریان هر مرحله: بازه انتظار («صبر کن…») بدون هیچ محرکی → ظاهرشدن
 * ناگهانی دایرهٔ درخشان «بزن!» → ضربهٔ هرچه سریع‌تر. ضربه در بازه انتظار
 * پیش‌دستی ثبت می‌شود (موتور تشخیص می‌دهد) و بی‌پاسخی تا پایان مهلت کندی.
 * بعد از پاسخ، بلافاصله مرحله بعد می‌آید؛ خودِ بازه انتظار، ریتم بازی است.
 */
export function ReactionTimeGame({ ctx }: { ctx: ActiveGameContext }) {
  const trial = ctx.trial as ReactionTimeTrial
  const [phase, setPhase] = useState<'waiting' | 'stimulus'>('waiting')
  const deadlineRef = useRef<number | null>(null)
  const timersRef = useRef<number[]>([])
  const submittedRef = useRef(false)

  // با هر مرحله جدید ریست می‌شود — و در بازنصبِ پس از مکث، elapsed واقعی
  // از مهلت باقیمانده بازسازی می‌شود: شمارش تأخیر از صفر دوباره باعث
  // می‌شد مهلت «قبل از نمایش محرک» به آتش برسد و کندیِ بی‌محرک ثبت شود
  useEffect(() => {
    submittedRef.current = false
    for (const t of timersRef.current) window.clearTimeout(t)
    timersRef.current = []

    const remaining = ctx.timeRemainingMs()
    const elapsed =
      remaining !== null && trial.responseWindowMs !== null ? trial.responseWindowMs - remaining : 0
    if (elapsed < trial.stimulusDelayMs) {
      setPhase('waiting')
      timersRef.current.push(
        window.setTimeout(() => setPhase('stimulus'), trial.stimulusDelayMs - elapsed),
      )
    } else {
      // تأخیر گذشته — محرک همین حالا باید دیده شود
      setPhase('stimulus')
    }

    // انقضای مهلت کل مرحله → ثبت بی‌پاسخی (کندی) و رفتن به مرحله بعد
    if (remaining !== null) {
      deadlineRef.current = window.setTimeout(() => {
        if (submittedRef.current) return
        submittedRef.current = true
        void ctx.submit(null).then((result) => {
          if (!result.accepted) {
            // persist_failed: مدیر rollback کرده — قفل باز بماند تا تلاش
            // مجدد ممکن باشد (وگرنه جلسه تا abort قفل می‌شد)
            submittedRef.current = false
            return
          }
          if (!result.sessionCompleted) {
            try {
              ctx.advance()
            } catch {
              // جلسه هم‌زمان قطع/تکمیل شده — بی‌اثر
            }
          }
        })
      }, remaining)
    }
    return () => {
      for (const t of timersRef.current) window.clearTimeout(t)
      if (deadlineRef.current !== null) window.clearTimeout(deadlineRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trial.trialIndex])

  const respond = () => {
    if (submittedRef.current || ctx.paused) return
    submittedRef.current = true
    // در بازه انتظار هم 'tap' ثبت می‌شود؛ موتور با rtFromStimulus منفی آن را
    // پیش‌دستی تشخیص می‌دهد
    void ctx.submit('tap').then((result) => {
      if (!result.accepted) {
        // persist_failed: مدیر rollback کرده — قفل باز بماند
        submittedRef.current = false
        return
      }
      if (!result.sessionCompleted) {
        try {
          ctx.advance()
        } catch {
          // جلسه هم‌زمان قطع/تکمیل شده — بی‌اثر
        }
      }
    })
  }

  return (
    <button
      type="button"
      className={`${styles.tapArea} ${phase === 'stimulus' ? styles.stimulusPhase : ''}`}
      onPointerDown={respond}
      aria-label="ناحیه پاسخ"
    >
      {phase === 'stimulus' ? (
        <span className={styles.stimulus} data-testid="rt-stimulus">
          بزن!
        </span>
      ) : (
        <span className={styles.waitText}>صبر کن…</span>
      )}
      <span className={gameStyles.hint} style={{ position: 'absolute', bottom: 'var(--space-5)' }}>
        دایره که ظاهر شد، هرچه سریع‌تر بزن · زودتر از موعد نزن
      </span>
    </button>
  )
}
