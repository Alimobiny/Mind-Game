import { useEffect, useRef, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import gameStyles from '../../../../components/game/game.module.css'
import type { CdColor, ChangeDetectionTrial } from './engine'
import styles from './change-detection.module.css'

/**
 * Change Detection — UI
 *
 * فازهای هر مرحله: نمایش آرایهٔ نمونه (displayMs) → صفحهٔ خالی (blankMs) →
 * آرایهٔ آزمون + دوداوری بی‌مهلت → فلش بازخورد (~۷۰۰ms) → مرحلهٔ بعد.
 * در بازخورد، خانهٔ تغییرکرده (اگر بوده) با حلقهٔ سبز آشکار می‌شود.
 * تایمرها از روز اول با الگوهای سخت‌گیرانه: ردیابی + گارد کهنگی +
 * فیکس ریس pause (الگوی محاسبه ×۲۰).
 */

/** نگاشت کلید پالت به CSS — موتور فقط کلید می‌شناسد */
const COLOR_CSS: Record<CdColor, string> = {
  sky: '#38bdf8',
  rose: '#fb7185',
  amber: '#fbbf24',
  emerald: '#34d399',
  violet: '#a78bfa',
  cyan: '#22d3ee',
  orange: '#fb923c',
  pink: '#f472b6',
  lime: '#a3e635',
  scarlet: '#f87171',
}

/** مدت فلش بازخورد پیش از پیشروی (ms) */
const FEEDBACK_MS = 700

export function ChangeDetectionGame({ ctx }: { ctx: ActiveGameContext }) {
  const trial = ctx.trial as ChangeDetectionTrial
  const [phase, setPhase] = useState<'sample' | 'blank' | 'test' | 'feedback'>('sample')
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null)
  const timeoutsRef = useRef<number[]>([])
  const submittedRef = useRef(false)
  // آینهٔ رندرِ مرحلهٔ جاری — گارد کهنگی تایمر پیشرویِ پس از بازخورد
  const currentTrialRef = useRef(trial.trialIndex)
  currentTrialRef.current = trial.trialIndex

  const clearTimers = () => {
    for (const t of timeoutsRef.current) window.clearTimeout(t)
    timeoutsRef.current = []
  }

  // ریست با شروع هر مرحله + زمان‌بندی نمونه→خالی→آزمون (مونت‌محور؛ با
  // مکث/ریمانت، مرحله از ابتدا دوباره پخش می‌شود)
  useEffect(() => {
    submittedRef.current = false
    setPhase('sample')
    setWasCorrect(null)
    clearTimers()
    // رفع ریس pause بین پذیرش پاسخ و advance: پاسخِ ثبت‌شدهٔ بدون پیشروی
    // را در بازنصب بلافاصله جلو ببر تا جلسه قفل نماند
    const outcome = ctx.lastOutcome
    if (outcome !== null && outcome.trialIndex === trial.trialIndex) {
      submittedRef.current = true
      try {
        ctx.advance()
      } catch {
        // جلسه هم‌زمان قطع/تکمیل شده
      }
      return
    }
    timeoutsRef.current.push(window.setTimeout(() => setPhase('blank'), trial.displayMs))
    timeoutsRef.current.push(
      window.setTimeout(() => setPhase('test'), trial.displayMs + trial.blankMs),
    )
    return clearTimers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trial.trialIndex])

  useEffect(
    () => () => {
      for (const t of timeoutsRef.current) window.clearTimeout(t)
    },
    [],
  )

  const answer = async (verdict: 'changed' | 'unchanged') => {
    if (submittedRef.current || phase !== 'test' || ctx.paused) return
    submittedRef.current = true
    const result = await ctx.submit(verdict)
    if (!result.accepted) {
      submittedRef.current = false
      return
    }
    setWasCorrect(result.record.correct)
    setPhase('feedback')
    if (result.sessionCompleted) return
    // تایمر پیشروی با گارد کهنگی + مهار خطای جلسهٔ هم‌زمان قطع/تکمیل
    timeoutsRef.current.push(
      window.setTimeout(() => {
        if (currentTrialRef.current !== trial.trialIndex) return
        try {
          ctx.advance()
        } catch {
          // جلسه هم‌زمان قطع/تکمیل شده
        }
      }, FEEDBACK_MS),
    )
  }

  // آرایهٔ آزمون: رنگ نمونه با تغییرِ احتمالی
  const testColors = [...trial.colors]
  if (trial.changed && trial.changedIndex !== null && trial.testColor !== null) {
    testColors[trial.changedIndex] = trial.testColor
  }
  const revealed =
    trial.changed && trial.changedIndex !== null ? trial.positions[trial.changedIndex] : null

  const renderGrid = (colors: readonly string[] | null, ringCell: number | null) => (
    <div
      className={styles.grid}
      data-testid="cd-grid"
      data-changed={trial.changed ? 'true' : 'false'}
      data-phase={phase}
    >
      {Array.from({ length: 9 }, (_, cell) => {
        const pos = trial.positions.indexOf(cell)
        const color = colors !== null && pos !== -1 ? (colors[pos] as string) : null
        return (
          <span
            key={cell}
            className={`${styles.cell} ${color !== null ? styles.filled : ''} ${
              ringCell === cell ? styles.ring : ''
            }`}
            style={color !== null ? { background: COLOR_CSS[color as CdColor] } : undefined}
            aria-hidden="true"
          />
        )
      })}
    </div>
  )

  return (
    <>
      {phase === 'sample' ? (
        <>
          {renderGrid(trial.colors, null)}
          <p className={gameStyles.hint}>رنگ مربع‌ها را به خاطر بسپار</p>
        </>
      ) : null}
      {phase === 'blank' ? (
        <>
          {renderGrid(null, null)}
          <p className={gameStyles.hint}>…</p>
        </>
      ) : null}
      {phase === 'test' ? (
        <>
          {renderGrid(testColors, null)}
          <p className={gameStyles.hint}>آیا یکی از رنگ‌ها عوض شده؟</p>
          <div className={styles.choices} role="group" aria-label="دوداوری تغییر">
            <button
              type="button"
              className={`${styles.choice} ${styles.choiceYes}`}
              data-testid="cd-yes"
              onClick={() => void answer('changed')}
            >
              تغییر کرد
            </button>
            <button
              type="button"
              className={`${styles.choice} ${styles.choiceNo}`}
              data-testid="cd-no"
              onClick={() => void answer('unchanged')}
            >
              تغییر نکرد
            </button>
          </div>
        </>
      ) : null}
      {phase === 'feedback' ? (
        <>
          {renderGrid(testColors, revealed)}
          <div
            className={`${gameStyles.feedback} ${
              wasCorrect ? gameStyles.feedbackCorrect : gameStyles.feedbackIncorrect
            } ${styles.feedbackBanner}`}
          >
            {wasCorrect ? 'درست!' : trial.changed ? 'تغییر کرده بود!' : 'هیچ تغییری نبود'}
          </div>
        </>
      ) : null}
    </>
  )
}
