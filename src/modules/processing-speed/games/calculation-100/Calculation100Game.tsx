import { useEffect, useRef, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import gameStyles from '../../../../components/game/game.module.css'
import { BackspaceGlyph } from '../../../../components/icons/UiGlyphs'
import { toFaDigits } from '../../../../utils/format'
import type { Calculation100Trial } from './engine'
import styles from './calculation100.module.css'

/**
 * Calculation × 100 — UI
 *
 * نمایش سؤال با ارقام فارسی و پاسخ با صفحه‌کلید عددی (یا کلیدهای عددی
 * دستگاه + Enter). سؤال منفرد مهلت ندارد؛ RT معیار اصلی است. برای این‌که
 * جلسهٔ ۱۰۰ سؤالی در بازهٔ ۵-۸ دقیقه بماند، بعد از هر پاسخ فقط یک
 * «فلش» کوتاه نمایش داده می‌شود: درست ~۳۰۰ms، غلط ~۸۰۰ms (با نمایش
 * پاسخ درست). زمان فلش جزء RT مرحله بعد نیست — ساعت RT با آمدن سؤال
 * بعدی شروع می‌شود.
 *
 * نگهبان‌های اجباری:
 *  ۱) قفل submittedRef: تپ دومی روی «تأیید» (یا Enter تکراری) نباید
 *     پاسخ دوباره بفرستد؛ قفل فقط وقتی باز می‌شود که پاسخ رد شد
 *     (result.accepted === false).
 *  ۲) بعد از result.sessionCompleted === true هیچ advanceای زمان‌بندی
 *     نمی‌شود (advance روی جلسهٔ کامل‌شده خطا می‌دهد؛ پوسته خودش به
 *     صفحهٔ نتایج می‌رود).
 *
 * نکته pause: هنگام PAUSE این کامپوننت unmount می‌شود؛ اگر فلش وسط
 * pause قطع شد، در باز-نصبِ پس از resume با تشخیص «مرحله جاری از پیش
 * پاسخ داده شده» (lastOutcome.trialIndex === trial.trialIndex) فلش
 * دوباره ساخته و پیشروی دوباره زمان‌بندی می‌شود تا جلسه قفل نماند.
 */

/** مدت فلش بازخورد (ms) — کوتاه نگه داشته می‌شود تا ریتم جلسه حفظ شود */
const FLASH_CORRECT_MS = 300
const FLASH_WRONG_MS = 800

/** بیشترین پاسخ ممکن (۹۹+۹۹) سه رقمی است */
const MAX_ENTRY_DIGITS = 3

/** نگاشت کلیدهای فیزیکی (لاتین و فارسی) به رقم ورودی */
const KEY_TO_DIGIT: Readonly<Record<string, string>> = {
  '0': '0',
  '1': '1',
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  '۰': '0',
  '۱': '1',
  '۲': '2',
  '۳': '3',
  '۴': '4',
  '۵': '5',
  '۶': '6',
  '۷': '7',
  '۸': '8',
  '۹': '9',
}

interface FlashState {
  readonly correct: boolean
  readonly expected: number
}

export function Calculation100Game({ ctx }: { ctx: ActiveGameContext }) {
  const trial = ctx.trial as Calculation100Trial
  const [entry, setEntry] = useState('')
  const [flash, setFlash] = useState<FlashState | null>(null)
  const submittedRef = useRef(false)
  const flashTimerRef = useRef<number | null>(null)

  const clearFlashTimer = () => {
    if (flashTimerRef.current !== null) {
      window.clearTimeout(flashTimerRef.current)
      flashTimerRef.current = null
    }
  }

  /** پیشروی پس از فلش — اگر فاز دیگر ACTIVE نیست (خروج/تکمیل هم‌زمان)، بی‌اثر */
  const advanceAfterFlash = () => {
    try {
      ctx.advance()
    } catch {
      // جلسه هم‌زمان قطع/تکمیل شده؛ فلش و کامپوننت به‌زودی حذف می‌شوند
    }
  }

  const scheduleAdvance = (correct: boolean) => {
    clearFlashTimer()
    flashTimerRef.current = window.setTimeout(() => {
      flashTimerRef.current = null
      advanceAfterFlash()
    }, correct ? FLASH_CORRECT_MS : FLASH_WRONG_MS)
  }

  // ریست برای هر مرحله جدید — و باز-نصب پس از pause/resume
  useEffect(() => {
    clearFlashTimer()
    setEntry('')
    const outcome = ctx.lastOutcome
    const answered = outcome !== null && outcome.trialIndex === trial.trialIndex
    submittedRef.current = answered
    if (answered && outcome !== null) {
      setFlash({ correct: outcome.correct, expected: outcome.expected as number })
      scheduleAdvance(outcome.correct)
    } else {
      setFlash(null)
    }
    return clearFlashTimer
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trial.trialIndex])

  const locked = flash !== null || submittedRef.current

  const press = (key: string) => {
    if (locked) return
    if (key === 'back') {
      setEntry((current) => current.slice(0, -1))
      return
    }
    setEntry((current) => (current.length >= MAX_ENTRY_DIGITS ? current : current + key))
  }

  const submit = async () => {
    if (submittedRef.current || flash !== null || entry.length === 0) return
    submittedRef.current = true
    const value = Number.parseInt(entry, 10)
    const result = await ctx.submit(value)
    if (!result.accepted) {
      // پاسخ رد شد (مثلاً مرحله از قبل پاسخ داده شده) — قفل باز شود
      submittedRef.current = false
      return
    }
    if (result.sessionCompleted) {
      // جلسه تمام است — هیچ advanceای زمان‌بندی نشود (نگهبان ۲)
      return
    }
    setFlash({ correct: result.record.correct, expected: result.record.expected as number })
    scheduleAdvance(result.record.correct)
  }

  // صفحه‌کلید فیزیکی: ارقام (لاتین/فارسی)، Backspace و Enter
  // بدون آرایه وابستگی → اتصالِ هر رندر و closure همیشه تازه
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Backspace') {
        press('back')
        return
      }
      if (event.key === 'Enter') {
        void submit()
        return
      }
      const digit = KEY_TO_DIGIT[event.key]
      if (digit !== undefined) press(digit)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  const q = trial.question

  return (
    <>
      <div
        className={styles.question}
        aria-label="سؤال حساب"
        data-testid="calc100-question"
        key={trial.trialIndex}
      >
        {toFaDigits(q.a)} {q.operator} {toFaDigits(q.b)} = ?
      </div>

      <div className={styles.flashZone} aria-live="polite">
        {flash !== null ? (
          <p
            className={`${styles.flash} ${flash.correct ? styles.flashCorrect : styles.flashIncorrect}`}
            data-testid="calc100-feedback"
            data-correct={flash.correct ? 'true' : 'false'}
          >
            {flash.correct ? 'درست ✓' : `پاسخ درست: ${toFaDigits(flash.expected)}`}
          </p>
        ) : null}
      </div>

      <div className={gameStyles.answerDisplay} aria-label="پاسخ شما" data-testid="calc100-entry">
        {entry === '' ? <span className={gameStyles.hint}>?</span> : toFaDigits(entry)}
      </div>

      <div className={gameStyles.keypad} role="group" aria-label="صفحه کلید عددی">
        {(['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const).map((key) => (
          <button
            type="button"
            className={gameStyles.key}
            key={key}
            data-testid={`calc100-key-${key}`}
            onClick={() => press(key)}
            disabled={locked}
          >
            {toFaDigits(key)}
          </button>
        ))}
        <button
          type="button"
          className={gameStyles.key}
          data-testid="calc100-key-0"
          onClick={() => press('0')}
          disabled={locked}
        >
          {toFaDigits(0)}
        </button>
        <button
          type="button"
          className={gameStyles.key}
          data-testid="calc100-key-back"
          onClick={() => press('back')}
          disabled={locked || entry === ''}
        >
          <BackspaceGlyph size={22} />
        </button>
        <button
          type="button"
          className={`${gameStyles.key} ${gameStyles.keyWide}`}
          data-testid="calc100-submit"
          onClick={() => void submit()}
          disabled={locked || entry.length === 0}
        >
          تأیید
        </button>
      </div>

      <p className={gameStyles.hint}>با کلیدهای عددی دستگاه هم می‌توانی تایپ کنی · Enter = تأیید</p>
    </>
  )
}
