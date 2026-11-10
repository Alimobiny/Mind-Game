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

  // با هر مرحله جدید ریست می‌شود
  useEffect(() => {
    submittedRef.current = false
    setPhase('waiting')
    for (const t of timersRef.current) window.clearTimeout(t)
    timersRef.current = []

    // ظاهرشدن ناگهانی محرک پس از تأخیر تصادفی
    timersRef.current.push(window.setTimeout(() => setPhase('stimulus'), trial.stimulusDelayMs))

    // انقضای مهلت کل مرحله → ثبت بی‌پاسخی (کندی) و رفتن به مرحله بعد
    const remaining = ctx.timeRemainingMs()
    if (remaining !== null) {
      deadlineRef.current = window.setTimeout(() => {
        if (submittedRef.current) return
        submittedRef.current = true
        void ctx.submit(null).then((result) => {
          if (result.accepted && !result.sessionCompleted) ctx.advance()
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
      if (result.accepted && !result.sessionCompleted) ctx.advance()
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
