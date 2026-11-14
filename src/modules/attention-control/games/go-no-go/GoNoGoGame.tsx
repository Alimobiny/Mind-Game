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
  const [badge, setBadge] = useState<'correct' | 'wrong' | null>(null)
  const badgeTimerRef = useRef<number | null>(null)
  const deadlineRef = useRef<number | null>(null)
  const timersRef = useRef<number[]>([])
  const submittedRef = useRef(false)

  // با هر محرک جدید ریست می‌شود. در بازنصبِ پس از مکث اگر نقطهٔ پنهان‌شدن
  // گذشته باشد (remaining از ISI کمتر) محرک از اول پنهان می‌ماند — نمایش
  // دوباره، پنجرهٔ پاسخ را عملاً طولانی‌تر از طراحی می‌کرد
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
      // پنهان‌شدن محرک بعد از stimulusMs
      timersRef.current.push(window.setTimeout(() => setStimulusVisible(false), trial.stimulusMs))
    }

    // انقضای مهلت پاسخ → ثبت بی‌پاسخی و رفتن به محرک بعد
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

  // نشان شناور نتیجهٔ تپ — پیشروی فوری بدون تغییر زمانی (الگوی محاسبه ×۲۰)
  const flashBadge = (correct: boolean) => {
    setBadge(correct ? 'correct' : 'wrong')
    if (badgeTimerRef.current !== null) window.clearTimeout(badgeTimerRef.current)
    badgeTimerRef.current = window.setTimeout(() => setBadge(null), 900)
  }

  const respond = () => {
    if (submittedRef.current || ctx.paused) return
    submittedRef.current = true
    void ctx.submit('tap').then((result) => {
      if (!result.accepted) {
        // persist_failed: مدیر rollback کرده — قفل باز بماند
        submittedRef.current = false
        return
      }
      flashBadge(result.record.correct)
      if (!result.sessionCompleted) {
        try {
          ctx.advance()
        } catch {
          // جلسه هم‌زمان قطع/تکمیل شده — بی‌اثر
        }
      }
    })
  }

  useEffect(
    () => () => {
      if (badgeTimerRef.current !== null) window.clearTimeout(badgeTimerRef.current)
    },
    [],
  )

  return (
    <button
      type="button"
      className={`${styles.tapArea} ${stimulusVisible ? '' : styles.blank}`}
      onPointerDown={respond}
      aria-label="ناحیه پاسخ"
    >
      {badge !== null ? (
        <span className={gameStyles.floatingBadge} aria-live="polite">
          <span
            className={`${gameStyles.floatingBadgeInner} ${
              badge === 'correct' ? gameStyles.floatingBadgeCorrect : gameStyles.floatingBadgeWrong
            }`}
          >
            {badge === 'correct' ? 'درست ✓' : 'غلط ✗'}
          </span>
        </span>
      ) : null}
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
