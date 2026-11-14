import { useEffect, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import { useTrialGuards } from '../../../../components/game/useTrialGuards'
import gameStyles from '../../../../components/game/game.module.css'
import { toFaDigits } from '../../../../utils/format'
import type { MemoriseGridTrial } from './engine'
import styles from './memorise-grid.module.css'

/**
 * Memorise Grid — UI
 *
 * نمایش الگوی خانه‌های فعال → انتخاب همان خانه‌ها → بازخورد با نمایش
 * الگوی درست (سبز = درست انتخاب کردی، زرد = خانه هدف بود و انتخاب نکردی).
 */
export function MemoriseGridGame({ ctx }: { ctx: ActiveGameContext }) {
  const trial = ctx.trial as MemoriseGridTrial
  const [phase, setPhase] = useState<'memorise' | 'recall' | 'feedback'>('memorise')
  const [selected, setSelected] = useState<number[]>([])
  const [wasCorrect, setWasCorrect] = useState(false)
  const guards = useTrialGuards(ctx, trial.trialIndex)

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

    // بازنصبِ پس از مکث (PAUSED=unmount): ارائه از زمانِ سپری‌شدهٔ سشن
    // ادامه می‌یابد نه از صفر — بازپخش الگو، دوبار-دیده‌شدن محرک و بایاس
    // صعودی بود (GAMES-AUDIT §۲-۱). رویداد خام از سمت مدیر contaminated
    // علامت خورده است؛ انتخاب‌های نجات‌یافته هم برمی‌گردند.
    const interrupted = ctx.trialPresentation.wasInterrupted()
    const elapsed = ctx.trialElapsedMs()
    const savedSelection = interrupted ? ctx.trialPresentation.get<number[]>('selected') : undefined

    if (interrupted && elapsed >= trial.memoriseMs) {
      // فاز حفظ پیش از مکث تمام شده بود — مستقیم به بازیابی
      setPhase('recall')
      setSelected(savedSelection ?? [])
      return
    }
    setPhase('memorise')
    setSelected(savedSelection ?? [])
    const remainingMs = interrupted ? Math.max(0, trial.memoriseMs - elapsed) : trial.memoriseMs
    guards.setTrackedTimeout(() => setPhase('recall'), remainingMs)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trial.trialIndex])

  const toggleCell = (index: number) => {
    if (phase !== 'recall') return
    const next = selected.includes(index)
      ? selected.filter((c) => c !== index)
      : selected.length >= trial.activeCells.length
        ? selected
        : [...selected, index]
    // نجات انتخاب برای بازنصبِ مکث — نوشتن در همان تعامل، نه افکت
    ctx.trialPresentation.set('selected', next)
    setSelected(next)
  }

  const submit = () => {
    if (selected.length !== trial.activeCells.length) return
    void guards.submitOnce(selected, {
      onAccepted: (result) => {
        setWasCorrect(result.record.correct)
        setPhase('feedback')
        // تایمر پیشروی پس از بازخورد — ردیابی‌شده؛ در تغییر مرحله/unmount پاک می‌شود
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
  const activeSet = new Set(trial.activeCells)
  const selectedSet = new Set(selected)

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
          if (phase === 'memorise' && activeSet.has(i)) cellClass = `${styles.cell} ${styles.active}`
          if (phase === 'recall' && selectedSet.has(i)) cellClass = `${styles.cell} ${styles.selected}`
          if (phase === 'feedback') {
            if (activeSet.has(i) && selectedSet.has(i)) cellClass = `${styles.cell} ${styles.hit}`
            else if (activeSet.has(i)) cellClass = `${styles.cell} ${styles.miss}`
            else if (selectedSet.has(i)) cellClass = `${styles.cell} ${styles.falseAlarm}`
          }
          return (
            <button
              type="button"
              key={i}
              className={cellClass}
              onClick={() => toggleCell(i)}
              disabled={phase !== 'recall'}
              aria-pressed={phase === 'recall' && selectedSet.has(i)}
              aria-label={`خانه ${toFaDigits(i + 1)}`}
              data-cell-index={i}
              data-active={phase === 'memorise' && activeSet.has(i) ? 'true' : undefined}
            />
          )
        })}
      </div>
      {phase === 'memorise' ? (
        <p className={gameStyles.hint}>مکان خانه‌های روشن را به خاطر بسپار…</p>
      ) : null}
      {phase === 'recall' ? (
        <>
          <p className={gameStyles.hint}>
            {toFaDigits(selected.length)} از {toFaDigits(trial.activeCells.length)} خانه انتخاب شد
          </p>
          <button
            type="button"
            className={gameStyles.primaryButton}
            onClick={submit}
            disabled={selected.length !== trial.activeCells.length}
          >
            تأیید
          </button>
        </>
      ) : null}
      {phase === 'feedback' ? (
        <div className={`${gameStyles.feedback} ${wasCorrect ? gameStyles.feedbackCorrect : gameStyles.feedbackIncorrect}`}>
          {wasCorrect ? 'کامل و درست!' : 'دقیق نبود'}
        </div>
      ) : null}
    </>
  )
}
