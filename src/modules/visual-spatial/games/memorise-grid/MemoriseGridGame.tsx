import { useEffect, useRef, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
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
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    setPhase('memorise')
    setSelected([])
    if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setPhase('recall'), trial.memoriseMs)
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trial.trialIndex])

  const toggleCell = (index: number) => {
    if (phase !== 'recall') return
    setSelected((current) =>
      current.includes(index)
        ? current.filter((c) => c !== index)
        : current.length >= trial.activeCells.length
          ? current
          : [...current, index],
    )
  }

  const submit = async () => {
    if (selected.length !== trial.activeCells.length) return
    const result = await ctx.submit(selected)
    setWasCorrect(result.accepted ? result.record.correct : false)
    setPhase('feedback')
    window.setTimeout(() => ctx.advance(), 1400)
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
            onClick={() => void submit()}
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
