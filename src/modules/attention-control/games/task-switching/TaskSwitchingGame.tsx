import { useEffect, useRef, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import gameStyles from '../../../../components/game/game.module.css'
import {
  DIMENSION_LABELS_FA,
  VALUE_LABELS_FA,
  correctSideForTrial,
  type ResponseSide,
  type TaskSwitchingTrial,
} from './engine'
import styles from './task-switching.module.css'

/**
 * جابه‌جایی تکلیف — UI
 *
 * جریان هر مرحله: نشانهٔ بُعد («رنگ»/«شکل»/«اندازه») فوراً ظاهر می‌شود؛
 * پس از CSI شکل رنگی می‌آید و همان‌جا دو دکمهٔ ثابت پاسخ‌پذیر می‌شوند.
 * با انقضای مهلت، مرحله بدون پاسخ (omission) ثبت و بعدی می‌آید —
 * الگوی برو/نرو. نگاشت دکمه‌ها در کل جلسه ثابت است (دکمهٔ راست =
 * آبی/دایره/کوچک، دکمهٔ چپ = قرمز/مثلث/بزرگ) تا هزینهٔ جابه‌جایی خالص
 * سنجیده شود؛ دکمه‌ها از نظر فیزیکی جابه‌جا نمی‌شوند (ساختار DOM با
 * dir=rtl: عنصر اول = سمت راست).
 *
 * نگهبان‌های اجباری:
 *  ۱) قفل submittedRef: فشردن دومی (دو دکمه، کیبورد، یا دو انقضای مهلت)
 *     نباید پاسخ دوباره بفرستد؛ قفل فقط وقتی باز می‌شود که پاسخ رد شد
 *     (result.accepted === false).
 *  ۲) بعد از result.sessionCompleted === true هیچ advanceای زمان‌بندی
 *     نمی‌شود (هر دو مسیر پاسخ و انقضای مهلت).
 *  ۳) همهٔ تایمرها (CSI، مهلت پاسخ، پیشروی پس از فلش) در timersRef با
 *     پاک‌سازی در unmount و تغییر مرحله.
 *
 * نکته pause: هنگام PAUSE این کامپوننت unmount می‌شود؛ اگر فلش وسط
 * pause قطع شد، در باز-نصبِ پس از resume با تشخیص «مرحلهٔ جاری از پیش
 * پاسخ داده شده» (lastOutcome.trialIndex === trial.trialIndex) فلش دوباره
 * ساخته و پیشروی دوباره زمان‌بندی می‌شود تا جلسه قفل نماند.
 */

/** مدت فلش بازخورد (ms) — کوتاه تا ریتم آماده‌سازی نشانه‌ها حفظ شود */
const FLASH_CORRECT_MS = 350
const FLASH_WRONG_MS = 800

/** رنگ CSS مقادیر محرک — هم‌خانوادهٔ پالت استرووپ */
const COLOR_CSS: Readonly<Record<'blue' | 'red', string>> = {
  blue: '#3b82f6',
  red: '#ef4444',
}

/** اندازهٔ SVG محرک (px) — بُعد «اندازه» فقط در سطح ۵ معنا دارد */
const SIZE_PX: Readonly<Record<'small' | 'large', number>> = {
  small: 72,
  large: 128,
}

interface FlashState {
  readonly correct: boolean
  readonly omission: boolean
  readonly correctSide: ResponseSide
}

/** برچسب دکمهٔ ثابت هر سمت — از نگاشت پاسخ موتور ساخته می‌شود */
function buttonLabel(side: ResponseSide, dimensions: readonly string[]): string {
  const parts: string[] = []
  if (dimensions.includes('color')) parts.push(VALUE_LABELS_FA[side === 'right' ? 'blue' : 'red'])
  if (dimensions.includes('shape'))
    parts.push(VALUE_LABELS_FA[side === 'right' ? 'circle' : 'triangle'])
  if (dimensions.includes('size')) parts.push(VALUE_LABELS_FA[side === 'right' ? 'small' : 'large'])
  return parts.join(' · ')
}

export function TaskSwitchingGame({ ctx }: { ctx: ActiveGameContext }) {
  const trial = ctx.trial as TaskSwitchingTrial
  const [stimulusVisible, setStimulusVisible] = useState(false)
  const [flash, setFlash] = useState<FlashState | null>(null)
  const submittedRef = useRef(false)
  const timersRef = useRef<number[]>([])

  const clearTimers = () => {
    for (const t of timersRef.current) window.clearTimeout(t)
    timersRef.current = []
  }

  const addTimer = (handler: () => void, delayMs: number) => {
    timersRef.current.push(window.setTimeout(handler, delayMs))
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
    addTimer(advanceAfterFlash, correct ? FLASH_CORRECT_MS : FLASH_WRONG_MS)
  }

  // ریست برای هر مرحله جدید — و باز-نصب پس از pause/resume
  useEffect(() => {
    clearTimers()
    setStimulusVisible(false)
    const outcome = ctx.lastOutcome
    const answered = outcome !== null && outcome.trialIndex === trial.trialIndex
    submittedRef.current = answered
    if (answered && outcome !== null) {
      setFlash({
        correct: outcome.correct,
        omission: outcome.given === null,
        correctSide: outcome.expected as ResponseSide,
      })
      // فلشِ قطع‌شده توسط pause را دوباره زمان‌بندی کن (نگهبان ۳: در timersRef)
      scheduleAdvance(outcome.correct)
    } else {
      setFlash(null)
      // نشانه فوراً هست؛ محرک پس از CSI ظاهر می‌شود — در بازنصبِ پس از
      // مکث، CSIِ گذشته‌شده از مهلت باقیمانده کسر می‌شود تا پنجرهٔ پاسخِ
      // مؤثر کوچک‌تر از طراحی نشود (و اگر گذشته، محرک بی‌درنگ بیاید)
      const remaining = ctx.timeRemainingMs()
      const elapsed =
        remaining !== null && trial.responseWindowMs !== null
          ? trial.responseWindowMs - remaining
          : 0
      if (elapsed >= trial.cueStimulusIntervalMs) {
        setStimulusVisible(true)
      } else {
        addTimer(
          () => setStimulusVisible(true),
          trial.cueStimulusIntervalMs - elapsed,
        )
      }
      // انقضای مهلت کل مرحله (CSI + پنجرهٔ محرک) → ثبت بی‌پاسخی و مرحله بعد
      if (remaining !== null) {
        addTimer(() => {
          if (submittedRef.current) return
          submittedRef.current = true
          clearTimers()
          void ctx.submit(null).then((result) => {
            if (!result.accepted) {
              // پاسخ رد شد — قفل باز شود (نگهبان ۱)
              submittedRef.current = false
              return
            }
            if (result.sessionCompleted) return // نگهبان ۲
            setFlash({
              correct: false,
              omission: true,
              correctSide: correctSideForTrial(trial),
            })
            scheduleAdvance(false)
          })
        }, remaining)
      }
    }
    return clearTimers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trial.trialIndex])

  const answer = (side: ResponseSide) => {
    // پاسخ فقط وقتی معقول است که محرک دیده شده باشد (پاسخ پیش‌دستی ثبت
    // نمی‌شود) و مرحله قفل نباشد
    if (submittedRef.current || !stimulusVisible || ctx.paused || flash !== null) return
    submittedRef.current = true
    clearTimers()
    void ctx.submit(side).then((result) => {
      if (!result.accepted) {
        // پاسخ رد شد (مثلاً مرحله از قبل پاسخ داده شده) — قفل باز شود (نگهبان ۱)
        submittedRef.current = false
        return
      }
      if (result.sessionCompleted) return // نگهبان ۲
      setFlash({
        correct: result.record.correct,
        omission: false,
        correctSide: result.record.expected as ResponseSide,
      })
      scheduleAdvance(result.record.correct)
    })
  }

  // کیبورد فیزیکی: فلش‌ها همان دو دکمهٔ ثابت هستند (سمت فیزیکی صفحه‌کلید)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') answer('right')
      else if (event.key === 'ArrowLeft') answer('left')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  const locked = submittedRef.current || flash !== null

  return (
    <div className={styles.stage}>
      <div
        className={styles.cue}
        data-testid="ts-cue"
        data-dimension={trial.dimension}
        key={trial.trialIndex}
      >
        {DIMENSION_LABELS_FA[trial.dimension]}
      </div>

      <div className={styles.stimulusZone}>
        {stimulusVisible ? (
          <svg
            className={styles.stimulus}
            width={SIZE_PX[trial.size]}
            height={SIZE_PX[trial.size]}
            viewBox="0 0 100 100"
            aria-label={`شکل ${VALUE_LABELS_FA[trial.color]} ${VALUE_LABELS_FA[trial.shape]}`}
            data-testid="ts-stimulus"
            data-color={trial.color}
            data-shape={trial.shape}
            data-size={trial.size}
            key={trial.trialIndex}
          >
            {trial.shape === 'circle' ? (
              <circle cx="50" cy="50" r="44" fill={COLOR_CSS[trial.color]} />
            ) : (
              <polygon points="50,6 94,94 6,94" fill={COLOR_CSS[trial.color]} />
            )}
          </svg>
        ) : (
          <span className={styles.fixation} aria-hidden="true">
            +
          </span>
        )}
      </div>

      <div className={styles.feedbackZone} aria-live="polite">
        {flash !== null ? (
          <p
            className={`${styles.flash} ${flash.correct ? styles.flashCorrect : styles.flashIncorrect}`}
            data-testid="ts-feedback"
            data-correct={flash.correct ? 'true' : 'false'}
            data-omission={flash.omission ? 'true' : 'false'}
          >
            {flash.correct
              ? 'درست ✓'
              : flash.omission
                ? `بی‌پاسخی — پاسخ درست: دکمهٔ ${flash.correctSide === 'right' ? 'راست' : 'چپ'}`
                : `پاسخ درست: دکمهٔ ${flash.correctSide === 'right' ? 'راست' : 'چپ'}`}
          </p>
        ) : null}
      </div>

      <div className={styles.choices} role="group" aria-label="دکمه‌های پاسخ ثابت">
        {/* عنصر اول در RTL سمت راست رندر می‌شود — جابه‌جایی فیزیکی ندارد */}
        <button
          type="button"
          className={styles.choice}
          data-testid="ts-choice"
          data-side="right"
          onClick={() => answer('right')}
          disabled={locked || !stimulusVisible}
        >
          {buttonLabel('right', trial.dimensions)}
        </button>
        <button
          type="button"
          className={styles.choice}
          data-testid="ts-choice"
          data-side="left"
          onClick={() => answer('left')}
          disabled={locked || !stimulusVisible}
        >
          {buttonLabel('left', trial.dimensions)}
        </button>
      </div>

      <p className={gameStyles.hint}>
        به {DIMENSION_LABELS_FA[trial.dimension]} شکل پاسخ بده · نگاشت دکمه‌ها در کل جلسه ثابت است
      </p>
    </div>
  )
}
