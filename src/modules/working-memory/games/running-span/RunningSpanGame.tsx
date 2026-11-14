import { useEffect, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import { useTrialGuards } from '../../../../components/game/useTrialGuards'
import gameStyles from '../../../../components/game/game.module.css'
import { BackspaceGlyph } from '../../../../components/icons/UiGlyphs'
import { toFaDigits } from '../../../../utils/format'
import { scheduleCadence } from '../../../shared/presentation-resume'
import { expectedTail, type RunningSpanTrial } from './engine'
import styles from './running-span.module.css'
import { e2e } from '../../../../utils/e2e'

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
  const guards = useTrialGuards(ctx, trial.trialIndex)

  // شروع فاز پاسخ را در مدیر علامت بزن — RT از بازشدن ورودی سنجیده شود
  // نه از شروع نمایش جریان (§۲-۲ ممیزی). idempotent؛ مسیر بازنصب مکث هم پوشش دارد.
  useEffect(() => {
    if (phase === 'input') ctx.beginResponsePhase()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ریست فازها با شروع هر جریان + زمان‌بندی نمایش ارقام. بازنصبِ پس از
  // مکث (PAUSED=unmount): جریان از زمانِ سپری‌شدهٔ جلسه ادامه می‌یابد نه
  // از صفر — برای running span مخرب‌تر بود چون پایان جریان پیش‌بینی‌ناپذیر
  // است و بازپخش کل جریان، محرک را کامل دوبار نشان می‌داد (GAMES-AUDIT §۲-۱)
  useEffect(() => {
    // رفع ریس pause بین پذیرش پاسخ و advance (الگوی محاسبه ×۲۰)
    const outcome = ctx.lastOutcome
    if (outcome !== null && outcome.trialIndex === trial.trialIndex) {
      try {
        ctx.advance()
      } catch {
        // جلسه هم‌زمان قطع/تکمیل شده
      }
      return
    }

    const interrupted = ctx.trialPresentation.wasInterrupted()
    const elapsedMs = interrupted ? ctx.trialElapsedMs() : 0
    const saved = interrupted ? ctx.trialPresentation.get<number[]>('entered') : undefined
    setEntered(saved ?? [])
    setWasCorrect(null)
    setShownDigit(null)

    const { displayMsPerDigit: display, gapMs: gap } = trial
    const totalMs = trial.digits.length * (display + gap)
    const finishShowing = () => {
      setShownDigit(null)
      setPhase('input')
    }
    const timers = scheduleCadence(
      trial.digits.map((digit, i) => ({
        startAt: i * (display + gap),
        displayMs: display,
        onShow: () => setShownDigit(digit),
        onHide: () => setShownDigit((current) => (current === digit ? null : current)),
      })),
      totalMs,
      finishShowing,
      elapsedMs,
    )
    if (elapsedMs >= totalMs) {
      // ارائهٔ تمام‌شده — scheduleCadence خودش finishShowing زد؛ فاز را هم بنشان
      setPhase('input')
    } else {
      setPhase('showing')
    }
    for (const t of timers) guards.trackTimeoutId(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trial.trialIndex])

  const pressDigit = (digit: number) => {
    if (phase !== 'input') return
    if (entered.length >= trial.recallDepth) return
    const next = [...entered, digit]
    // نجات ورودی برای بازنصبِ مکث
    ctx.trialPresentation.set('entered', next)
    setEntered(next)
  }

  const undo = () => {
    const next = entered.slice(0, -1)
    ctx.trialPresentation.set('entered', next)
    setEntered(next)
  }

  const submit = () => {
    if (phase !== 'input' || entered.length !== trial.recallDepth) return
    void guards.submitOnce(entered, {
      onAccepted: (result) => {
        setWasCorrect(result.record.correct)
        setPhase('feedback')
        // تایمر پیشروی: ردیابی‌شده (پاک‌شدن با unmount/مرحلهٔ جدید) + مهار
        // خطای جلسهٔ هم‌زمان قطع/تکمیل
        guards.setTrackedTimeout(() => {
          try {
            ctx.advance()
          } catch {
            // جلسه هم‌زمان قطع/تکمیل شده
          }
        }, 850)
      },
      autoAdvance: false,
    })
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
      <div className={styles.inputBox} data-testid="rs-input" data-expected-tail={e2e(tail.join(','))}>
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
            aria-label="پاک‌کردن"
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
