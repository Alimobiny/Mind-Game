import { useEffect, useRef, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import gameStyles from '../../../../components/game/game.module.css'
import type { GoNoGoTrial } from './engine'
import styles from './go-no-go.module.css'

/**
 * Go/No-Go — UI
 *
 * جریان پیوسته: محرک نمایش داده می‌شود؛ کاربر کلید/ناحیه بزرگ را برای
 * محرک Go می‌زند و برای مربع (No-Go) خودداری می‌کند. با انقضای مهلت،
 * مرحله بدون پاسخ ثبت و بعدی می‌آید. منطق در engine است.
 */
export function GoNoGoGame({ ctx }: { ctx: ActiveGameContext }) {
  const trial = ctx.trial as GoNoGoTrial
  const [stimulusVisible, setStimulusVisible] = useState(true)
  const deadlineRef = useRef<number | null>(null)
  const timersRef = useRef<number[]>([])
  const submittedRef = useRef(false)

  // با هر محرک جدید ریست می‌شود
  useEffect(() => {
    submittedRef.current = false
    setStimulusVisible(true)
    for (const t of timersRef.current) window.clearTimeout(t)
    timersRef.current = []

    // پنهان‌شدن محرک بعد از stimulusMs
    timersRef.current.push(window.setTimeout(() => setStimulusVisible(false), trial.stimulusMs))

    // انقضای مهلت پاسخ → ثبت بی‌پاسخی و رفتن به محرک بعد
    const remaining = ctx.timeRemainingMs()
    if (remaining !== null) {
      deadlineRef.current = window.setTimeout(() => {
        if (submittedRef.current) return
        submittedRef.current = true
        void ctx.submit(null).then((result) => {
          if (result.accepted) ctx.advance()
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
    void ctx.submit('tap').then((result) => {
      if (result.accepted) ctx.advance()
    })
  }

  return (
    <button
      type="button"
      className={`${styles.tapArea} ${stimulusVisible ? '' : styles.blank}`}
      onPointerDown={respond}
      aria-label="ناحیه پاسخ"
    >
      {stimulusVisible ? (
        trial.kind === 'go' ? (
          <span className={styles.goStimulus} aria-label="محرک برو" data-kind="go" />
        ) : (
          <span className={styles.nogoStimulus} aria-label="محرک ممنوع" data-kind="nogo" />
        )
      ) : (
        <span className={styles.plusSign}>+</span>
      )}
      <span className={gameStyles.hint} style={{ position: 'absolute', bottom: 'var(--space-5)' }}>
        دایره = بزن · مربع = خودداری کن
      </span>
    </button>
  )
}
