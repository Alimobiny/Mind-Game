import { useEffect, useRef, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import gameStyles from '../../../../components/game/game.module.css'
import { BackspaceGlyph } from '../../../../components/icons/UiGlyphs'
import { toFaDigits } from '../../../../utils/format'
import type { BlockHeightTrial } from './engine'
import styles from './block-height.module.css'

/**
 * Block Height — UI (رندر ایزومتریک)
 *
 * هر ستون یک جفت پشتهٔ هم‌قاعده است: مکعب‌های جلویی (آبی، پهن‌تر) جلوی
 * مکعب‌های پشتی (سبز، باریک‌تر) که با آفست عمق بالاتر و راست‌تر کشیده
 * می‌شوند — «پشت‌بودن» در خود پرسپکتیو دیده می‌شود، نه فقط در متن.
 * هر ستون سکوی زمین خودش را دارد تا تعلق بلوک‌ها به ستون بدیهی باشد.
 * پس از ثبت پاسخ، بلوک‌های پنهانِ ستون پشتی با کانتور خط‌چین آشکار
 * می‌شوند (آموزش چشمی قاعده: پنهان‌ها = ارتفاع ستون جلویی).
 * پاسخ کل با صفحه‌کلید عددی (یا کلیدهای دستگاه + Enter) وارد می‌شود؛
 * مرحله مهلت ندارد.
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

/** مدت بازخورد (ms) — غلط طولانی‌تر تا آشکارسازی خط‌چین دیده شود */
const FLASH_CORRECT_MS = 1200
const FLASH_WRONG_MS = 3200

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

/* ─── هندسهٔ ایزومتریک (واحد کاربر SVG) ─── */
/** بلوک جلویی: پهن و آبی */
const FRONT_HW = 21 // نیم‌عرض لوزی بالایی
const FRONT_BH = 26 // ارتفاع وجه کناری
/** بلوک پشتی: باریک‌تر و سبز — هم‌گام ردیف با جلویی (همان BH) */
const BACK_HW = 15
const BACK_BH = 26
/** آفست عمق ستون پشتی: راست‌تر و بالاتر = دورتر */
const BACK_DX = 12
const BACK_DY = 10
const LANE_W = 64
const PAD_X = 22
const GROUND_PAD = 30 // جای سکو + حاشیهٔ پایین
const TOP_PAD = 14

interface IsoPoint {
  readonly x: number
  readonly y: number
}

/** وجه‌های یک مکعب ایزومتریک حول مرکزِ وجه بالایی */
function cubeFaces(cx: number, cyTop: number, hw: number, bh: number) {
  const n: IsoPoint = { x: cx, y: cyTop - hw / 2 }
  const e: IsoPoint = { x: cx + hw, y: cyTop }
  const s: IsoPoint = { x: cx, y: cyTop + hw / 2 }
  const w: IsoPoint = { x: cx - hw, y: cyTop }
  const top = `${n.x},${n.y} ${e.x},${e.y} ${s.x},${s.y} ${w.x},${w.y}`
  const left = `${w.x},${w.y} ${s.x},${s.y} ${s.x},${s.y + bh} ${w.x},${w.y + bh}`
  const right = `${s.x},${s.y} ${e.x},${e.y} ${e.x},${e.y + bh} ${s.x},${s.y + bh}`
  return { top, left, right }
}

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

  /* ─── چیدمان شکل از دادهٔ مرحله ─── */
  const lanes = trial.columns
  const maxBack = lanes.reduce((max, col) => Math.max(max, col.backHeight), 1)
  const width = lanes.length * LANE_W + 2 * PAD_X + BACK_DX
  const groundY = TOP_PAD + BACK_DY + maxBack * BACK_BH + FRONT_HW / 2 + 14
  const height = groundY + GROUND_PAD
  const laneCx = (i: number) => PAD_X + LANE_W / 2 + i * LANE_W
  /** مرکز وجه بالایی بلوک k ام ستون جلویی (k=۰ پایین‌ترین) */
  const frontTop = (i: number, k: number) => ({
    x: laneCx(i),
    y: groundY - (k + 1) * FRONT_BH - FRONT_HW / 2,
  })
  /** ستون پشتی: هم‌گام ردیف با جلویی، با آفست عمق */
  const backTop = (i: number, k: number) => ({
    x: laneCx(i) + BACK_DX,
    y: groundY - BACK_DY - (k + 1) * BACK_BH - BACK_HW / 2,
  })

  const reveal = flash !== null

  return (
    <>
      {/* راهنمای چشمی جنس دو ردیف — قبل از شکل، همیشه پیدا */}
      <div className={styles.legend} aria-hidden="true">
        <span className={styles.legendItem}>
          <svg viewBox="0 0 40 44" className={styles.legendCube}>
            <polygon points={cubeFaces(20, 15, 10, 13).top} className={styles.frontTop} />
            <polygon points={cubeFaces(20, 15, 10, 13).left} className={styles.frontLeft} />
            <polygon points={cubeFaces(20, 15, 10, 13).right} className={styles.frontRight} />
          </svg>
          <span className={styles.legendLabel}>جلویی</span>
        </span>
        <span className={styles.legendItem}>
          <svg viewBox="0 0 40 44" className={styles.legendCube}>
            <polygon points={cubeFaces(20, 15, 8, 13).top} className={styles.backTop} />
            <polygon points={cubeFaces(20, 15, 8, 13).left} className={styles.backLeft} />
            <polygon points={cubeFaces(20, 15, 8, 13).right} className={styles.backRight} />
          </svg>
          <span className={styles.legendLabel}>پشتی (دورتر)</span>
        </span>
      </div>

      <div className={styles.figureWrap}>
        <svg
          className={styles.figure}
          viewBox={`0 0 ${width} ${height}`}
          key={trial.trialIndex}
          data-testid="bh-figure"
          data-total={trial.totalBlocks}
          role="img"
          aria-label="ستون‌های مکعبی: جلویی آبی و پهن، پشتی سبز و باریک که پشت آن ایستاده و ادامه‌اش پنهان است"
        >
          {/* سکوی زمین هر ستون — تعلق بلوک‌ها به ستون را روشن می‌کند */}
          {lanes.map((_, i) => {
            const cx = laneCx(i) + BACK_DX / 2
            const hw = FRONT_HW + 8
            const py = groundY + 5
            return (
              <polygon
                key={`p${i}`}
                points={`${cx},${py - hw / 2} ${cx + hw},${py} ${cx},${py + hw / 2} ${cx - hw},${py}`}
                className={styles.platform}
              />
            )
          })}

          {lanes.map((col, i) => (
            <g key={`lane${i}`}>
              {/* پشتهٔ پشتی — اول کشیده می‌شود تا جلویی رویش بنشیند */}
              {Array.from({ length: col.backHeight }, (_, row) => {
                const t = backTop(i, row)
                const faces = cubeFaces(t.x, t.y, BACK_HW, BACK_BH)
                return (
                  <g key={`b${i}-${row}`}>
                    <polygon points={faces.left} className={styles.backLeft} />
                    <polygon points={faces.right} className={styles.backRight} />
                    <polygon points={faces.top} className={styles.backTop} />
                  </g>
                )
              })}
              {/* پشتهٔ جلویی — روی پشتی */}
              {Array.from({ length: col.frontHeight }, (_, row) => {
                const t = frontTop(i, row)
                const faces = cubeFaces(t.x, t.y, FRONT_HW, FRONT_BH)
                return (
                  <g key={`f${i}-${row}`}>
                    <polygon points={faces.left} className={styles.frontLeft} />
                    <polygon points={faces.right} className={styles.frontRight} />
                    <polygon points={faces.top} className={styles.frontTop} />
                  </g>
                )
              })}
              {/* آشکارسازی بازخورد: کانتور خط‌چین بلوک‌های پنهانِ پشتهٔ پشتی */}
              {reveal
                ? Array.from({ length: col.frontHeight }, (_, row) => {
                    const t = backTop(i, row)
                    const faces = cubeFaces(t.x, t.y, BACK_HW, BACK_BH)
                    return (
                      <g key={`h${i}-${row}`} className={styles.hiddenGroup}>
                        <polygon points={faces.left} className={styles.hiddenOutline} />
                        <polygon points={faces.right} className={styles.hiddenOutline} />
                        <polygon points={faces.top} className={styles.hiddenOutline} />
                      </g>
                    )
                  })
                : null}
            </g>
          ))}
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
              : `پاسخ درست: ${toFaDigits(flash.expected)} بلوک — بلوک‌های پنهان خط‌چین شدند`}
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
          <BackspaceGlyph size={22} />
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
        ستون سبز پشتِ ستون آبی ایستاده و پایینش پنهان است — پنهان‌های هر ستون دقیقاً به
        اندازهٔ آبی‌های همان ستون · با کلیدهای عددی دستگاه هم می‌توانی تایپ کنی · Enter = تأیید
      </p>
    </>
  )
}
