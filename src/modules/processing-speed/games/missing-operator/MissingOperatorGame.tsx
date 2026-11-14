import { useEffect, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import { useTrialGuards } from '../../../../components/game/useTrialGuards'
import gameStyles from '../../../../components/game/game.module.css'
import { toFaDigits } from '../../../../utils/format'
import {
  MISSING_OPERATOR_LABELS_FA,
  type MissingOperator,
  type MissingOperatorTrial,
} from './engine'
import styles from './missing-operator.module.css'
import { e2e } from '../../../../utils/e2e'

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
 * و بعدی می‌آید. منطق در engine است. سه گارد الزامی + re-arm مهلت در
 * useTrialGuards است.
 */
export function MissingOperatorGame({ ctx }: { ctx: ActiveGameContext }) {
  const trial = ctx.trial as MissingOperatorTrial
  const [flash, setFlash] = useState<FlashState | null>(null)
  const guards = useTrialGuards(ctx, trial.trialIndex)

  // با هر مرحله جدید ریست می‌شود
  useEffect(() => {
    setFlash(null)

    // انقضای مهلت پاسخ → ثبت بی‌پاسخی و رفتن به مرحله بعد (با re-arm پس
    // از rollback ذخیره در useTrialGuards)
    const remaining = ctx.timeRemainingMs()
    if (remaining !== null) {
      guards.armDeadline(() => null, remaining)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trial.trialIndex])

  const choose = (op: MissingOperator) => {
    if (ctx.paused) return
    void guards.submitOnce(op, {
      onAccepted: (result) => {
        if (result.sessionCompleted) return
        const solution = trial.puzzle.solution
        setFlash({ correct: result.record.correct, solution })
        guards.setTrackedTimeout(() => {
          setFlash(null)
          try {
            ctx.advance()
          } catch {
            // جلسه هم‌زمان قطع/تکمیل شده
          }
        }, 700)
      },
      // پیشروی با تایمر فلش — نه بلافاصله پس از پذیرش
      autoAdvance: false,
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
            <span key="solved" className={styles.solvedOp} data-correct={e2e(flash.correct ? 'true' : 'false')}>
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
