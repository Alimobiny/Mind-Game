import { useEffect, useRef, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import gameStyles from '../../../../components/game/game.module.css'
import { toFaDigits } from '../../../../utils/format'
import type { BlockHeightTrial } from './engine'
import styles from './block-height.module.css'

/**
 * Block Height — UI
 *
 * شکل SVG از دو ردیف عمقی بلوک: ردیف پشتی (روشن، باریک) پشت ردیف جلویی
 * (تیره، پهن) کشیده می‌شود؛ هر دو روی یک خط زمین و با شبکهٔ ردیفهای
 * یکسان، پس «بیرون‌زدگی» ستون پشتی دقیقاً بر حسب بلوک قابل شمارش است
 * (قاعدهٔ مستند در engine.ts). پاسخ کل با صفحه‌کلید عددی (یا کلیدهای
 * دستگاه + Enter) وارد و تأیید می‌شود. مرحله مهلت ندارد.
 *
 * نگهبان‌های اجباری:
 *  ۱) قفل submittedRef: تپ دومی روی «تأیید»/Enter نباید پاسخ دومی بفرستد؛
 *     قفل فقط با result.accepted === false باز می‌شود.
 *  ۲) بعد از result.sessionCompleted === true هیچ advanceای زمان‌بندی نمی‌شود.
 *  ۳) تایمر بازخورد در flashTimerRef؛ در unmount و تغییر مرحله پاک می‌شود.
 *
 * نکته pause: هنگام PAUSE این کامپوننت unmount می‌شود؛ اگر فلش وسط pause
 * قطع شد، در باز-نصبِ پس از resume با تشخیص «مرحلهٔ جاری از پیش پاسخ
 * داده شده» (lastOutcome.trialIndex === trial.trialIndex) فلش دوباره ساخته
 * و پیشروی دوباره زمان‌بندی می‌شود تا جلسه قفل نماند (الگوی Calculation100).
 */

/** مدت بازخورد (ms) — شمارش بی‌مهلتی است، فلش می‌تواند نفس‌دار باشد */
const FLASH_CORRECT_MS = 1100
const FLASH_WRONG_MS = 2200

/** بیشترین کل ممکن ۳۰ است ⇒ دو رقم کافی است */
const MAX_ENTRY_DIGITS = 2

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

/* ─── هندسهٔ ترسیم SVG (واحد کاربر) ─── */
const LANE_W = 52 // عرض هر لَن
const PAD_X = 12 // حاشیهٔ کناری
const BLOCK_H = 38 // ارتفاع یک بلوک (ردیف‌ها یکسان برای دو ردیف عمقی)
const FRONT_W = 40 // بلوک جلویی: پهن و تیره
const FRONT_OFF = 6
const BACK_W = 26 // بلوک پشتی: باریک و روشن
const BACK_OFF = 13
const GROUND_H = 12 // نوار زمین
const TOP_PAD = 10

interface FlashState {
  readonly correct: boolean
  readonly expected: number
}

export function BlockHeightGame({ ctx }: { ctx: ActiveGameContext }) {
  const trial = ctx.trial as BlockHeightTrial
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

  // ریست برای هر مرحله جدید — و باز-نصب پس از pause/resume (نگهبان ۳)
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
      // پاسخ رد شد (مثلاً مرحله از قبل پاسخ داده شده) — قفل باز شود (نگهبان ۱)
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

  // ابعاد شکل از دادهٔ مرحله
  const lanes = trial.columns
  const maxBack = lanes.reduce((max, col) => Math.max(max, col.backHeight), 1)
  const width = lanes.length * LANE_W + 2 * PAD_X
  const height = TOP_PAD + maxBack * BLOCK_H + GROUND_H
  const groundY = height - GROUND_H + 2
  const rowY = (row: number) => height - GROUND_H - (row + 1) * BLOCK_H

  return (
    <>
      <div className={styles.figureWrap}>
        <svg
          className={styles.figure}
          viewBox={`0 0 ${width} ${height}`}
          key={trial.trialIndex}
          data-testid="bh-figure"
          data-total={trial.totalBlocks}
          role="img"
          aria-label="پشتهٔ بلوک‌ها: ردیف جلویی تیره و پهن، ردیف پشتی روشن و باریک"
        >
          <line className={styles.groundLine} x1={3} y1={groundY} x2={width - 3} y2={groundY} />
          {lanes.map((col, i) =>
            Array.from({ length: col.backHeight }, (_, row) => (
              <rect
                key={`b${i}-${row}`}
                className={styles.blockBack}
                x={PAD_X + i * LANE_W + BACK_OFF}
                y={rowY(row)}
                width={BACK_W}
                height={BLOCK_H}
                rx={3}
              />
            )),
          )}
          {lanes.map((col, i) =>
            Array.from({ length: col.frontHeight }, (_, row) => (
              <rect
                key={`f${i}-${row}`}
                className={styles.blockFront}
                x={PAD_X + i * LANE_W + FRONT_OFF}
                y={rowY(row)}
                width={FRONT_W}
                height={BLOCK_H}
                rx={3}
              />
            )),
          )}
        </svg>
      </div>

      <div className={styles.flashZone} aria-live="polite">
        {flash !== null ? (
          <p
            className={`${gameStyles.feedback} ${
              flash.correct ? gameStyles.feedbackCorrect : gameStyles.feedbackIncorrect
            }`}
            data-testid="bh-feedback"
            data-correct={flash.correct ? 'true' : 'false'}
          >
            {flash.correct
              ? 'درست ✓'
              : `پاسخ درست: ${toFaDigits(flash.expected)} بلوک`}
          </p>
        ) : null}
      </div>

      <div className={gameStyles.answerDisplay} aria-label="پاسخ شما" data-testid="bh-entry">
        {entry === '' ? <span className={gameStyles.hint}>?</span> : toFaDigits(entry)}
      </div>

      <div className={gameStyles.keypad} role="group" aria-label="صفحه کلید عددی">
        {(['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const).map((key) => (
          <button
            type="button"
            className={gameStyles.key}
            key={key}
            data-testid={`bh-key-${key}`}
            onClick={() => press(key)}
            disabled={locked}
          >
            {toFaDigits(key)}
          </button>
        ))}
        <button
          type="button"
          className={gameStyles.key}
          data-testid="bh-key-0"
          onClick={() => press('0')}
          disabled={locked}
        >
          {toFaDigits(0)}
        </button>
        <button
          type="button"
          className={gameStyles.key}
          data-testid="bh-key-back"
          onClick={() => press('back')}
          disabled={locked || entry === ''}
        >
          ⌫
        </button>
        <button
          type="button"
          className={`${gameStyles.key} ${gameStyles.keyWide}`}
          data-testid="bh-submit"
          onClick={() => void submit()}
          disabled={locked || entry.length === 0}
        >
          تأیید
        </button>
      </div>

      <p className={gameStyles.hint}>
        بلوک‌های پنهانِ هر ستون = ارتفاع ستون جلوییِ همان لَن · با کلیدهای عددی دستگاه هم
        می‌توانی تایپ کنی · Enter = تأیید
      </p>
    </>
  )
}
