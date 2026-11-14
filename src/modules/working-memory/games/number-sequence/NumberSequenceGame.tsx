import { useEffect, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import { useTrialGuards } from '../../../../components/game/useTrialGuards'
import gameStyles from '../../../../components/game/game.module.css'
import { BackspaceGlyph } from '../../../../components/icons/UiGlyphs'
import { toFaDigits } from '../../../../utils/format'
import { scheduleCadence } from '../../../shared/presentation-resume'
import type { NumberSequenceTrial } from './engine'
import styles from './number-sequence.module.css'

/**
 * Number Sequence — UI
 *
 * فازهای هر مرحله: نمایش ارقام یکی‌یکی → بازسازی با صفحه‌کلید →
 * بازخورد کوتاه → مرحله بعد.
 * منطق کاملاً در engine است؛ این کامپوننت فقط رندر و ورودی.
 */
export function NumberSequenceGame({ ctx }: { ctx: ActiveGameContext }) {
  const trial = ctx.trial as NumberSequenceTrial
  const [phase, setPhase] = useState<'showing' | 'input' | 'feedback'>('showing')
  const [shownDigit, setShownDigit] = useState<number | null>(null)
  const [entered, setEntered] = useState<number[]>([])
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null)
  const guards = useTrialGuards(ctx, trial.trialIndex)

  // شروع فاز پاسخ را در مدیر علامت بزن — RT از بازشدن صفحه‌کلید سنجیده
  // شود نه از شروع نمایش ارقام (§۲-۲ ممیزی). idempotent؛ اثر روی فاز،
  // مسیر بازنصبِ پس از مکث (ست مستقیم 'input') را هم می‌پوشاند.
  useEffect(() => {
    if (phase === 'input') ctx.beginResponsePhase()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ریست فازها با شروع هر مرحله جدید + زمان‌بندی نمایش ارقام:
  // هر رقم به‌مدت displayMsPerDigit دیده می‌شود و gapMs فاصله تا بعدی.
  // بازنصبِ پس از مکث: ارائه از زمان سپری‌شدهٔ جلسه ادامه می‌یابد نه از
  // صفر — بازپخش ارقام، دوبار-دیده‌شدن محرک و بایاس صعودی بود (GAMES-AUDIT §۲-۱)
  useEffect(() => {
    // رفع ریس pause بین پذیرش پاسخ و advance (الگوی محاسبه ×۲۰): پاسخِ
    // ثبت‌شدهٔ بدون پیشروی را در بازنصب بلافاصله جلو ببر تا جلسه قفل نماند
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
    if (entered.length >= trial.digits.length) return
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
    if (phase !== 'input' || entered.length !== trial.digits.length) return
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
        <div className={styles.digitCard} aria-live="polite" data-testid="ns-digit" key={shownDigit ?? 'blank'}>
          {shownDigit !== null ? toFaDigits(shownDigit) : ''}
        </div>
        <p className={gameStyles.hint}>
          ارقام را به ترتیب به خاطر بسپار ({toFaDigits(trial.digits.length)} رقم)
        </p>
      </>
    )
  }

  if (phase === 'input') {
    return (
      <>
        <div className={gameStyles.answerDisplay} aria-label="توالی واردشده">
          {Array.from({ length: trial.digits.length }, (_, i) => (
            <span className={gameStyles.answerSlot} key={i}>
              {entered[i] !== undefined ? toFaDigits(entered[i] as number) : ''}
            </span>
          ))}
        </div>
        <div className={gameStyles.keypad} role="group" aria-label="صفحه کلید عددی">
          {Array.from({ length: 9 }, (_, i) => i + 1).map((digit) => (
            <button type="button" className={gameStyles.key} key={digit} onClick={() => pressDigit(digit)}>
              {toFaDigits(digit)}
            </button>
          ))}
          <button type="button" className={gameStyles.key} onClick={() => pressDigit(0)}>
            {toFaDigits(0)}
          </button>
          <button
            type="button"
            className={gameStyles.key}
            aria-label="پاک‌کردن"
            onClick={undo}
            disabled={entered.length === 0}
          >
            <BackspaceGlyph size={22} />
          </button>
          <button
            type="button"
            className={`${gameStyles.key} ${gameStyles.keyWide}`}
            onClick={submit}
            disabled={entered.length !== trial.digits.length}
          >
            تأیید
          </button>
        </div>
      </>
    )
  }

  // feedback — پیل رنگی + ریل چیپ‌های پلکانیِ توالی درست
  return (
    <div className={styles.feedbackBox}>
      <div className={`${styles.feedbackPill} ${wasCorrect ? styles.feedbackGood : styles.feedbackBad}`}>
        {wasCorrect ? 'درست!' : 'نادرست'}
      </div>
      <div className={styles.correctRail} aria-label="توالی درست">
        {trial.digits.map((d, i) => (
          <span key={i} className={styles.correctChip} style={{ animationDelay: `${120 + i * 90}ms` }}>
            {toFaDigits(d)}
          </span>
        ))}
      </div>
    </div>
  )
}
