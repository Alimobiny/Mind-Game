import { useEffect, useRef, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import gameStyles from '../../../../components/game/game.module.css'
import { toFaDigits } from '../../../../utils/format'
import type { OperationSpanTrial } from './engine'
import styles from './operation-span.module.css'

/**
 * دهانهٔ عملیاتی — UI
 *
 * ماشین فاز درون‌دسته: محاسبه (قضاوت درست/غلط) → فلش بازخورد → نمایش واژه →
 * زوج بعدی … → بازیابی ترتیبی از جدول. دکمه‌های قضاوت فقط claim در ref ثبت
 * می‌کنند؛ تنها submitِ فاز بازیابی (یا انقضای مهلت کل دسته) کل پاسخ را با
 * همهٔ قضاوت‌ها و زمان‌ها می‌فرستد — قرارداد یک-submit-per-trial موتور.
 * هر سه گارد الزامی: قفل submittedRef · advance فقط تا قبل از sessionCompleted
 * · همهٔ تایمرها در ref با پاک‌سازی.
 */

type Phase =
  | { readonly kind: 'math'; readonly itemIndex: number }
  | { readonly kind: 'feedback'; readonly itemIndex: number; readonly judgment: boolean | null; readonly wasCorrect: boolean }
  | { readonly kind: 'word'; readonly itemIndex: number }
  | { readonly kind: 'recall' }

export function OperationSpanGame({ ctx }: { ctx: ActiveGameContext }) {
  const trial = ctx.trial as OperationSpanTrial
  const [phase, setPhase] = useState<Phase>({ kind: 'math', itemIndex: 0 })
  const [selected, setSelected] = useState<readonly string[]>([])
  /** selected در state است ولی مسیر مهلت باید آخرین مقدار را ببیند */
  const selectedRef = useRef<readonly string[]>([])
  selectedRef.current = selected
  /** تایمرهای فاز — در هر گذار فاز پاک می‌شوند */
  const timersRef = useRef<number[]>([])
  /** تایمر مهلت کل دسته — تا پایان مرحله زنده می‌ماند */
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
    setPhase({ kind: 'math', itemIndex: 0 })
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
            if (result.accepted && !result.sessionCompleted) {
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
    if (phase.kind === 'math') {
      // بی‌پاسخی زوج محاسبه → فلش «بی‌پاسخ» و ادامهٔ ریتم دسته
      const itemIndex = phase.itemIndex
      timersRef.current.push(
        window.setTimeout(() => {
          const item = trial.set.items[itemIndex]
          if (!item) return
          judgmentsRef.current[itemIndex] = null
          rtsRef.current[itemIndex] = null
          setPhase({
            kind: 'feedback',
            itemIndex,
            judgment: null,
            wasCorrect: false,
          })
        }, trial.processingWindowMs),
      )
    } else if (phase.kind === 'feedback') {
      const itemIndex = phase.itemIndex
      timersRef.current.push(
        window.setTimeout(() => setPhase({ kind: 'word', itemIndex }), trial.feedbackMs),
      )
    } else if (phase.kind === 'word') {
      const itemIndex = phase.itemIndex
      timersRef.current.push(
        window.setTimeout(() => {
          if (itemIndex + 1 < trial.set.items.length) {
            setPhase({ kind: 'math', itemIndex: itemIndex + 1 })
          } else {
            setPhase({ kind: 'recall' })
          }
        }, trial.memoryDisplayMs),
      )
    }
    // فاز recall تایمر فاز ندارد — مهلت کل دسته زنده است
    return clearPhaseTimers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, trial.trialIndex])

  /** قضاوت زوج محاسبه — فقط claim؛ ثبت نهایی با submitِ دسته */
  const judge = (value: boolean) => {
    if (submittedRef.current || ctx.paused) return
    if (phase.kind !== 'math') return
    const item = trial.set.items[phase.itemIndex]
    if (!item) return
    judgmentsRef.current[phase.itemIndex] = value
    rtsRef.current[phase.itemIndex] = Math.round(performance.now() - phaseStartRef.current)
    setPhase({
      kind: 'feedback',
      itemIndex: phase.itemIndex,
      judgment: value,
      wasCorrect: value === item.problem.isTrue,
    })
  }

  const toggleChoice = (word: string) => {
    if (submittedRef.current || ctx.paused) return
    if (phase.kind !== 'recall') return
    setSelected((current) =>
      current.includes(word) ? current.filter((w) => w !== word) : [...current, word],
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
      {phase.kind === 'math' || phase.kind === 'feedback' ? (
        <MathArea
          trial={trial}
          phase={phase}
          onJudge={judge}
        />
      ) : null}
      {phase.kind === 'word' ? <WordArea trial={trial} itemIndex={phase.itemIndex} /> : null}
      {phase.kind === 'recall' ? (
        <RecallArea
          trial={trial}
          selected={selected}
          onToggle={toggleChoice}
          onClear={clearSelection}
          onSubmit={submitSet}
        />
      ) : null}
    </div>
  )
}

function MathArea({
  trial,
  phase,
  onJudge,
}: {
  trial: OperationSpanTrial
  phase: { kind: 'math'; itemIndex: number } | { kind: 'feedback'; itemIndex: number; judgment: boolean | null; wasCorrect: boolean }
  onJudge: (value: boolean) => void
}) {
  const item = trial.set.items[phase.itemIndex]
  if (!item) return null
  const { problem } = item

  if (phase.kind === 'feedback') {
    return (
      <div className={styles.processingArea} data-testid="ospan-math-feedback">
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
      className={styles.processingArea}
      data-testid="ospan-math"
      data-math-true={problem.isTrue ? 'true' : 'false'}
      data-item-index={phase.itemIndex}
    >
      <p className={gameStyles.hint}>آیا این معادله درست است؟</p>
      <div className={styles.equation} dir="rtl">
        {toFaDigits(problem.a)} {problem.op} {toFaDigits(problem.b)} = {toFaDigits(problem.shownResult)} ؟
      </div>
      <div className={styles.judgeRow} role="group" aria-label="قضاوت معادله">
        <button type="button" className={styles.judgeButton} onClick={() => onJudge(true)} data-testid="ospan-judge-true">
          درست
        </button>
        <button type="button" className={styles.judgeButton} onClick={() => onJudge(false)} data-testid="ospan-judge-false">
          غلط
        </button>
      </div>
    </div>
  )
}

function WordArea({ trial, itemIndex }: { trial: OperationSpanTrial; itemIndex: number }) {
  const item = trial.set.items[itemIndex]
  if (!item) return null
  return (
    <div className={styles.memoryArea} data-testid="ospan-word" data-word={item.word} data-item-index={itemIndex}>
      <p className={gameStyles.hint}>این واژه را به خاطر بسپار</p>
      <div className={gameStyles.bigNumber}>{item.word}</div>
    </div>
  )
}

function RecallArea({
  trial,
  selected,
  onToggle,
  onClear,
  onSubmit,
}: {
  trial: OperationSpanTrial
  selected: readonly string[]
  onToggle: (word: string) => void
  onClear: () => void
  onSubmit: () => void
}) {
  const setLength = trial.set.items.length
  const complete = selected.length === setLength
  return (
    <div
      className={styles.recallArea}
      data-testid="ospan-recall"
      data-expected-order={trial.set.expectedRecall.join(',')}
      data-reverse={trial.set.reverseRecall ? 'true' : 'false'}
    >
      <p className={gameStyles.hint}>
        {trial.set.reverseRecall
          ? `واژه‌ها را از آخر به اول انتخاب کن (${toFaDigits(setLength)} واژه)`
          : `واژه‌ها را به همان ترتیب که دیدی انتخاب کن (${toFaDigits(setLength)} واژه)`}
      </p>

      {selected.length > 0 ? (
        <div className={styles.selectedRow} aria-label="ترتیب انتخاب‌شده">
          {selected.map((word, i) => (
            <span key={`${word}-${i}`} className={styles.chip}>
              <span className={styles.chipNumber}>{toFaDigits(i + 1)}</span> {word}
            </span>
          ))}
        </div>
      ) : null}

      <div className={styles.choiceGrid} role="group" aria-label="جدول واژه‌ها">
        {trial.set.recallChoices.map((word) => {
          const isSelected = selected.includes(word)
          return (
            <button
              key={word}
              type="button"
              className={`${styles.choiceButton} ${isSelected ? styles.choiceSelected : ''}`}
              data-testid="ospan-choice"
              data-word={word}
              onClick={() => onToggle(word)}
            >
              {word}
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
          data-testid="ospan-submit"
        >
          تأیید
        </button>
      </div>
    </div>
  )
}
