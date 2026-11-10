import { useCallback, useEffect, useRef, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import gameStyles from '../../../../components/game/game.module.css'
import { toFaDigits } from '../../../../utils/format'
import type { SpatialSequenceTrial } from './engine'
import styles from './spatial-sequence.module.css'

/**
 * Spatial Sequence — UI
 *
 * فازهای هر مرحله: نمایش تک‌به‌تک خانه‌های توالی → بازتولید همان
 * ترتیب با لمس خانه‌ها → بازخورد کوتاه (توالی درست شماره‌خورده در
 * سبز، انتخاب‌های غلط کاربر در قرمز) → مرحله بعد.
 * منطق کاملاً در engine است؛ این کامپوننت فقط رندر و ورودی.
 */
export function SpatialSequenceGame({ ctx }: { ctx: ActiveGameContext }) {
  const trial = ctx.trial as SpatialSequenceTrial
  const [phase, setPhase] = useState<'showing' | 'recall' | 'feedback'>('showing')
  /** اندیس موقعیت فعلی در توالی (null = هیچ خانه‌ای روشن نیست) */
  const [shownPosition, setShownPosition] = useState<number | null>(null)
  const [entered, setEntered] = useState<number[]>([])
  const [wasCorrect, setWasCorrect] = useState(false)
  const trialKey = `${trial.trialIndex}`
  const timeoutsRef = useRef<number[]>([])
  // قفل پاسخِ ثبت‌شده — دوبل‌تپ روی «تأیید» نباید advance دومی بزند
  const submittedRef = useRef(false)

  const clearTimers = useCallback(() => {
    for (const t of timeoutsRef.current) window.clearTimeout(t)
    timeoutsRef.current = []
  }, [])

  // ریست فازها با شروع هر مرحله جدید + زمان‌بندی نمایش تک‌به‌تک:
  // هر خانه به‌مدت displayMsPerCell روشن است و gapMs فاصله تا بعدی
  useEffect(() => {
    submittedRef.current = false
    setPhase('showing')
    setShownPosition(trial.sequence.length > 0 ? 0 : null)
    setEntered([])
    setWasCorrect(false)
    clearTimers()
    const { displayMsPerCell: display, gapMs: gap } = trial
    const timers: number[] = []
    trial.sequence.forEach((_, i) => {
      const startAt = i * (display + gap)
      timers.push(window.setTimeout(() => setShownPosition(i), startAt))
      timers.push(window.setTimeout(() => setShownPosition(null), startAt + display))
    })
    // پایان نمایش همه خانه‌ها → فاز بازتولید
    timers.push(
      window.setTimeout(() => {
        setShownPosition(null)
        setPhase('recall')
      }, trial.sequence.length * (display + gap)),
    )
    timeoutsRef.current = timers
    return clearTimers
    // trialKey تغییر می‌کند دقیقاً وقتی مرحله جدید شروع می‌شود
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trialKey, clearTimers])

  const pressCell = (index: number) => {
    if (phase !== 'recall') return
    setEntered((current) => {
      // توالی هدف خانه تکراری ندارد؛ لمس خانه تکراری نادیده گرفته می‌شود
      if (current.length >= trial.sequence.length || current.includes(index)) return current
      return [...current, index]
    })
  }

  const clearEntered = () => setEntered([])

  const submit = async () => {
    if (submittedRef.current || phase !== 'recall' || entered.length !== trial.sequence.length) return
    submittedRef.current = true
    const result = await ctx.submit(entered)
    if (!result.accepted) {
      submittedRef.current = false
      return
    }
    // آخرین پاسخ جلسه را کامل کرد → advanceی برای مرحله بعدی وجود ندارد
    if (result.sessionCompleted) return
    setWasCorrect(result.record.correct)
    setPhase('feedback')
    window.setTimeout(() => ctx.advance(), 1400)
  }

  const total = trial.gridSize * trial.gridSize
  // جایگاه هر خانه در ورودی کاربر (خانه → موقعیت)
  const enteredPosition = new Map(entered.map((cell, pos) => [cell, pos] as const))
  // جایگاه هر خانه در توالی درست (خانه → موقعیت)
  const sequencePosition = new Map(trial.sequence.map((cell, pos) => [cell, pos] as const))
  const activeCell =
    phase === 'showing' && shownPosition !== null ? (trial.sequence[shownPosition] ?? null) : null

  return (
    <>
      <div
        className={styles.grid}
        style={{ gridTemplateColumns: `repeat(${trial.gridSize}, 1fr)` }}
        role={phase === 'recall' ? 'group' : 'presentation'}
        aria-label="شبکه"
      >
        {Array.from({ length: total }, (_, i) => {
          let cellClass = styles.cell
          let badge: string | null = null
          if (phase === 'showing' && activeCell === i) {
            cellClass = `${styles.cell} ${styles.active}`
          }
          if (phase === 'recall') {
            const pos = enteredPosition.get(i)
            if (pos !== undefined) {
              cellClass = `${styles.cell} ${styles.selected}`
              badge = toFaDigits(pos + 1)
            }
          }
          if (phase === 'feedback') {
            const truePos = sequencePosition.get(i)
            if (truePos !== undefined) {
              // خانه‌های توالی درست با شماره ترتیب ۱..K در سبز
              cellClass = `${styles.cell} ${styles.hit}`
              badge = toFaDigits(truePos + 1)
            } else if (enteredPosition.has(i)) {
              // انتخاب‌های خارج از توالی درستِ کاربر در قرمز
              cellClass = `${styles.cell} ${styles.wrong}`
              badge = toFaDigits((enteredPosition.get(i) ?? 0) + 1)
            }
          }
          return (
            <button
              type="button"
              key={i}
              className={cellClass}
              onClick={() => pressCell(i)}
              disabled={phase !== 'recall'}
              aria-label={`خانه ${toFaDigits(i + 1)}`}
              data-cell-index={i}
              data-active={phase === 'showing' && activeCell === i ? 'true' : undefined}
            >
              {badge !== null ? <span className={styles.badge}>{badge}</span> : null}
            </button>
          )
        })}
      </div>
      {phase === 'showing' ? (
        <p className={gameStyles.hint}>ترتیب روشن‌شدن خانه‌ها را به خاطر بسپار…</p>
      ) : null}
      {phase === 'recall' ? (
        <>
          <p className={gameStyles.hint}>همان ترتیب را بزن</p>
          <div className={gameStyles.buttonRow}>
            <button
              type="button"
              className={gameStyles.primaryButton}
              onClick={() => void submit()}
              disabled={entered.length !== trial.sequence.length}
              data-testid="spatial-confirm"
            >
              تأیید
            </button>
            <button
              type="button"
              className={gameStyles.secondaryButton}
              onClick={clearEntered}
              disabled={entered.length === 0}
            >
              پاک کردن
            </button>
          </div>
        </>
      ) : null}
      {phase === 'feedback' ? (
        <div
          className={`${gameStyles.feedback} ${wasCorrect ? gameStyles.feedbackCorrect : gameStyles.feedbackIncorrect}`}
        >
          {wasCorrect ? 'درست!' : 'نادرست'}
        </div>
      ) : null}
    </>
  )
}
