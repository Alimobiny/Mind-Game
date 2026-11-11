import { useEffect, useRef, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import gameStyles from '../../../../components/game/game.module.css'
import { toFaDigits } from '../../../../utils/format'
import { FRAME_MS } from './engine'
import type { ObjectTrackingTrial } from './engine'
import styles from './object-tracking.module.css'

/**
 * دنبال‌کردن اشیا — UI (نخستین بازی Canvas پروژه)
 *
 * سه فاز در هر مرحله: هایلایت (چشمک اهداف) → حرکت (انیمیشن از فریم‌های
 * پیش‌محاسبه‌شدهٔ موتور) → پاسخ (اشیا ثابت و شماره‌گذاری‌شده؛ انتخاب با
 * دکمه‌های عددی زیر بوم، نه hit-testing روی Canvas — برای E2E و لمس پایدارتر).
 *
 * قطعیت و pause: کامپوننت هیچ فیزیکی اجرا نمی‌کند؛ فقط فریم‌ها را بر اساس
 * «زمان سپیده‌شدهٔ مرحله» نمایش می‌دهد. زمان سپیده‌شده از تایمر pause-آگاه
 * پوسته می‌آید: elapsedAtMount = responseWindowMs − ctx.timeRemainingMs().
 * با PAUSE این کامپوننت unmount می‌شود؛ در باز-نصبِ پس از resume همین
 * فرمول فاز و فریم درست را بازمی‌سازد — انیمیشن قطعی ادامه پیدا می‌کند،
 * مرحله هرگز از نو شروع نمی‌شود.
 *
 * نگهبان‌های اجباری:
 *  ۱) قفل submittedRef: تپ دومی روی «تأیید» یا انقضای هم‌زمان مهلت نباید
 *     پاسخ دوباره بفرستد؛ قفل فقط با result.accepted === false باز می‌شود.
 *  ۲) پس از result.sessionCompleted === true هیچ advanceای (زمان‌بندی‌شده یا
 *     مستقیم) صدا زده نمی‌شود — advance روی جلسهٔ کامل‌شده خطا می‌دهد.
 *  ۳) همهٔ تایمرها در timersRef و دستهٔ rAF در rafRef؛ هر دو در پایان هر
 *     مرحله و در unmount پاک می‌شوند.
 */

/** ضلع بوم در پیکسل منطقی (مختصات موتور نرمال [0,1] در آن ضرب می‌شود) */
const CANVAS_SIZE = 480
/** مدت نمایش بازخورد پیش از مرحلهٔ بعد (ms) */
const FEEDBACK_MS = 1600
/** دورهٔ چشمک اهداف در فاز هایلایت (ms) */
const BLINK_MS = 260

const COLOR_NEUTRAL = '#94a3b8'
const COLOR_TARGET = '#38bdf8'
const COLOR_SUCCESS = '#22c55e'
const COLOR_DANGER = '#ef4444'
const COLOR_LABEL = '#0f172a'

type Phase = 'highlight' | 'motion' | 'answer' | 'feedback'

const PHASE_TEXT_FA: Readonly<Record<Phase, string>> = {
  highlight: 'مکان دایره‌های روشن را به خاطر بسپار…',
  motion: 'با چشم دنبال دایره‌های روشن بور…',
  answer: 'کدام دایره‌ها هدف بودند؟ شماره‌هایشان را انتخاب کن',
  feedback: '',
}

export function ObjectTrackingGame({ ctx }: { ctx: ActiveGameContext }) {
  const trial = ctx.trial as ObjectTrackingTrial
  const [phase, setPhase] = useState<Phase>('highlight')
  const [selected, setSelected] = useState<number[]>([])
  const [wasCorrect, setWasCorrect] = useState(false)
  // گارد ۱ — قفل پاسخ ثبت‌شده
  const submittedRef = useRef(false)
  // گارد ۳ — همهٔ تایمرها و rAF در ref با پاک‌سازی مرکزی
  const timersRef = useRef<number[]>([])
  const rafRef = useRef<number | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const phaseRef = useRef<Phase>('highlight')

  const radiusPx = trial.trajectory.radius * CANVAS_SIZE
  const lastFrameIndex = trial.frames.length - 1
  const targetSet = new Set(trial.targetIndices)

  const clearAllTimers = () => {
    for (const id of timersRef.current) window.clearTimeout(id)
    timersRef.current = []
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }

  const addTimer = (id: number) => {
    timersRef.current.push(id)
  }

  /** تغییر فاز فقط یک‌بار برای هر مقدار (جلوگیری از re-render در هر فریم) */
  const setPhaseOnce = (next: Phase) => {
    if (phaseRef.current !== next) {
      phaseRef.current = next
      setPhase(next)
    }
  }

  /** رسم یک صحنهٔ کامل از فریم پیش‌محاسبه‌شده — خالصِ DOM-canvas */
  const drawScene = (frameIndex: number, mode: Phase, selectedNow: readonly number[]) => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    const frame = trial.frames[Math.max(0, Math.min(lastFrameIndex, frameIndex))]
    context.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
    const selectedSet = new Set(selectedNow)
    frame.forEach((p, i) => {
      const cx = p.x * CANVAS_SIZE
      const cy = p.y * CANVAS_SIZE
      let fill = COLOR_NEUTRAL
      if (mode === 'highlight' && targetSet.has(i)) fill = COLOR_TARGET
      if (mode === 'feedback') {
        if (targetSet.has(i)) fill = COLOR_SUCCESS
        else if (selectedSet.has(i)) fill = COLOR_DANGER
      }
      context.beginPath()
      context.arc(cx, cy, radiusPx, 0, Math.PI * 2)
      context.fillStyle = fill
      context.fill()
      if (mode === 'answer' || mode === 'feedback') {
        // شمارهٔ شیء = اندیس + ۱ — همان شماره‌ای که روی دکمه‌ها هست
        context.fillStyle = COLOR_LABEL
        context.font = `bold ${Math.round(radiusPx * 1.05)}px Vazirmatn, Tahoma, sans-serif`
        context.textAlign = 'center'
        context.textBaseline = 'middle'
        context.fillText(toFaDigits(i + 1), cx, cy)
      }
    })
  }

  /** ثبت پاسخ (انتخاب یا انقضای مهلت) + رفتن به بازخورد — گارد ۱ و ۲ */
  const finishTrial = async (answer: readonly number[] | null) => {
    if (submittedRef.current) return
    submittedRef.current = true
    const result = await ctx.submit(answer)
    if (!result.accepted) {
      // پاسخ رد شد (مثلاً مرحله از قبل پاسخ داده شده) — قفل باز شود
      submittedRef.current = false
      return
    }
    // جلسهٔ کامل‌شده: هیچ advanceای زمان‌بندی نشود (گارد ۲)
    if (result.sessionCompleted) return
    setWasCorrect(result.record.correct)
    setPhaseOnce('feedback')
    addTimer(
      window.setTimeout(() => {
        try {
          ctx.advance()
        } catch {
          // جلسه هم‌زمان قطع/تکمیل شده؛ کامپوننت به‌زودی حذف می‌شود
        }
      }, FEEDBACK_MS),
    )
  }

  // ساخت/بازسازی فاز برای هر مرحله — و باز-نصبِ pause-safe پس از resume
  useEffect(() => {
    clearAllTimers()
    setSelected([])

    // آیا این مرحله از پیش پاسخ داده شده (باز-نصب وسط بازخورد)؟
    const outcome = ctx.lastOutcome
    const answered = outcome !== null && outcome.trialIndex === trial.trialIndex
    submittedRef.current = answered
    if (answered && outcome !== null) {
      setWasCorrect(outcome.correct)
      phaseRef.current = 'feedback'
      setPhase('feedback')
      // پیشرویِ قطع‌شدهٔ قبلی دوباره زمان‌بندی می‌شود تا جلسه قفل نماند
      addTimer(
        window.setTimeout(() => {
          try {
            ctx.advance()
          } catch {
            // فاز دیگر ACTIVE نیست (خروج/تکمیل هم‌زمان)
          }
        }, FEEDBACK_MS),
      )
      return clearAllTimers
    }

    // زمان سپیده‌شدهٔ مرحله از تایمر pause-آگاه پوسته — منبع یگانهٔ حقیقت
    const remaining = ctx.timeRemainingMs()
    const windowMs = trial.responseWindowMs ?? trial.highlightMs + trial.motionMs
    const elapsedAtMount = remaining === null ? 0 : Math.max(0, windowMs - remaining)

    const motionEnd = trial.highlightMs + trial.motionMs
    const initialPhase: Phase =
      elapsedAtMount >= motionEnd ? 'answer' : elapsedAtMount >= trial.highlightMs ? 'motion' : 'highlight'
    phaseRef.current = initialPhase
    setPhase(initialPhase)

    // انقضای مهلت پاسخ → ثبت بی‌پاسخی دقیقاً یک‌بار (همان قفل گارد ۱)
    if (remaining !== null && remaining > 0) {
      addTimer(
        window.setTimeout(() => {
          if (submittedRef.current) return
          void finishTrial(null)
        }, remaining),
      )
    }

    if (initialPhase === 'answer') {
      drawScene(lastFrameIndex, 'answer', [])
      return clearAllTimers
    }

    // انیمیشن: نمایش فریم‌ها بر اساس زمان سپیده‌شده — همیشه از فریم درست
    const startPerf = performance.now()
    const baseElapsed = elapsedAtMount
    const tick = () => {
      rafRef.current = null
      const elapsed = baseElapsed + (performance.now() - startPerf)
      if (elapsed < trial.highlightMs) {
        setPhaseOnce('highlight')
        // چشمک اهداف: کاملاً تابع elapsed — قطعی و بدون state
        const blinkOn = Math.floor(elapsed / BLINK_MS) % 2 === 0
        drawScene(0, blinkOn ? 'highlight' : 'motion', [])
      } else if (elapsed < motionEnd) {
        setPhaseOnce('motion')
        const idx = Math.floor((elapsed - trial.highlightMs) / FRAME_MS)
        drawScene(idx, 'motion', [])
      } else {
        setPhaseOnce('answer')
        drawScene(lastFrameIndex, 'answer', [])
        return // پایان rAF — اشیا در فاز پاسخ ثابت‌اند
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    // رسم فوریِ فریم درست پیش از اولین tick (بدون فلش خالی در باز-نصب)
    if (elapsedAtMount >= trial.highlightMs) {
      drawScene(Math.floor((elapsedAtMount - trial.highlightMs) / FRAME_MS), 'motion', [])
    } else {
      drawScene(0, 'highlight', [])
    }
    rafRef.current = requestAnimationFrame(tick)
    return clearAllTimers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trial.trialIndex])

  // رسم مجدد صحنه‌های ایستا هنگام تغییر فاز/انتخاب (بازخورد پس از پاسخ)
  useEffect(() => {
    if (phase === 'answer') drawScene(lastFrameIndex, 'answer', selected)
    else if (phase === 'feedback') drawScene(lastFrameIndex, 'feedback', selected)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, selected, trial.trialIndex])

  const toggleObject = (index: number) => {
    if (phase !== 'answer' || submittedRef.current) return
    setSelected((current) => {
      if (current.includes(index)) return current.filter((i) => i !== index)
      if (current.length >= trial.targetCount) return current
      return [...current, index]
    })
  }

  const canConfirm = phase === 'answer' && !submittedRef.current && selected.length === trial.targetCount

  return (
    <div className={styles.stage}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        data-testid="ot-canvas"
        role="img"
        aria-label="بوم دنبال‌کردن اشیا"
      />
      <p className={gameStyles.hint} data-testid="ot-phase" data-phase={phase}>
        {phase === 'feedback'
          ? wasCorrect
            ? 'همهٔ اهداف را درست پیدا کردی ✓'
            : 'دقیق نبود — اهداف سبز показ داده شدند'
          : PHASE_TEXT_FA[phase]}
      </p>

      {phase === 'answer' || phase === 'feedback' ? (
        <div className={styles.numberRow} role="group" aria-label="انتخاب شمارهٔ اهداف">
          {Array.from({ length: trial.objectCount }, (_, i) => i).map((i) => {
            const isSelected = selected.includes(i)
            const isTarget = targetSet.has(i)
            let cls = styles.numButton
            if (phase === 'answer' && isSelected) cls = `${styles.numButton} ${styles.numSelected}`
            if (phase === 'feedback') {
              if (isTarget) cls = `${styles.numButton} ${styles.numTarget}`
              else if (isSelected) cls = `${styles.numButton} ${styles.numWrong}`
            }
            return (
              <button
                type="button"
                key={i}
                className={cls}
                data-testid={`ot-select-${i + 1}`}
                onClick={() => toggleObject(i)}
                disabled={phase !== 'answer'}
                aria-pressed={isSelected}
                aria-label={`شیء شمارهٔ ${toFaDigits(i + 1)}`}
              >
                {toFaDigits(i + 1)}
              </button>
            )
          })}
        </div>
      ) : null}

      {phase === 'answer' ? (
        <>
          <p className={gameStyles.hint}>
            {toFaDigits(selected.length)} از {toFaDigits(trial.targetCount)} هدف انتخاب شد
          </p>
          <button
            type="button"
            className={gameStyles.primaryButton}
            data-testid="ot-confirm"
            onClick={() => void finishTrial(selected)}
            disabled={!canConfirm}
          >
            تأیید
          </button>
        </>
      ) : null}

      {phase === 'feedback' ? (
        <div
          className={`${gameStyles.feedback} ${wasCorrect ? gameStyles.feedbackCorrect : gameStyles.feedbackIncorrect}`}
        >
          {wasCorrect ? 'کامل و درست!' : 'دقیق نبود'}
        </div>
      ) : null}
    </div>
  )
}
