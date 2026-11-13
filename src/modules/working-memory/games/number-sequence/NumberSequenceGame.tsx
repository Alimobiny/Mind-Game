import { useCallback, useEffect, useRef, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import gameStyles from '../../../../components/game/game.module.css'
import { BackspaceGlyph } from '../../../../components/icons/UiGlyphs'
import { toFaDigits } from '../../../../utils/format'
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
  const trialKey = `${trial.trialIndex}`
  const timeoutsRef = useRef<number[]>([])
  // قفل پاسخِ ثبت‌شده — دوبل‌تپ روی «تأیید» نباید advance دومی بزند
  // (advance روی مرحله پاسخ‌داده‌نشده استثنای مهارنشده می‌دهد)
  const submittedRef = useRef(false)
  // آینهٔ رندرِ مرحلهٔ جاری — گارد کهنگی تایمر پیشرویِ پس از بازخورد
  const currentTrialRef = useRef(trial.trialIndex)
  currentTrialRef.current = trial.trialIndex

  const clearTimers = useCallback(() => {
    for (const t of timeoutsRef.current) window.clearTimeout(t)
    timeoutsRef.current = []
  }, [])

  // ریست فازها با شروع هر مرحله جدید + زمان‌بندی نمایش ارقام:
  // هر رقم به‌مدت displayMsPerDigit دیده می‌شود و gapMs فاصله تا بعدی
  useEffect(() => {
    submittedRef.current = false
    setPhase('showing')
    setShownDigit(trial.digits[0] ?? null)
    setEntered([])
    setWasCorrect(null)
    clearTimers()
    // رفع ریس pause بین پذیرش پاسخ و advance (الگوی محاسبه ×۲۰): پاسخِ
    // ثبت‌شدهٔ بدون پیشروی را در بازنصب بلافاصله جلو ببر تا جلسه قفل نماند
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
    // پایان نمایش همه ارقام → فاز ورود
    timers.push(
      window.setTimeout(() => setPhase('input'), trial.digits.length * (display + gap)),
    )
    timeoutsRef.current = timers
    return clearTimers
    // trialKey تغییر می‌کند دقیقاً وقتی مرحله جدید شروع می‌شود
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trialKey, clearTimers])

  const pressDigit = (digit: number) => {
    if (phase !== 'input') return
    setEntered((current) => {
      if (current.length >= trial.digits.length) return current
      return [...current, digit]
    })
  }

  const undo = () => setEntered((current) => current.slice(0, -1))

  const submit = async () => {
    if (submittedRef.current || phase !== 'input' || entered.length !== trial.digits.length) return
    submittedRef.current = true
    const result = await ctx.submit(entered)
    if (!result.accepted) {
      submittedRef.current = false
      return
    }
    // آخرین پاسخ جلسه را کامل کرد → advanceی برای مرحله بعدی وجود ندارد
    // (advance روی جلسه تمام‌شده خطای «در فاز COMPLETED مجاز نیست» می‌دهد)
    if (result.sessionCompleted) return
    setWasCorrect(result.record.correct)
    setPhase('feedback')
    // تایمر پیشروی: ردیابی‌شده (پاک‌شدن با unmount/مرحلهٔ جدید) + گارد کهنگی
    // (ریمانتِ پس از مکث خودش پیشروی کرده) + مهار خطای جلسهٔ هم‌زمان قطع/تکمیل
    timeoutsRef.current.push(
      window.setTimeout(() => {
        if (currentTrialRef.current !== trial.trialIndex) return
        try {
          ctx.advance()
        } catch {
          // جلسه هم‌زمان قطع/تکمیل شده
        }
      }, 850),
    )
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
            onClick={() => void submit()}
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
