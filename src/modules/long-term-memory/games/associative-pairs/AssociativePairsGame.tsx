import { useEffect, useRef, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import gameStyles from '../../../../components/game/game.module.css'
import { SwapGlyph } from '../../../../components/icons/UiGlyphs'
import type { AssociativePairsTrial } from './engine'
import styles from './associative-pairs.module.css'

/**
 * حافظهٔ انجمنی — UI
 *
 * فاز مطالعه: جفت واژه نمایش داده می‌شود و با انقضای پنجره، خودکار به
 * بعدی می‌رود (تماشا). فاز آزمون: نشانه + دکمه‌های گزینه؛ انتخاب، ثبت و
 * مرحلهٔ بعد. سه گارد الزامی رعایت شده است. بازخورد انتخاب با نشان
 * شناور — بدون تغییر زمانی پیشروی فوری.
 */
export function AssociativePairsGame({ ctx }: { ctx: ActiveGameContext }) {
  const trial = ctx.trial as AssociativePairsTrial
  const [badge, setBadge] = useState<'correct' | 'wrong' | null>(null)
  const badgeTimerRef = useRef<number | null>(null)
  const timersRef = useRef<number[]>([])
  const submittedRef = useRef(false)

  useEffect(() => {
    submittedRef.current = false
    for (const t of timersRef.current) window.clearTimeout(t)
    timersRef.current = []

    // فاز مطالعه: پایان پنجره = ثبت تماشا و رفتن به مرحلهٔ بعد
    if (trial.item.phase === 'study') {
      const remaining = ctx.timeRemainingMs()
      if (remaining !== null) {
        timersRef.current.push(
          window.setTimeout(() => {
            if (submittedRef.current) return
            submittedRef.current = true
            void ctx.submit(null).then((result) => {
              if (result.accepted && !result.sessionCompleted) ctx.advance()
            })
          }, remaining),
        )
      }
    }
    return () => {
      for (const t of timersRef.current) window.clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trial.trialIndex])

  // نشان شناور نتیجهٔ انتخاب در فاز آزمون — پیشروی فوری بدون تغییر زمانی
  const flashBadge = (correct: boolean) => {
    setBadge(correct ? 'correct' : 'wrong')
    if (badgeTimerRef.current !== null) window.clearTimeout(badgeTimerRef.current)
    badgeTimerRef.current = window.setTimeout(() => setBadge(null), 900)
  }

  const choose = (index: number) => {
    if (submittedRef.current || ctx.paused) return
    submittedRef.current = true
    void ctx.submit(index).then((result) => {
      if (result.accepted) flashBadge(result.record.correct)
      if (result.accepted && !result.sessionCompleted) ctx.advance()
    })
  }

  useEffect(
    () => () => {
      if (badgeTimerRef.current !== null) window.clearTimeout(badgeTimerRef.current)
    },
    [],
  )

  if (trial.item.phase === 'study') {
    return (
      <div className={styles.stage}>
        <p className={styles.phaseLabel}>مطالعه — این دو واژه را با هم به خاطر بسپار</p>
        <div
          className={styles.pairCard}
          data-testid="ap-study"
          data-pair-id={trial.item.pairId}
          data-cue={trial.item.cue}
          data-target={trial.item.target}
        >
          <span className={styles.pairWord}>{trial.item.cue}</span>
          <SwapGlyph size={22} className={styles.pairLink} />
          <span className={styles.pairWord}>{trial.item.target}</span>
        </div>
      </div>
    )
  }

  const isRetest = trial.item.block === 2
  return (
    <div className={styles.stage}>
      {badge !== null ? (
        <span className={gameStyles.floatingBadge} aria-live="polite">
          <span
            className={`${gameStyles.floatingBadgeInner} ${
              badge === 'correct' ? gameStyles.floatingBadgeCorrect : gameStyles.floatingBadgeWrong
            }`}
          >
            {badge === 'correct' ? 'درست ✓' : 'غلط ✗'}
          </span>
        </span>
      ) : null}
      <p className={styles.phaseLabel}>
        {isRetest ? 'یادآوری دوباره — ' : ''}کدام واژه با این نشانه جفت بود؟
      </p>
      <div className={gameStyles.bigNumber} data-testid="ap-cue">
        {trial.item.cue}
      </div>
      <div className={styles.choiceRow} role="group" aria-label="گزینه‌ها">
        {trial.item.choices.map((word, index) => (
          <button
            key={word}
            type="button"
            className={styles.choiceButton}
            data-testid="ap-option"
            data-index={index}
            data-correct={index === trial.item.correctIndex ? 'true' : 'false'}
            onClick={() => choose(index)}
          >
            {word}
          </button>
        ))}
      </div>
    </div>
  )
}
