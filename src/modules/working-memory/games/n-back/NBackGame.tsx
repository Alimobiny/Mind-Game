import { useEffect, useRef, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import gameStyles from '../../../../components/game/game.module.css'
import { toFaDigits } from '../../../../utils/format'
import type { NBackTrial } from './engine'
import { NBACK_TOTAL_TRIALS } from './engine'
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
  const plannedTrials = NBACK_TOTAL_TRIALS
  const trial = ctx.trial as NBackTrial
  const [stimulusVisible, setStimulusVisible] = useState(true)
  const deadlineRef = useRef<number | null>(null)
  const timersRef = useRef<number[]>([])
  const submittedRef = useRef(false)

  // با هر حرف جدید ریست می‌شود — در بازنصبِ پس از مکث اگر نقطهٔ پنهان‌شدن
  // گذشته باشد (remaining از ISI کمتر) حرف از اول پنهان می‌ماند، نه نمایش
  // دوبارهٔ کامل همراه با مهلتِ در حال انقضا
  useEffect(() => {
    submittedRef.current = false
    for (const t of timersRef.current) window.clearTimeout(t)
    timersRef.current = []

    const remaining = ctx.timeRemainingMs()
    const pastHide =
      remaining !== null && trial.responseWindowMs !== null
        ? remaining < trial.responseWindowMs - trial.stimulusMs
        : false
    setStimulusVisible(!pastHide)
    if (!pastHide) {
      // پنهان‌شدن حرف بعد از stimulusMs (فاصله خالی تا حرف بعد)
      timersRef.current.push(window.setTimeout(() => setStimulusVisible(false), trial.stimulusMs))
    }

    // انقضای مهلت پاسخ → ثبت بی‌پاسخی و رفتن به حرف بعد
    if (remaining !== null) {
      deadlineRef.current = window.setTimeout(() => {
        if (submittedRef.current) return
        submittedRef.current = true
        void ctx.submit(null).then((result) => {
          if (!result.accepted) {
            // persist_failed: مدیر rollback کرده — قفل باید باز بماند تا
            // تلاش مجدد ممکن باشد (وگرنه جلسه تا abort قفل می‌شد)
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
    void ctx.submit('match').then((result) => {
      if (!result.accepted) {
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
    <div className={styles.stage}>
      <div
        className={styles.letterArea}
        data-testid="nback-letter"
        data-is-target={trial.isTarget ? 'true' : 'false'}
      >
        {stimulusVisible ? (
          <span key={trial.trialIndex} className={`${gameStyles.bigNumber} ${styles.letterPop}`}>
            {trial.letter}
          </span>
        ) : (
          <span className={styles.fixation}>+</span>
        )}
      </div>
      <p className={gameStyles.hint}>
        اگر این حرف با حرف {toFaDigits(trial.n)} مرحله قبل یکی بود، «تطبیق» را بزن
      </p>
      <button
        type="button"
        className={`${styles.matchButton} ${submittedRef.current ? styles.matchClaimed : ''}`}
        onClick={respond}
        data-testid="nback-match"
      >
        تطبیق
      </button>
      {/* نقطه‌های پیشروی جلسه — یک نگاه سریع به جایگاه */}
      <div className={styles.progressDots} aria-hidden="true">
        {Array.from({ length: plannedTrials }, (_, i) => (
          <span key={i} className={`${styles.dot} ${i < ctx.answeredTrials ? styles.dotDone : ''}`} />
        ))}
      </div>
    </div>
  )
}
