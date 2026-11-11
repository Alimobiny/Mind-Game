import { useEffect, useRef, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import gameStyles from '../../../../components/game/game.module.css'
import type { MentalRotationTrial, MentalRotationVerdict, Polyomino } from './engine'
import styles from './mental-rotation.module.css'

/**
 * Mental Rotation — UI
 *
 * دو شکل بلوکی (پلی‌ومینو) با SVG: «مرجع» و «گزینه». داوری با دو دکمهٔ
 * بزرگ: «یکسان (چرخیده)» / «آینه‌ای». در سطح‌های ۳ به بالا پنجرهٔ پاسخ
 * دارد؛ انقضای مهلت با ثبت null (بی‌پاسخی) و فلش «زمان تمام شد» دیده
 * می‌شود. viewBox مربعِ دو شکل هم‌اندازه است تا مقیاس بصری‌شان یکی
 * بماند و فقط هندسه (چرخش/آینه) تفاوت‌ساز باشد.
 *
 * نگهبان‌های اجباری:
 *  ۱) قفل submittedRef: تپ دومی روی دکمه (یا انقضای مهلتِ هم‌زمان) نباید
 *     پاسخ دوباره بفرستد؛ قفل فقط وقتی باز می‌شود که پاسخ رد شد
 *     (result.accepted === false).
 *  ۲) بعد از result.sessionCompleted === true هیچ advanceای زمان‌بندی
 *     نمی‌شود (advance روی جلسهٔ کامل‌شده خطا می‌دهد؛ پوسته خودش به
 *     صفحهٔ نتایج می‌رود) — هم در مسیر پاسخ هم در مسیر انقضای مهلت.
 *  ۳) همهٔ تایمرها (فلش پیشروی و انقضای مهلت) در ref؛ پاک‌سازی در
 *     unmount و تغییر مرحله.
 *
 * نکته pause: هنگام PAUSE این کامپوننت unmount می‌شود؛ اگر فلش وسط
 * pause قطع شد، در باز-نصبِ پس از resume با تشخیص «مرحلهٔ جاری از پیش
 * پاسخ داده شده» (lastOutcome.trialIndex === trial.trialIndex) فلش
 * دوباره ساخته و پیشروی دوباره زمان‌بندی می‌شود تا جلسه قفل نماند.
 */

/** مدت فلش بازخورد (ms) */
const FLASH_CORRECT_MS = 500
const FLASH_WRONG_MS = 1000

/** فاصلهٔ داخلی هر بلوک از لبهٔ خانهٔ واحدش (کسر از ۱) */
const BLOCK_INSET = 0.07

const VERDICT_FA: Readonly<Record<MentalRotationVerdict, string>> = {
  same: 'یکسان (چرخیده)',
  mirrored: 'آینه‌ای',
}

interface FlashState {
  readonly correct: boolean
  readonly expected: MentalRotationVerdict
  readonly omission: boolean
}

/** ترسیم یک شکل بلوکی با SVG — هر خانهٔ شبکه یک مربع واحد */
function FigureArt({
  cells,
  testId,
  same,
}: {
  readonly cells: Polyomino
  readonly testId: string
  /** فقط برای گزینه: آیا همانِ چرخیده است (نه آینه‌ای)؟ */
  readonly same?: boolean
}) {
  const width = Math.max(...cells.map(([x]) => x)) + 1
  const height = Math.max(...cells.map(([, y]) => y)) + 1
  // viewBox مربع با ضلع بزرگ‌ترین بُعد → دو شکل با مقیاس یکسان رندر می‌شوند
  const span = Math.max(width, height)
  return (
    <svg
      className={styles.figure}
      viewBox={`0 0 ${span} ${span}`}
      data-testid={testId}
      data-same={same === undefined ? undefined : same ? 'true' : 'false'}
      focusable="false"
      aria-hidden="true"
    >
      {cells.map(([x, y]) => (
        <rect
          key={`${x}-${y}`}
          className={styles.block}
          x={x + BLOCK_INSET}
          y={y + BLOCK_INSET}
          width={1 - 2 * BLOCK_INSET}
          height={1 - 2 * BLOCK_INSET}
          rx={0.12}
        />
      ))}
    </svg>
  )
}

export function MentalRotationGame({ ctx }: { ctx: ActiveGameContext }) {
  const trial = ctx.trial as MentalRotationTrial
  const [flash, setFlash] = useState<FlashState | null>(null)
  const submittedRef = useRef(false)
  const flashTimerRef = useRef<number | null>(null)
  const deadlineRef = useRef<number | null>(null)

  const clearFlashTimer = () => {
    if (flashTimerRef.current !== null) {
      window.clearTimeout(flashTimerRef.current)
      flashTimerRef.current = null
    }
  }

  const clearDeadline = () => {
    if (deadlineRef.current !== null) {
      window.clearTimeout(deadlineRef.current)
      deadlineRef.current = null
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

  // ریست برای هر مرحلهٔ جدید — و باز-نصب پس از pause/resume
  useEffect(() => {
    clearFlashTimer()
    clearDeadline()
    setFlash(null)
    const outcome = ctx.lastOutcome
    const answered = outcome !== null && outcome.trialIndex === trial.trialIndex
    submittedRef.current = answered
    if (answered && outcome !== null) {
      // فلشِ قطع‌شده وسط pause: بازسازی و زمان‌بندی دوبارهٔ پیشروی
      setFlash({
        correct: outcome.correct,
        expected: outcome.expected as MentalRotationVerdict,
        omission: outcome.outcome === 'omission',
      })
      scheduleAdvance(outcome.correct)
      return
    }
    // انقضای مهلت پاسخ (سطح ۳+) → ثبت بی‌پاسخی دقیقاً یک‌بار (نگهبان ۱ و ۲)
    const remaining = ctx.timeRemainingMs()
    if (remaining !== null) {
      deadlineRef.current = window.setTimeout(() => {
        deadlineRef.current = null
        if (submittedRef.current) return
        submittedRef.current = true
        void ctx.submit(null).then((result) => {
          if (!result.accepted) {
            // پاسخ رد شد — قفل باز شود
            submittedRef.current = false
            return
          }
          if (result.sessionCompleted) {
            // جلسه تمام است — هیچ advanceای زمان‌بندی نشود (نگهبان ۲)
            return
          }
          setFlash({
            correct: false,
            expected: result.record.expected as MentalRotationVerdict,
            omission: true,
          })
          scheduleAdvance(false)
        })
      }, remaining)
    }
    return () => {
      clearFlashTimer()
      clearDeadline()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trial.trialIndex])

  const locked = flash !== null || submittedRef.current

  const choose = (verdict: MentalRotationVerdict) => {
    if (submittedRef.current || flash !== null || ctx.paused) return
    submittedRef.current = true
    // پاسخ رسید؛ تایمر انقضای مهلت دیگر موضوعیت ندارد
    clearDeadline()
    void ctx.submit(verdict).then((result) => {
      if (!result.accepted) {
        // پاسخ رد شد (مثلاً مرحله از قبل پاسخ داده شده) — قفل باز شود
        submittedRef.current = false
        return
      }
      if (result.sessionCompleted) {
        // جلسه تمام است — هیچ advanceای زمان‌بندی نشود (نگهبان ۲)
        return
      }
      setFlash({
        correct: result.record.correct,
        expected: result.record.expected as MentalRotationVerdict,
        omission: false,
      })
      scheduleAdvance(result.record.correct)
    })
  }

  return (
    <div className={styles.stage} key={trial.trialIndex}>
      <p className={gameStyles.hint}>آیا شکل «گزینه»، همان شکل مرجعِ چرخیده است یا تصویر آینه‌ای آن؟</p>

      <div className={styles.figures} role="group" aria-label="مقایسه شکل مرجع و گزینه">
        <div className={styles.panel}>
          <span className={styles.panelLabel}>مرجع</span>
          <FigureArt cells={trial.reference} testId="mr-reference" />
        </div>
        <div className={`${styles.panel} ${styles.panelCandidate}`}>
          <span className={styles.panelLabel}>گزینه</span>
          <FigureArt cells={trial.candidate} testId="mr-candidate" same={!trial.isMirror} />
        </div>
      </div>

      <div className={styles.flashZone} aria-live="polite">
        {flash !== null ? (
          <p
            className={`${styles.flash} ${flash.correct ? styles.flashCorrect : styles.flashIncorrect}`}
            data-testid="mr-feedback"
            data-correct={flash.correct ? 'true' : 'false'}
          >
            {flash.correct
              ? 'درست ✓'
              : flash.omission
                ? `زمان تمام شد — پاسخ درست: ${VERDICT_FA[flash.expected]}`
                : `نادرست — پاسخ درست: ${VERDICT_FA[flash.expected]}`}
          </p>
        ) : null}
      </div>

      <div className={styles.choices} role="group" aria-label="داوری چرخش ذهنی">
        <button
          type="button"
          className={styles.choiceButton}
          data-testid="mr-choice"
          data-verdict="same"
          onClick={() => choose('same')}
          disabled={locked || ctx.paused}
        >
          یکسان (چرخیده)
        </button>
        <button
          type="button"
          className={`${styles.choiceButton} ${styles.mirrorButton}`}
          data-testid="mr-choice"
          data-verdict="mirrored"
          onClick={() => choose('mirrored')}
          disabled={locked || ctx.paused}
        >
          آینه‌ای
        </button>
      </div>

      <p className={gameStyles.hint}>چرخش را در ذهن دنبال کن؛ شتاب بدون دقت امتیاز ندارد</p>
    </div>
  )
}
