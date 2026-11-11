import { useEffect, useRef, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import gameStyles from '../../../../components/game/game.module.css'
import { toFaDigits } from '../../../../utils/format'
import {
  MIRROR_AXIS_ANGLES,
  MIRROR_AXIS_LABELS_FA,
  realHandAngles,
  type MirrorClockTrial,
  type TimeOption,
} from './engine'
import styles from './mirror-clock.module.css'

/**
 * ساعت آینه‌ای — UI
 *
 * کل صفحهٔ ساعت (گذرنده از مرکز، تیک‌ها، اعداد فارسی و عقربه‌ها) با زاویهٔ
 * واقعی رسم و سپس با transform معادل SVG حول محور آینه بازتاب می‌شود —
 * یعنی همان تبدیل 2φ − θ که موتور به‌عنوان حقیقت زاویه‌ها تولید می‌کند.
 * کاربر زمان واقعی را از چهار دکمهٔ «ساعت:دقیقه» انتخاب می‌کند.
 *
 * نگهبان‌های اجباری:
 *  ۱) قفل submittedRef: دوبل‌تپ روی گزینه‌ها پاسخ دوباره نمی‌فرستد؛
 *     قفل فقط با result.accepted === false باز می‌شود.
 *  ۲) پس از result.sessionCompleted === true هیچ advanceی زمان‌بندی
 *     نمی‌شود (هر دو مسیر پاسخ و انقضای مهلت).
 *  ۳) هر دو تایمر (انقضای مهلت و advance بازخورد) در ref‌اند و در
 *     unmount و تغییر مرحله پاک می‌شوند؛ باز-نصبِ پس از pause حالت
 *     «مرحله از پیش پاسخ‌داده» را بازسازی می‌کند تا جلسه قفل نماند.
 */

const FLASH_CORRECT_MS = 350
const FLASH_WRONG_MS = 1100
const FLASH_OMISSION_MS = 1100

/** هندسهٔ صفحهٔ ساعت در viewBox مربعی ۲۰۰×۲۰۰ */
const SIZE = 200
const CX = SIZE / 2
const CY = SIZE / 2
const FACE_R = 92
const HOUR_NUMBER_R = 68

function polar(angleDeg: number, radius: number): { x: number; y: number } {
  const rad = (angleDeg * Math.PI) / 180
  return { x: CX + radius * Math.sin(rad), y: CY - radius * Math.cos(rad) }
}

/** «۳:۴۵» با ارقام فارسی و دقیقهٔ دورقمی */
function formatClockTime(option: TimeOption): string {
  return `${toFaDigits(option.hour)}:${toFaDigits(String(option.minute).padStart(2, '0'))}`
}

type FlashKind = 'correct' | 'incorrect' | 'omission'

export function MirrorClockGame({ ctx }: { ctx: ActiveGameContext }) {
  const trial = ctx.trial as MirrorClockTrial
  const [flash, setFlash] = useState<FlashKind | null>(null)
  const submittedRef = useRef(false)
  const deadlineRef = useRef<number | null>(null)
  const flashTimerRef = useRef<number | null>(null)

  const clearTimers = () => {
    if (deadlineRef.current !== null) {
      window.clearTimeout(deadlineRef.current)
      deadlineRef.current = null
    }
    if (flashTimerRef.current !== null) {
      window.clearTimeout(flashTimerRef.current)
      flashTimerRef.current = null
    }
  }

  /** پیشروی پس از فلش — اگر جلسه هم‌زمان قطع/تکمیل شده، بی‌اثر */
  const scheduleAdvance = (delayMs: number) => {
    flashTimerRef.current = window.setTimeout(() => {
      flashTimerRef.current = null
      try {
        ctx.advance()
      } catch {
        // جلسه هم‌زمان قطع/تکمیل شده؛ کامپوننت به‌زودی حذف می‌شود
      }
    }, delayMs)
  }

  // ریست برای هر مرحله جدید — و باز-نصب پس از pause/resume
  useEffect(() => {
    clearTimers()
    const outcome = ctx.lastOutcome
    const answered = outcome !== null && outcome.trialIndex === trial.trialIndex
    submittedRef.current = answered
    if (answered && outcome !== null) {
      // فلشِ قطع‌شده را بساز و پیشروی را دوباره زمان‌بندی کن
      setFlash(outcome.correct ? 'correct' : outcome.outcome === 'omission' ? 'omission' : 'incorrect')
      scheduleAdvance(outcome.correct ? FLASH_CORRECT_MS : FLASH_WRONG_MS)
      return clearTimers
    }
    setFlash(null)
    // انقضای مهلت پاسخ → ثبت بی‌پاسخی و رفتن به مرحله بعد
    const remaining = ctx.timeRemainingMs()
    if (remaining !== null) {
      deadlineRef.current = window.setTimeout(() => {
        if (submittedRef.current) return
        submittedRef.current = true
        void ctx.submit(null).then((result) => {
          if (!result.accepted) {
            // مرحله از پیش پاسخ داده شده — قفل باز شود
            submittedRef.current = false
            return
          }
          setFlash('omission')
          if (result.sessionCompleted) return // نگهبان ۲
          scheduleAdvance(FLASH_OMISSION_MS)
        })
      }, remaining)
    }
    return clearTimers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trial.trialIndex])

  const locked = submittedRef.current || flash !== null

  const answer = (option: TimeOption) => {
    if (submittedRef.current || flash !== null || ctx.paused) return
    submittedRef.current = true
    void ctx.submit(option).then((result) => {
      if (!result.accepted) {
        // پاسخ رد شد (مثلاً مرحله از قبل پاسخ داده شده) — قفل باز شود
        submittedRef.current = false
        return
      }
      if (result.sessionCompleted) {
        // جلسه تمام است — هیچ advanceای زمان‌بندی نشود (نگهبان ۲)
        return
      }
      setFlash(result.record.correct ? 'correct' : 'incorrect')
      scheduleAdvance(result.record.correct ? FLASH_CORRECT_MS : FLASH_WRONG_MS)
    })
  }

  // هندسهٔ عقربه‌ها با زاویهٔ واقعی — گروهِ آینه تبدیل را کامل می‌کند
  const real = realHandAngles(trial.hour, trial.minute)
  const axisDeg = MIRROR_AXIS_ANGLES[trial.mirrorAxis]
  const mirrorTransform = `translate(${CX} ${CY}) rotate(${axisDeg}) scale(-1 1) rotate(${-axisDeg}) translate(${-CX} ${-CY})`

  const hourTip = polar(real.hourAngle, 46)
  const hourTail = polar(real.hourAngle, -14)
  const minuteTip = polar(real.minuteAngle, 72)
  const minuteTail = polar(real.minuteAngle, -16)

  const ticks: { x1: number; y1: number; x2: number; y2: number; major: boolean }[] = []
  for (let i = 0; i < 60; i++) {
    const angle = i * 6
    const major = i % 5 === 0
    const outer = polar(angle, FACE_R - 3)
    const inner = polar(angle, major ? FACE_R - 13 : FACE_R - 8)
    ticks.push({ x1: outer.x, y1: outer.y, x2: inner.x, y2: inner.y, major })
  }

  const numbers = Array.from({ length: 12 }, (_, i) => {
    const hour = i === 0 ? 12 : i
    const pos = polar(i * 30, HOUR_NUMBER_R)
    return { hour, ...pos }
  })

  return (
    <div className={styles.stage}>
      <span className={styles.axisBadge} data-testid="mc-axis">
        آینه: {MIRROR_AXIS_LABELS_FA[trial.mirrorAxis]}
      </span>

      <svg
        className={styles.clockSvg}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label="نمایش ساعت در آینه"
        data-testid="mc-clock"
        data-hour={trial.hour}
        data-minute={trial.minute}
        data-axis={trial.mirrorAxis}
      >
        <g transform={mirrorTransform}>
          <circle className={styles.face} cx={CX} cy={CY} r={FACE_R} />
          {ticks.map((tick, i) => (
            <line
              key={i}
              className={tick.major ? styles.tickMajor : styles.tickMinor}
              x1={tick.x1}
              y1={tick.y1}
              x2={tick.x2}
              y2={tick.y2}
            />
          ))}
          {numbers.map((num) => (
            <text key={num.hour} className={styles.number} x={num.x} y={num.y}>
              {toFaDigits(num.hour)}
            </text>
          ))}
          <line
            className={styles.handHour}
            x1={hourTail.x}
            y1={hourTail.y}
            x2={hourTip.x}
            y2={hourTip.y}
          />
          <line
            className={styles.handMinute}
            x1={minuteTail.x}
            y1={minuteTail.y}
            x2={minuteTip.x}
            y2={minuteTip.y}
          />
          <circle className={styles.centerDot} cx={CX} cy={CY} r={5.5} />
        </g>
      </svg>

      <div className={styles.flashZone} aria-live="polite">
        {flash !== null ? (
          <p
            className={`${gameStyles.feedback} ${flash === 'correct' ? gameStyles.feedbackCorrect : gameStyles.feedbackIncorrect}`}
            data-testid="mc-feedback"
            data-correct={flash === 'correct' ? 'true' : 'false'}
          >
            {flash === 'correct'
              ? 'درست ✓'
              : flash === 'omission'
                ? `وقت تمام شد · ساعت درست: ${formatClockTime(trial)}`
                : `ساعت درست: ${formatClockTime(trial)}`}
          </p>
        ) : null}
      </div>

      <div className={styles.optionGrid} role="group" aria-label="انتخاب زمان واقعی ساعت">
        {trial.options.map((option, index) => (
          <button
            key={index}
            type="button"
            className={styles.optionButton}
            data-testid="mc-option"
            data-correct={option.hour === trial.hour && option.minute === trial.minute ? 'true' : 'false'}
            onClick={() => answer(option)}
            disabled={locked || ctx.paused}
          >
            <span className={styles.optionLabel} dir="ltr">
              {formatClockTime(option)}
            </span>
          </button>
        ))}
      </div>

      <p className={gameStyles.hint}>ساعت را در آینه می‌بینی — زمان واقعی را انتخاب کن</p>
    </div>
  )
}
