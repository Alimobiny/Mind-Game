import { useEffect, useRef, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import gameStyles from '../../../../components/game/game.module.css'
import { toFaDigits } from '../../../../utils/format'
import {
  MISSING_OPERATOR_LABELS_FA,
  type MissingOperator,
  type MissingOperatorTrial,
} from './engine'
import styles from './missing-operator.module.css'

/** نمایش نتیجه برای فلش کوتاه پیش از مرحلهٔ بعد */
interface FlashState {
  readonly correct: boolean
  readonly solution: MissingOperator
}

/**
 * عملگر گم‌شده — UI
 *
 * نمایش معادله «a ؟ b = result» با ارقام فارسی (LTR تا ترتیب عملوندها
 * ثابت بماند) و انتخاب عملگر از دکمه‌های گزینه. جای «؟» تپنده است؛ پس از
 * پاسخ، عملگر درست با فرود پرشی در جای خود می‌نشیند و فلش کوتاه نتیجه
 * دیده می‌شود و سپس مرحلهٔ بعد می‌آید (e2e با waitProgressAdvance همگام
 * است). در سطح‌های دارای مهلت، با انقضای پنجره پاسخ مرحله «بی‌پاسخ» ثبت
 * و بعدی می‌آید. منطق در engine است.
 */
export function MissingOperatorGame({ ctx }: { ctx: ActiveGameContext }) {
  const trial = ctx.trial as MissingOperatorTrial
  // قفل پاسخِ ثبت‌شده — تپ دومی (روی هر دکمه‌ای) نباید پاسخ دومی به مرحله
  // بعد بفرستد؛ قفل فقط وقتی نتیجه رد شد (مثلاً حین pause) باز می‌گردد
  const submittedRef = useRef(false)
  const deadlineRef = useRef<number | null>(null)
  const flashTimerRef = useRef<number | null>(null)
  const [flash, setFlash] = useState<FlashState | null>(null)

  // با هر مرحله جدید ریست می‌شود
  useEffect(() => {
    submittedRef.current = false
    setFlash(null)

    // انقضای مهلت پاسخ → ثبت بی‌پاسخی و رفتن به مرحله بعد
    const remaining = ctx.timeRemainingMs()
    if (remaining !== null) {
      deadlineRef.current = window.setTimeout(() => {
        if (submittedRef.current) return
        submittedRef.current = true
        void ctx.submit(null).then((result) => {
          if (result.accepted && !result.sessionCompleted) {
            ctx.advance()
          } else if (!result.accepted) {
            submittedRef.current = false
          }
        })
      }, remaining)
    }
    return () => {
      if (deadlineRef.current !== null) window.clearTimeout(deadlineRef.current)
      if (flashTimerRef.current !== null) window.clearTimeout(flashTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trial.trialIndex])

  const choose = (op: MissingOperator) => {
    if (submittedRef.current || ctx.paused) return
    submittedRef.current = true
    void ctx.submit(op).then((result) => {
      if (!result.accepted || result.sessionCompleted) {
        if (!result.accepted) submittedRef.current = false
        return
      }
      const solution = trial.puzzle.solution
      setFlash({ correct: result.record.correct, solution })
      flashTimerRef.current = window.setTimeout(() => {
        setFlash(null)
        try {
          ctx.advance()
        } catch {
          // جلسه هم‌زمان قطع/تکمیل شده
        }
      }, 700)
    })
  }

  const puzzle = trial.puzzle

  return (
    <div
      className={`${styles.stage} ${flash !== null ? (flash.correct ? styles.stageCorrect : styles.stageWrong) : ''}`}
    >
      <div
        className={styles.equation}
        style={{ direction: 'ltr' }}
        aria-label="معادله با عملگر گم‌شده"
        data-testid="missop-equation"
        key={trial.trialIndex}
      >
        {toFaDigits(puzzle.a)}{' '}
        <bdi className={styles.missing}>
          {flash !== null ? (
            <span key="solved" className={styles.solvedOp} data-correct={flash.correct ? 'true' : 'false'}>
              {flash.solution === '-' ? '−' : flash.solution}
            </span>
          ) : (
            '؟'
          )}
        </bdi>{' '}
        {toFaDigits(puzzle.b)} = {toFaDigits(puzzle.result)}
      </div>

      {flash !== null ? (
        <div className={styles.flashPill} role="status">
          {flash.correct ? 'درست ✓' : `عملگر درست: ${flash.solution === '-' ? '−' : flash.solution}`}
        </div>
      ) : null}

      <div className={styles.answerRow} role="group" aria-label="انتخاب عملگر درست">
        {puzzle.choices.map((op) => (
          <button
            key={op}
            type="button"
            className={styles.opButton}
            data-testid="missop-choice"
            data-op={op}
            onClick={() => choose(op)}
            disabled={ctx.paused || flash !== null}
            aria-label={MISSING_OPERATOR_LABELS_FA[op]}
          >
            {op === '-' ? '−' : op}
          </button>
        ))}
      </div>

      <p className={gameStyles.hint}>عملگری را انتخاب کن که معادله را درست می‌کند</p>
    </div>
  )
}
