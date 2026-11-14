import { useEffect, useRef, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import gameStyles from '../../../../components/game/game.module.css'
import { toFaDigits } from '../../../../utils/format'
import type { SymmetrySpanTrial } from './engine'
import { SYMSPAN_GRID_SIZE } from './engine'
import styles from './symmetry-span.module.css'

/**
 * دهانهٔ تقارن — UI
 *
 * ماشین فاز درون‌دسته: الگوی تقارن (قضاوت متقارن/نامتقارن) → فلش بازخورد →
 * خانهٔ هدف در شبکهٔ ۴×۴ → زوج بعدی … → بازیابی ترتیبی با لمس خانه‌ها.
 * دکمه‌های قضاوت فقط claim در ref ثبت می‌کنند؛ تنها submitِ فاز بازیابی (یا
 * انقضای مهلت کل دسته) کل پاسخ را می‌فرستد — قرارداد یک-submit-per-trial.
 * هر سه گارد الزامی رعایت شده است.
 */

type Phase =
  | { readonly kind: 'pattern'; readonly itemIndex: number }
  | { readonly kind: 'feedback'; readonly itemIndex: number; readonly judgment: boolean | null; readonly wasCorrect: boolean }
  | { readonly kind: 'cell'; readonly itemIndex: number }
  | { readonly kind: 'recall' }

const CELLS = Array.from({ length: SYMSPAN_GRID_SIZE * SYMSPAN_GRID_SIZE }, (_, i) => i)

export function SymmetrySpanGame({ ctx }: { ctx: ActiveGameContext }) {
  const trial = ctx.trial as SymmetrySpanTrial
  const [phase, setPhase] = useState<Phase>({ kind: 'pattern', itemIndex: 0 })
  const [selected, setSelected] = useState<readonly number[]>([])
  /** selected در state است ولی مسیر مهلت باید آخرین مقدار را ببیند */
  const selectedRef = useRef<readonly number[]>([])
  selectedRef.current = selected
  const timersRef = useRef<number[]>([])
  const deadlineRef = useRef<number[]>([])
  const submittedRef = useRef(false)
  const judgmentsRef = useRef<(boolean | null)[]>([])
  const rtsRef = useRef<(number | null)[]>([])
  const phaseStartRef = useRef(0)

  const clearPhaseTimers = () => {
    for (const t of timersRef.current) window.clearTimeout(t)
    timersRef.current = []
  }

  useEffect(() => {
    submittedRef.current = false
    setPhase({ kind: 'pattern', itemIndex: 0 })
    setSelected([])
    judgmentsRef.current = trial.set.items.map(() => null)
    rtsRef.current = trial.set.items.map(() => null)
    phaseStartRef.current = performance.now()
    clearPhaseTimers()
    for (const t of deadlineRef.current) window.clearTimeout(t)
    deadlineRef.current = []

    // انقضای مهلت کل دسته → یک submit با هرچه تا حالا جمع شده
    const remaining = ctx.timeRemainingMs()
    if (remaining !== null) {
      deadlineRef.current.push(
        window.setTimeout(() => {
          if (submittedRef.current) return
          submittedRef.current = true
          const anyResponse =
            judgmentsRef.current.some((j) => j !== null) || selectedRef.current.length > 0
          void ctx.submit(
            anyResponse
              ? {
                  processingJudgments: judgmentsRef.current,
                  processingRtMs: rtsRef.current,
                  recalled: selectedRef.current,
                }
              : null,
          ).then((result) => {
            if (!result.accepted) {
              // persist_failed: مدیر rollback کرده — قفل باز بماند (مسیر
              // submitSet همین را دارد؛ مسیر مهلت هم باید داشته باشد)
              submittedRef.current = false
              return
            }
            if (!result.sessionCompleted) {
              try {
                ctx.advance()
              } catch {
                // جلسه هم‌زمان قطع/تکمیل شده — بی‌اثر
              }
            }
          })
        }, remaining),
      )
    }
    return () => {
      clearPhaseTimers()
      for (const t of deadlineRef.current) window.clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trial.trialIndex])

  useEffect(() => {
    phaseStartRef.current = performance.now()
    clearPhaseTimers()
    if (phase.kind === 'pattern') {
      const itemIndex = phase.itemIndex
      timersRef.current.push(
        window.setTimeout(() => {
          if (!trial.set.items[itemIndex]) return
          judgmentsRef.current[itemIndex] = null
          rtsRef.current[itemIndex] = null
          setPhase({ kind: 'feedback', itemIndex, judgment: null, wasCorrect: false })
        }, trial.patternWindowMs),
      )
    } else if (phase.kind === 'feedback') {
      const itemIndex = phase.itemIndex
      timersRef.current.push(
        window.setTimeout(() => setPhase({ kind: 'cell', itemIndex }), trial.feedbackMs),
      )
    } else if (phase.kind === 'cell') {
      const itemIndex = phase.itemIndex
      timersRef.current.push(
        window.setTimeout(() => {
          if (itemIndex + 1 < trial.set.items.length) {
            setPhase({ kind: 'pattern', itemIndex: itemIndex + 1 })
          } else {
            setPhase({ kind: 'recall' })
          }
        }, trial.cellDisplayMs),
      )
    }
    // فاز recall تایمر فاز ندارد — مهلت کل دسته زنده است
    return clearPhaseTimers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, trial.trialIndex])

  const judge = (value: boolean) => {
    if (submittedRef.current || ctx.paused) return
    if (phase.kind !== 'pattern') return
    const item = trial.set.items[phase.itemIndex]
    if (!item) return
    judgmentsRef.current[phase.itemIndex] = value
    rtsRef.current[phase.itemIndex] = Math.round(performance.now() - phaseStartRef.current)
    setPhase({
      kind: 'feedback',
      itemIndex: phase.itemIndex,
      judgment: value,
      wasCorrect: value === item.pattern.isSymmetric,
    })
  }

  const tapCell = (cell: number) => {
    if (submittedRef.current || ctx.paused) return
    if (phase.kind !== 'recall') return
    setSelected((current) =>
      current.includes(cell) ? current.filter((c) => c !== cell) : [...current, cell],
    )
  }

  const clearSelection = () => {
    if (submittedRef.current || ctx.paused) return
    setSelected([])
  }

  const submitSet = () => {
    if (submittedRef.current || ctx.paused) return
    if (selected.length !== trial.set.items.length) return
    submittedRef.current = true
    void ctx.submit({
      processingJudgments: judgmentsRef.current,
      processingRtMs: rtsRef.current,
      recalled: selected,
    }).then((result) => {
      if (result.accepted && !result.sessionCompleted) {
        try {
          ctx.advance()
        } catch {
          // جلسه هم‌زمان تمام/قطع شده — بی‌اثر
        }
      } else if (!result.accepted) {
        submittedRef.current = false
      }
    })
  }

  return (
    <div className={styles.stage}>
      {(phase.kind === 'pattern' || phase.kind === 'feedback') && (
        <PatternArea trial={trial} phase={phase} onJudge={judge} />
      )}
      {phase.kind === 'cell' && <CellArea trial={trial} itemIndex={phase.itemIndex} />}
      {phase.kind === 'recall' && (
        <RecallArea
          trial={trial}
          selected={selected}
          onTap={tapCell}
          onClear={clearSelection}
          onSubmit={submitSet}
        />
      )}
    </div>
  )
}

function PatternArea({
  trial,
  phase,
  onJudge,
}: {
  trial: SymmetrySpanTrial
  phase:
    | { kind: 'pattern'; itemIndex: number }
    | { kind: 'feedback'; itemIndex: number; judgment: boolean | null; wasCorrect: boolean }
  onJudge: (value: boolean) => void
}) {
  const item = trial.set.items[phase.itemIndex]
  if (!item) return null

  if (phase.kind === 'feedback') {
    return (
      <div className={styles.phaseArea} data-testid="symspan-pattern-feedback">
        <p className={gameStyles.hint}>قضاوت ثبت شد</p>
        <div
          className={`${styles.feedbackFlash} ${
            phase.judgment === null
              ? styles.feedbackNone
              : phase.wasCorrect
                ? styles.feedbackCorrect
                : styles.feedbackWrong
          }`}
        >
          {phase.judgment === null ? 'بی‌پاسخ' : phase.wasCorrect ? 'درست ✓' : 'غلط ✗'}
        </div>
      </div>
    )
  }

  return (
    <div
      className={styles.phaseArea}
      data-testid="symspan-pattern"
      data-symmetric={item.pattern.isSymmetric ? 'true' : 'false'}
      data-item-index={phase.itemIndex}
    >
      <p className={gameStyles.hint}>آیا این الگو نسبت به محور عمودی وسط متقارن است؟</p>
      <div className={styles.patternGrid} aria-label="الگوی شبکه">
        {item.pattern.cells.map((filled, i) => (
          <span key={i} className={`${styles.patternCell} ${filled ? styles.patternFilled : ''}`} />
        ))}
      </div>
      <div className={styles.judgeRow} role="group" aria-label="قضاوت تقارن">
        <button type="button" className={styles.judgeButton} onClick={() => onJudge(true)} data-testid="symspan-judge-symmetric">
          متقارن
        </button>
        <button type="button" className={styles.judgeButton} onClick={() => onJudge(false)} data-testid="symspan-judge-asymmetric">
          نامتقارن
        </button>
      </div>
    </div>
  )
}

function CellArea({ trial, itemIndex }: { trial: SymmetrySpanTrial; itemIndex: number }) {
  const item = trial.set.items[itemIndex]
  if (!item) return null
  return (
    <div className={styles.phaseArea} data-testid="symspan-cell" data-cell={item.targetCell} data-item-index={itemIndex}>
      <p className={gameStyles.hint}>مکان این خانهٔ روشن را به خاطر بسپار</p>
      <div className={styles.patternGrid} aria-label="شبکه مکان">
        {CELLS.map((i) => (
          <span
            key={i}
            className={`${styles.patternCell} ${i === item.targetCell ? styles.patternTarget : ''}`}
          />
        ))}
      </div>
    </div>
  )
}

function RecallArea({
  trial,
  selected,
  onTap,
  onClear,
  onSubmit,
}: {
  trial: SymmetrySpanTrial
  selected: readonly number[]
  onTap: (cell: number) => void
  onClear: () => void
  onSubmit: () => void
}) {
  const setLength = trial.set.items.length
  const complete = selected.length === setLength
  return (
    <div
      className={styles.phaseArea}
      data-testid="symspan-recall"
      data-expected-order={trial.set.expectedRecall.join(',')}
      data-reverse={trial.set.reverseRecall ? 'true' : 'false'}
    >
      <p className={gameStyles.hint}>
        {trial.set.reverseRecall
          ? `خانه‌ها را از آخر به اول به همان ترتیب بزن (${toFaDigits(setLength)} خانه)`
          : `خانه‌ها را به همان ترتیبی که روشن شدند بزن (${toFaDigits(setLength)} خانه)`}
      </p>

      {selected.length > 0 ? (
        <div className={styles.selectedRow} aria-label="ترتیب انتخاب‌شده">
          {selected.map((cell, i) => (
            <span key={`${cell}-${i}`} className={styles.chip}>
              <span className={styles.chipNumber}>{toFaDigits(i + 1)}</span> {toFaDigits(cell + 1)}
            </span>
          ))}
        </div>
      ) : null}

      <div className={styles.patternGrid} data-selected-count={selected.length} aria-label="شبکه بازیابی">
        {CELLS.map((i) => {
          const order = selected.indexOf(i)
          return (
            <button
              key={i}
              type="button"
              className={`${styles.recallCell} ${order !== -1 ? styles.recallSelected : ''}`}
              data-cell-index={i}
              onClick={() => onTap(i)}
              aria-label={`خانه ${toFaDigits(i + 1)}`}
            >
              {order !== -1 ? <span className={styles.recallOrder}>{toFaDigits(order + 1)}</span> : null}
            </button>
          )
        })}
      </div>

      <div className={styles.actionRow}>
        <button type="button" className={styles.secondaryButton} onClick={onClear} disabled={selected.length === 0}>
          پاک‌کردن
        </button>
        <button
          type="button"
          className={gameStyles.keyWide}
          onClick={onSubmit}
          disabled={!complete}
          data-testid="symspan-submit"
        >
          تأیید
        </button>
      </div>
    </div>
  )
}
