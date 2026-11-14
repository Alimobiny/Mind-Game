import { useEffect, useRef, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import { useTrialGuards } from '../../../../components/game/useTrialGuards'
import gameStyles from '../../../../components/game/game.module.css'
import { toFaDigits } from '../../../../utils/format'
import type { SymmetrySpanTrial } from './engine'
import { SYMSPAN_GRID_SIZE } from './engine'
import styles from './symmetry-span.module.css'
import { e2e } from '../../../../utils/e2e'

/**
 * دهانهٔ تقارن — UI
 *
 * ماشین فاز درون‌دسته: الگوی تقارن (قضاوت متقارن/نامتقارن) → فلش بازخورد →
 * خانهٔ هدف در شبکهٔ ۴×۴ → زوج بعدی … → بازیابی ترتیبی با لمس خانه‌ها.
 * دکمه‌های قضاوت فقط claim در ref ثبت می‌کنند؛ تنها submitِ فاز بازیابی (یا
 * انقضای مهلت کل دسته) کل پاسخ را می‌فرستد — قرارداد یک-submit-per-trial.
 * هر سه گارد الزامی در useTrialGuards است.
 *
 * مکث (PAUSED=unmount): پیشرفت دسته (فاز + قضاوت‌ها + انتخاب‌ها) در
 * trialPresentation نجات داده می‌شود و بازنصب از همان نقطه ادامه می‌یابد —
 * پیش‌تر کل دسته از صفر شروع و قضاوت‌های کاربر پاک می‌شد (GAMES-AUDIT §۲-۱).
 */

type Phase =
  | { readonly kind: 'pattern'; readonly itemIndex: number }
  | { readonly kind: 'feedback'; readonly itemIndex: number; readonly judgment: boolean | null; readonly wasCorrect: boolean }
  | { readonly kind: 'cell'; readonly itemIndex: number }
  | { readonly kind: 'recall' }

/** پیشرفت نجات‌یافتهٔ دسته برای بازنصبِ پس از مکث */
interface SetProgress {
  readonly phase: Phase
  readonly judgments: readonly (boolean | null)[]
  readonly rts: readonly (number | null)[]
  readonly selected: readonly number[]
}

const CELLS = Array.from({ length: SYMSPAN_GRID_SIZE * SYMSPAN_GRID_SIZE }, (_, i) => i)

export function SymmetrySpanGame({ ctx }: { ctx: ActiveGameContext }) {
  const trial = ctx.trial as SymmetrySpanTrial
  const [phase, setPhase] = useState<Phase>({ kind: 'pattern', itemIndex: 0 })
  const [selected, setSelected] = useState<readonly number[]>([])
  /** selected در state است ولی مسیر مهلت باید آخرین مقدار را ببیند */
  const selectedRef = useRef<readonly number[]>([])
  selectedRef.current = selected
  const timersRef = useRef<number[]>([])
  const guards = useTrialGuards(ctx, trial.trialIndex)
  const judgmentsRef = useRef<(boolean | null)[]>([])
  const rtsRef = useRef<(number | null)[]>([])
  const phaseStartRef = useRef(0)

  // شروع فاز پاسخ را در مدیر علامت بزن — RT از بازشدن بازیابی خانه‌ها
  // سنجیده شود نه از شروع زوج‌های تقارن (§۲-۲ ممیزی؛ قضاوت‌ها RT خود را
  // جدا دارند). idempotent؛ مسیر بازنصب مکث هم پوشش دارد.
  useEffect(() => {
    if (phase.kind === 'recall') ctx.beginResponsePhase()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase.kind])

  const clearPhaseTimers = () => {
    for (const t of timersRef.current) window.clearTimeout(t)
    timersRef.current = []
  }

  /** نجات پیشرفت دسته — در هر گذار فاز/قضاوت/انتخاب */
  const saveProgress = (currentPhase: Phase) => {
    ctx.trialPresentation.set('progress', {
      phase: currentPhase,
      judgments: [...judgmentsRef.current],
      rts: [...rtsRef.current],
      selected: [...selectedRef.current],
    } satisfies SetProgress)
  }

  useEffect(() => {
    // بازنصبِ پس از مکث: ادامه از پیشرفتِ نجات‌یافته؛ فازِ قطع‌شده از ابتدای
    // همان فاز ادامه می‌یابد (تمدیدِ کرانی یک فاز — رویداد خام contaminated است)
    const interrupted = ctx.trialPresentation.wasInterrupted()
    const saved = interrupted ? ctx.trialPresentation.get<SetProgress>('progress') : undefined
    if (saved && saved.phase) {
      setPhase(saved.phase)
      setSelected(saved.selected)
      judgmentsRef.current = [...saved.judgments]
      rtsRef.current = [...saved.rts]
    } else {
      setPhase({ kind: 'pattern', itemIndex: 0 })
      setSelected([])
      judgmentsRef.current = trial.set.items.map(() => null)
      rtsRef.current = trial.set.items.map(() => null)
    }
    phaseStartRef.current = performance.now()
    clearPhaseTimers()

    // انقضای مهلت کل دسته → یک submit با هرچه تا حالا جمع شده؛ پس از
    // rollback ذخیره با پنجرهٔ کوتاه دوباره مسلح می‌شود (useTrialGuards)
    const remaining = ctx.timeRemainingMs()
    if (remaining !== null) {
      guards.armDeadline(() => {
        const anyResponse =
          judgmentsRef.current.some((j) => j !== null) || selectedRef.current.length > 0
        return anyResponse
          ? {
              processingJudgments: judgmentsRef.current,
              processingRtMs: rtsRef.current,
              recalled: selectedRef.current,
            }
          : null
      }, remaining)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trial.trialIndex])

  useEffect(() => {
    phaseStartRef.current = performance.now()
    clearPhaseTimers()
    saveProgress(phase)
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
    if (guards.isSubmitted() || ctx.paused) return
    if (phase.kind !== 'pattern') return
    const item = trial.set.items[phase.itemIndex]
    if (!item) return
    judgmentsRef.current[phase.itemIndex] = value
    rtsRef.current[phase.itemIndex] = Math.round(performance.now() - phaseStartRef.current)
    const next: Phase = {
      kind: 'feedback',
      itemIndex: phase.itemIndex,
      judgment: value,
      wasCorrect: value === item.pattern.isSymmetric,
    }
    saveProgress(next)
    setPhase(next)
  }

  const tapCell = (cell: number) => {
    if (guards.isSubmitted() || ctx.paused) return
    if (phase.kind !== 'recall') return
    const next = selected.includes(cell) ? selected.filter((c) => c !== cell) : [...selected, cell]
    selectedRef.current = next
    setSelected(next)
    saveProgress(phase)
  }

  const clearSelection = () => {
    if (guards.isSubmitted() || ctx.paused) return
    selectedRef.current = []
    setSelected([])
    saveProgress(phase)
  }

  const submitSet = () => {
    if (guards.isSubmitted() || ctx.paused) return
    if (selected.length !== trial.set.items.length) return
    void guards.submitOnce({
      processingJudgments: judgmentsRef.current,
      processingRtMs: rtsRef.current,
      recalled: selected,
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
      data-expected-order={e2e(trial.set.expectedRecall.join(','))}
      data-reverse={e2e(trial.set.reverseRecall ? 'true' : 'false')}
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
