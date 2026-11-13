import { useCallback, useEffect, useRef, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import gameStyles from '../../../../components/game/game.module.css'
import { BackspaceGlyph } from '../../../../components/icons/UiGlyphs'
import { toFaDigits } from '../../../../utils/format'
import { expectedTail, type RunningSpanTrial } from './engine'
import styles from './running-span.module.css'

/**
 * Running Span — UI
 *
 * فازهای هر مرحله: نمایش ارقام یکی‌یکی (بدون اعلام طول — نقطهٔ پایان
 * پیش‌بینی‌ناپذیر) → توقف ناگهانی → ورود «آخرین N رقم» با صفحه‌کلید →
 * فلش بازخورد با ریل دنبالهٔ درست → مرحلهٔ بعد. الگوی نمایش و ورود از
 * «توالی اعداد» بازکاربرد شده با منطق تازه (دنبالهٔ انتظار = ارقام آخر).
 */
export function RunningSpanGame({ ctx }: { ctx: ActiveGameContext }) {
  const trial = ctx.trial as RunningSpanTrial
  const [phase, setPhase] = useState<'showing' | 'input' | 'feedback'>('showing')
  const [shownDigit, setShownDigit] = useState<number | null>(null)
  const [entered, setEntered] = useState<number[]>([])
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null)
  const trialKey = `${trial.trialIndex}`
  const timeoutsRef = useRef<number[]>([])
  const submittedRef = useRef(false)

  const clearTimers = useCallback(() => {
    for (const t of timeoutsRef.current) window.clearTimeout(t)
    timeoutsRef.current = []
  }, [])

  // ریست فازها با شروع هر جریان + زمان‌بندی نمایش ارقام (مونت‌محور؛
  // با مکث/ریمانت جریان از ابتدا دوباره پخش می‌شود)
  useEffect(() => {
    submittedRef.current = false
    setPhase('showing')
    setShownDigit(trial.digits[0] ?? null)
    setEntered([])
    setWasCorrect(null)
    clearTimers()
    // رفع ریس pause بین پذیرش پاسخ و advance (الگوی محاسبه ×۲۰)
    const outcome = ctx.lastOutcome
    if (outcome !== null && outcome.trialIndex === trial.trialIndex) {
      submittedRef.current = true
      try {
        ctx.advance()
      } catch {
        // جلسه هم‌زمان قطع/تکمیل شده
      }
      return
    }
    const { displayMsPerDigit: display, gapMs: gap } = trial
    const timers: number[] = []
    trial.digits.forEach((digit, i) => {
      const startAt = i * (display + gap)
      timers.push(window.setTimeout(() => setShownDigit(digit), startAt))
      timers.push(window.setTimeout(() => setShownDigit(null), startAt + display))
    })
    // پایان جریان — بدون اعلان قبلی → مستقیم ورود پاسخ
    timers.push(
      window.setTimeout(() => setPhase('input'), trial.digits.length * (display + gap)),
    )
    timeoutsRef.current = timers
    return clearTimers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trialKey, clearTimers])

  const pressDigit = (digit: number) => {
    if (phase !== 'input') return
    setEntered((current) => {
      if (current.length >= trial.recallDepth) return current
      return [...current, digit]
    })
  }

  const undo = () => setEntered((current) => current.slice(0, -1))

  const submit = async () => {
    if (submittedRef.current || phase !== 'input' || entered.length !== trial.recallDepth) return
    submittedRef.current = true
    const result = await ctx.submit(entered)
    if (!result.accepted) {
      submittedRef.current = false
      return
    }
    // آخرین پاسخ جلسه را کامل کرد → advanceی برای مرحله بعدی وجود ندارد
    if (result.sessionCompleted) {
      setWasCorrect(result.record.correct)
      setPhase('feedback')
      return
    }
    setWasCorrect(result.record.correct)
    setPhase('feedback')
    timeoutsRef.current.push(window.setTimeout(() => ctx.advance(), 850))
  }

  if (phase === 'showing') {
    return (
      <>
        <div
          className={styles.digitCard}
          aria-live="polite"
          data-testid="rs-digit"
          key={shownDigit ?? 'blank'}
        >
          {shownDigit !== null ? toFaDigits(shownDigit) : ''}
        </div>
        <p className={gameStyles.hint}>ارقام را دنبال کن — پایان جریان اعلام نمی‌شود</p>
      </>
    )
  }

  if (phase === 'input') {
    const tail = expectedTail(trial.digits, trial.recallDepth)
    return (
      <div className={styles.inputBox} data-testid="rs-input" data-expected-tail={tail.join(',')}>
        <p className={gameStyles.hint}>
          آخرین {toFaDigits(trial.recallDepth)} رقم را به همان ترتیب وارد کن
        </p>
        <div className={gameStyles.answerDisplay} aria-label="دنبالهٔ واردشده">
          {Array.from({ length: trial.recallDepth }, (_, i) => (
            <span className={gameStyles.answerSlot} key={i}>
              {entered[i] !== undefined ? toFaDigits(entered[i] as number) : ''}
            </span>
          ))}
        </div>
        <div className={gameStyles.keypad} role="group" aria-label="صفحه کلید عددی">
          {Array.from({ length: 9 }, (_, i) => i + 1).map((digit) => (
            <button
              type="button"
              className={gameStyles.key}
              key={digit}
              onClick={() => pressDigit(digit)}
            >
              {toFaDigits(digit)}
            </button>
          ))}
          <button type="button" className={gameStyles.key} onClick={() => pressDigit(0)}>
            {toFaDigits(0)}
          </button>
          <button
            type="button"
            className={gameStyles.key}
            onClick={undo}
            disabled={entered.length === 0}
          >
            <BackspaceGlyph size={22} />
          </button>
          <button
            type="button"
            className={`${gameStyles.key} ${gameStyles.keyWide}`}
            data-testid="rs-submit"
            onClick={() => void submit()}
            disabled={entered.length !== trial.recallDepth}
          >
            تأیید
          </button>
        </div>
      </div>
    )
  }

  // feedback — پیل نتیجه + ریل چیپ‌های دنبالهٔ درست
  const correctTail = expectedTail(trial.digits, trial.recallDepth)
  return (
    <div className={styles.feedbackBox}>
      <div className={`${styles.feedbackPill} ${wasCorrect ? styles.feedbackGood : styles.feedbackBad}`}>
        {wasCorrect ? 'درست!' : 'نادرست'}
      </div>
      <div className={styles.correctRail} aria-label="دنبالهٔ درست">
        {correctTail.map((d, i) => (
          <span key={i} className={styles.correctChip} style={{ animationDelay: `${120 + i * 90}ms` }}>
            {toFaDigits(d)}
          </span>
        ))}
      </div>
    </div>
  )
}
