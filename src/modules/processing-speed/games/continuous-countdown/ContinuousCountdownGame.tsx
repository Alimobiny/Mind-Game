import { useCallback, useEffect, useRef, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import gameStyles from '../../../../components/game/game.module.css'
import { BackspaceGlyph } from '../../../../components/icons/UiGlyphs'
import { toFaDigits } from '../../../../utils/format'
import { computeRemainder } from './engine'
import type { ContinuousCountdownTrial } from './engine'
import styles from './continuous-countdown.module.css'

/**
 * شمارش معکوس پیوسته — UI
 *
 * فازهای هر مرحله: نمایش عدد شروع → نمایش اعداد کم‌شونده یکی‌یکی →
 * ورود باقیماندهٔ نهایی با صفحه‌کلید → بازخورد کوتاه → مرحله بعد.
 * منطق کاملاً در engine است؛ این کامپوننت فقط رندر و ورودی.
 *
 * قرارداد E2E: عنصر ccount-display همیشه سوار است و متنش بین نمایش‌ها
 * خالی می‌شود؛ «ظاهرشدن از حالت خالی» = یک محرک (data-kind: start|step).
 */
export function ContinuousCountdownGame({ ctx }: { ctx: ActiveGameContext }) {
  const trial = ctx.trial as ContinuousCountdownTrial
  const [phase, setPhase] = useState<'showing' | 'input' | 'feedback'>('showing')
  const [display, setDisplay] = useState<{ kind: 'start' | 'step'; value: number } | null>(null)
  const [entry, setEntry] = useState('')
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null)
  const trialKey = `${trial.trialIndex}`
  const timeoutsRef = useRef<number[]>([])
  // قفل پاسخِ ثبت‌شده — دوبل‌تپ روی «تأیید» نباید advance دومی بزند
  // (advance روی مرحله پاسخ‌داده‌شده استثنای مهارنشده می‌دهد)
  const submittedRef = useRef(false)
  // آینهٔ رندرِ مرحلهٔ جاری — گارد کهنگی تایمر پیشرویِ پس از بازخورد
  const currentTrialRef = useRef(trial.trialIndex)
  currentTrialRef.current = trial.trialIndex
  // باقیمانده هرگز از عدد شروع بزرگ‌تر نیست → سقف ارقام ورودی
  const maxEntryDigits = String(trial.startNumber).length

  const clearTimers = useCallback(() => {
    for (const t of timeoutsRef.current) window.clearTimeout(t)
    timeoutsRef.current = []
  }, [])

  // ریست فازها با شروع هر مرحله جدید + زمان‌بندی نمایش:
  // عدد شروع به‌مدت startDisplayMs، سپس هر عدد کم‌شونده به‌مدت
  // stepDisplayMs با فاصلهٔ gapMs؛ پایان نمایش → فاز ورود پاسخ
  useEffect(() => {
    submittedRef.current = false
    setPhase('showing')
    setDisplay({ kind: 'start', value: trial.startNumber })
    setEntry('')
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
    const { startDisplayMs, stepDisplayMs, gapMs } = trial
    const timers: number[] = []
    timers.push(window.setTimeout(() => setDisplay(null), startDisplayMs))
    trial.subtractions.forEach((step, i) => {
      const showAt = startDisplayMs + gapMs + i * (stepDisplayMs + gapMs)
      timers.push(window.setTimeout(() => setDisplay({ kind: 'step', value: step }), showAt))
      timers.push(window.setTimeout(() => setDisplay(null), showAt + stepDisplayMs))
    })
    // پایان نمایش همهٔ اعداد → فاز ورود
    const inputAt =
      startDisplayMs + gapMs + trial.subtractions.length * (stepDisplayMs + gapMs)
    timers.push(window.setTimeout(() => setDisplay(null), inputAt))
    timers.push(window.setTimeout(() => setPhase('input'), inputAt))
    timeoutsRef.current = timers
    return clearTimers
    // trialKey تغییر می‌کند دقیقاً وقتی مرحله جدید شروع می‌شود
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trialKey, clearTimers])

  const press = (key: string) => {
    if (key === 'back') {
      setEntry((current) => current.slice(0, -1))
      return
    }
    setEntry((current) => (current.length >= maxEntryDigits ? current : current + key))
  }

  const submit = async () => {
    if (submittedRef.current || phase !== 'input' || entry.length === 0) return
    submittedRef.current = true
    const result = await ctx.submit(Number.parseInt(entry, 10))
    if (!result.accepted) {
      submittedRef.current = false
      return
    }
    // آخرین پاسخ جلسه را کامل کرد → advanceی برای مرحله بعدی وجود ندارد
    // (advance روی جلسه تمام‌شده خطای «در فاز COMPLETED مجاز نیست» می‌دهد)
    if (result.sessionCompleted) return
    setWasCorrect(result.record.correct)
    setPhase('feedback')
    // تایمر رفتن به مرحلهٔ بعد هم داخل timeoutsRef ثبت می‌شود تا با
    // unmount یا شروع مرحلهٔ جدید پاک شود — به‌علاوهٔ گارد کهنگی (ریمانتِ
    // پس از مکث خودش پیشروی کرده) و مهار خطای جلسهٔ هم‌زمان قطع/تکمیل
    timeoutsRef.current.push(
      window.setTimeout(() => {
        if (currentTrialRef.current !== trial.trialIndex) return
        try {
          ctx.advance()
        } catch {
          // جلسه هم‌زمان قطع/تکمیل شده
        }
      }, 1500),
    )
  }

  if (phase === 'showing') {
    return (
      <>
        <div
          className={`${styles.display} ${display?.kind === 'start' ? styles.displayStart : styles.displayStep}`}
          data-testid="ccount-display"
          data-kind={display === null ? undefined : display.kind}
          aria-live="polite"
        >
          {display === null ? '' : display.kind === 'start'
            ? toFaDigits(display.value)
            : `− ${toFaDigits(display.value)}`}
        </div>
        <p className={gameStyles.hint}>
          از باقیماندهٔ ذهنی‌ات کم کن و نتیجه را نگه دار ({toFaDigits(trial.subtractions.length)}{' '}
          عدد می‌آید)
        </p>
      </>
    )
  }

  if (phase === 'input') {
    return (
      <>
        <div className={gameStyles.answerDisplay} aria-label="باقیمانده نهایی" data-testid="ccount-answer">
          {entry === '' ? <span className={gameStyles.hint}>؟</span> : toFaDigits(entry)}
        </div>
        <div className={gameStyles.keypad} role="group" aria-label="صفحه کلید عددی">
          {(['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const).map((key) => (
            <button type="button" className={gameStyles.key} key={key} onClick={() => press(key)}>
              {toFaDigits(key)}
            </button>
          ))}
          <button type="button" className={gameStyles.key} onClick={() => press('0')}>
            {toFaDigits(0)}
          </button>
          <button
            type="button"
            className={gameStyles.key}
            aria-label="پاک‌کردن"
            onClick={() => press('back')}
            disabled={entry === ''}
          >
            <BackspaceGlyph size={22} />
          </button>
          <button
            type="button"
            className={`${gameStyles.key} ${gameStyles.keyWide}`}
            data-testid="ccount-submit"
            onClick={() => void submit()}
            disabled={entry.length === 0}
          >
            تأیید
          </button>
        </div>
        <p className={gameStyles.hint}>باقیماندهٔ نهایی را وارد کن</p>
      </>
    )
  }

  // feedback
  const correctRemainder = computeRemainder(trial.startNumber, trial.subtractions)
  const expression = [
    toFaDigits(trial.startNumber),
    ...trial.subtractions.map((step) => `− ${toFaDigits(step)}`),
  ].join(' ')
  return (
    <div className={gameStyles.feedback} data-testid="ccount-feedback">
      <div
        className={`${styles.feedbackPill} ${wasCorrect ? styles.feedbackPillGood : styles.feedbackPillBad}`}
      >
        {wasCorrect ? 'درست!' : 'نادرست'}
      </div>
      <p className={styles.expression} aria-label="عبارت کامل مرحله">
        {expression} = {toFaDigits(correctRemainder)}
      </p>
      <p className={gameStyles.hint}>باقیماندهٔ درست: {toFaDigits(correctRemainder)}</p>
    </div>
  )
}
