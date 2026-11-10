import { useEffect, useRef, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import gameStyles from '../../../../components/game/game.module.css'
import { toFaDigits } from '../../../../utils/format'
import type { NBackTrial } from './engine'
import styles from './n-back.module.css'

/**
 * N-Back — UI
 *
 * جریان پیوسته: حرف برای stimulusMs دیده می‌شود، سپس فاصله خالی؛
 * اگر حرف فعلی با حرف n مرحله قبل یکی بود کاربر «تطبیق» را می‌زند،
 * وگرنه هیچ نمی‌کند. با انقضای مهلت، مرحله بدون پاسخ ثبت و بعدی
 * می‌آید. منطق در engine است.
 */
export function NBackGame({ ctx }: { ctx: ActiveGameContext }) {
  const trial = ctx.trial as NBackTrial
  const [stimulusVisible, setStimulusVisible] = useState(true)
  const deadlineRef = useRef<number | null>(null)
  const timersRef = useRef<number[]>([])
  const submittedRef = useRef(false)

  // با هر حرف جدید ریست می‌شود
  useEffect(() => {
    submittedRef.current = false
    setStimulusVisible(true)
    for (const t of timersRef.current) window.clearTimeout(t)
    timersRef.current = []

    // پنهان‌شدن حرف بعد از stimulusMs (فاصله خالی تا حرف بعد)
    timersRef.current.push(window.setTimeout(() => setStimulusVisible(false), trial.stimulusMs))

    // انقضای مهلت پاسخ → ثبت بی‌پاسخی و رفتن به حرف بعد
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
    void ctx.submit('match').then((result) => {
      if (result.accepted && !result.sessionCompleted) ctx.advance()
    })
  }

  return (
    <div className={styles.stage}>
      <div
        className={styles.letterArea}
        data-testid="nback-letter"
        data-is-target={trial.isTarget ? 'true' : 'false'}
      >
        {stimulusVisible ? (
          <span className={gameStyles.bigNumber}>{trial.letter}</span>
        ) : (
          <span className={styles.fixation}>+</span>
        )}
      </div>
      <p className={gameStyles.hint}>
        اگر این حرف با حرف {toFaDigits(trial.n)} مرحله قبل یکی بود، «تطبیق» را بزن
      </p>
      <button
        type="button"
        className={styles.matchButton}
        onClick={respond}
        data-testid="nback-match"
      >
        تطبیق
      </button>
    </div>
  )
}
