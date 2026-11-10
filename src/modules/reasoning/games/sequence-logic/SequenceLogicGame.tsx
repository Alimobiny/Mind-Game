import { Fragment, useEffect, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import gameStyles from '../../../../components/game/game.module.css'
import { toFaDigits } from '../../../../utils/format'
import type { SequenceLogicTrial } from './engine'
import styles from './sequence-logic.module.css'

/**
 * Sequence Logic — UI
 *
 * نمایش توالی با ارقام فارسی (اعداد چپ‌به‌راست)، انتخاب جمله بعدی از
 * شبکه ۲×۲ گزینه؛ پس از هر پاسخ بلافاصله مرحله بعد (مثل Calculation).
 * منطق کاملاً در engine است؛ این کامپوننت فقط رندر و ورودی.
 */
export function SequenceLogicGame({ ctx }: { ctx: ActiveGameContext }) {
  const trial = ctx.trial as SequenceLogicTrial
  // قفل موقت تا اتمام ثبت پاسخ — جلوگیری از دوبار‌کلیک روی گزینه‌ها
  const [locked, setLocked] = useState(false)

  // با شروع هر مرحله جدید قفل برداشته می‌شود
  useEffect(() => {
    setLocked(false)
  }, [trial.trialIndex])

  const choose = async (value: number) => {
    if (locked) return
    setLocked(true)
    const result = await ctx.submit(value)
    if (result.accepted && !result.sessionCompleted) {
      ctx.advance()
    } else {
      setLocked(false)
    }
  }

  return (
    <>
      <div
        className={styles.sequenceRow}
        data-testid="seq-shown"
        aria-label="توالی اعداد"
        key={trial.trialIndex}
      >
        {trial.shown.map((value, index) => (
          <Fragment key={`${trial.trialIndex}-${index}`}>
            {index > 0 ? (
              <span className={styles.separator} aria-hidden="true">
                ،
              </span>
            ) : null}
            <span className={styles.chip}>{toFaDigits(value)}</span>
          </Fragment>
        ))}
        <span className={styles.separator} aria-hidden="true">
          ،
        </span>
        <span className={`${styles.chip} ${styles.chipUnknown}`}>؟</span>
      </div>
      <p className={gameStyles.hint}>عدد بعدی کدام است؟</p>
      <div className={styles.optionsGrid} role="group" aria-label="گزینه‌ها">
        {trial.options.map((option) => (
          <button
            type="button"
            key={`${trial.trialIndex}-${option}`}
            className={styles.optionButton}
            data-testid="seq-option"
            data-value={option}
            onClick={() => void choose(option)}
            disabled={locked}
          >
            {toFaDigits(option)}
          </button>
        ))}
      </div>
    </>
  )
}
