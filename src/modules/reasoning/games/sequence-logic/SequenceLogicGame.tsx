import { Fragment, useEffect, useRef, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import { useTrialGuards } from '../../../../components/game/useTrialGuards'
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
 * سه گارد الزامی در useTrialGuards است.
 */
export function SequenceLogicGame({ ctx }: { ctx: ActiveGameContext }) {
  const trial = ctx.trial as SequenceLogicTrial
  const [badge, setBadge] = useState<'correct' | 'wrong' | null>(null)
  const badgeTimerRef = useRef<number | null>(null)
  const guards = useTrialGuards(ctx, trial.trialIndex)

  // پاک‌سازی تایمر نشان شناور فقط در unmount
  useEffect(
    () => () => {
      if (badgeTimerRef.current !== null) window.clearTimeout(badgeTimerRef.current)
    },
    [],
  )

  const choose = (value: number) => {
    void guards.submitOnce(value, {
      onAccepted: (result) => {
        // نشان شناور نتیجه — پیشروی همان لحظه است (رفتار زمانی دست‌نخورده)
        setBadge(result.record.correct ? 'correct' : 'wrong')
        if (badgeTimerRef.current !== null) window.clearTimeout(badgeTimerRef.current)
        badgeTimerRef.current = window.setTimeout(() => setBadge(null), 900)
      },
    })
  }

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', width: '100%', alignItems: 'center' }}>
      {badge !== null ? (
        <span className={gameStyles.floatingBadge} aria-live="polite">
          <span className={`${gameStyles.floatingBadgeInner} ${badge === 'correct' ? gameStyles.floatingBadgeCorrect : gameStyles.floatingBadgeWrong}`}>
            {badge === 'correct' ? 'درست ✓' : 'غلط ✗'}
          </span>
        </span>
      ) : null}
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
            <span className={styles.chip} style={{ animationDelay: `${index * 70}ms` }}>
              {toFaDigits(value)}
            </span>
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
            onClick={() => choose(option)}
          >
            {toFaDigits(option)}
          </button>
        ))}
      </div>
    </div>
  )
}
