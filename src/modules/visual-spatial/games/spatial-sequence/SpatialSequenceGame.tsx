import { useEffect, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import { useTrialGuards } from '../../../../components/game/useTrialGuards'
import gameStyles from '../../../../components/game/game.module.css'
import { toFaDigits } from '../../../../utils/format'
import { scheduleCadence } from '../../../shared/presentation-resume'
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
  const guards = useTrialGuards(ctx, trial.trialIndex)

  // شروع فاز پاسخ را در مدیر علامت بزن — RT از بازشدن بازتولید توالی
  // سنجیده شود نه از شروع نمایش خانه‌ها (§۲-۲ ممیزی). idempotent؛ مسیر بازنصب مکث هم پوشش دارد.
  useEffect(() => {
    if (phase === 'recall') ctx.beginResponsePhase()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ریست فازها با شروع هر مرحله جدید + زمان‌بندی نمایش تک‌به‌تک:
  // هر خانه به‌مدت displayMsPerCell روشن است و gapMs فاصله تا بعدی.
  // بازنصبِ پس از مکث: ارائه از زمان سپری‌شدهٔ جلسه ادامه می‌یابد نه از
  // صفر — بازپخش توالی، دوبار-دیدن محرک و بایاس صعودی بود (GAMES-AUDIT §۲-۱)
  useEffect(() => {
    // رفع ریس pause بین پذیرش پاسخ و advance (الگوی محاسبه ×۲۰): پاسخِ
    // ثبت‌شدهٔ بدون پیشروی را در بازنصب بلافاصله جلو ببر تا جلسه قفل نماند
    const outcome = ctx.lastOutcome
    if (outcome !== null && outcome.trialIndex === trial.trialIndex) {
      try {
        ctx.advance()
      } catch {
        // جلسه هم‌زمان قطع/تکمیل شده
      }
      return
    }

    const interrupted = ctx.trialPresentation.wasInterrupted()
    const elapsedMs = interrupted ? ctx.trialElapsedMs() : 0
    const saved = interrupted ? ctx.trialPresentation.get<number[]>('entered') : undefined
    setEntered(saved ?? [])
    setWasCorrect(false)
    setShownPosition(null)

    const { displayMsPerCell: display, gapMs: gap } = trial
    const totalMs = trial.sequence.length * (display + gap)
    const finishShowing = () => {
      setShownPosition(null)
      setPhase('recall')
    }
    const timers = scheduleCadence(
      trial.sequence.map((_, i) => ({
        startAt: i * (display + gap),
        displayMs: display,
        onShow: () => setShownPosition(i),
        onHide: () => setShownPosition((current) => (current === i ? null : current)),
      })),
      totalMs,
      finishShowing,
      elapsedMs,
    )
    if (elapsedMs >= totalMs) {
      // ارائهٔ تمام‌شده — scheduleCadence خودش finishShowing زد؛ فاز را هم بنشان
      setPhase('recall')
    } else {
      setPhase('showing')
    }
    for (const t of timers) guards.trackTimeoutId(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trial.trialIndex])

  const pressCell = (index: number) => {
    if (phase !== 'recall') return
    // توالی هدف خانه تکراری ندارد؛ لمس خانه تکراری نادیده گرفته می‌شود
    if (entered.length >= trial.sequence.length || entered.includes(index)) return
    const next = [...entered, index]
    // نجات ورودی برای بازنصبِ مکث
    ctx.trialPresentation.set('entered', next)
    setEntered(next)
  }

  const clearEntered = () => {
    ctx.trialPresentation.set('entered', [])
    setEntered([])
  }

  const submit = () => {
    if (phase !== 'recall' || entered.length !== trial.sequence.length) return
    void guards.submitOnce(entered, {
      onAccepted: (result) => {
        setWasCorrect(result.record.correct)
        setPhase('feedback')
        // تایمر پیشروی: ردیابی‌شده + مهار خطای جلسهٔ هم‌زمان قطع/تکمیل
        guards.setTrackedTimeout(() => {
          try {
            ctx.advance()
          } catch {
            // جلسه هم‌زمان قطع/تکمیل شده
          }
        }, 1400)
      },
      autoAdvance: false,
    })
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
              onClick={submit}
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
