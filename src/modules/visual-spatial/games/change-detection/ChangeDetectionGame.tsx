import { useEffect, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import { useTrialGuards } from '../../../../components/game/useTrialGuards'
import gameStyles from '../../../../components/game/game.module.css'
import type { CdColor, ChangeDetectionTrial } from './engine'
import styles from './change-detection.module.css'

/**
 * Change Detection — UI
 *
 * فازهای هر مرحله: نمایش آرایهٔ نمونه (displayMs) → صفحهٔ خالی (blankMs) →
 * آرایهٔ آزمون + دوداوری بی‌مهلت → فلش بازخورد (~۷۰۰ms) → مرحلهٔ بعد.
 * در بازخورد، خانهٔ تغییرکرده (اگر بوده) با حلقهٔ سبز آشکار می‌شود.
 *
 * بازنصبِ پس از مکث (PAUSED=unmount): پرش مستقیم به فاز آزمون — نمونه
 * دیگر نمایش داده نمی‌شود (بازپخش نمونه، k را با دیدن دوبارهٔ آرایه
 * صعودی-بایاس می‌کرد؛ GAMES-AUDIT §۲-۱/§۴-۱) و رویداد خام از سمت مدیر
 * contaminated علامت می‌خورد.
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
  const guards = useTrialGuards(ctx, trial.trialIndex)

  // شروع فاز پاسخ را در مدیر علامت بزن — RT از نمایش آرایهٔ آزمون سنجیده
  // شود نه از شروع آرایهٔ نمونه (§۲-۲ ممیزی). idempotent؛ مسیر پرش به
  // آزمون پس از مکث را هم می‌پوشاند.
  useEffect(() => {
    if (phase === 'test') ctx.beginResponsePhase()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ریست با شروع هر مرحله + زمان‌بندی نمونه→خالی→آزمون. مکث = پرش به آزمون
  useEffect(() => {
    // رفع ریس pause بین پذیرش پاسخ و advance: پاسخِ ثبت‌شدهٔ بدون پیشروی
    // را در بازنصب بلافاصله جلو ببر تا جلسه قفل نماند
    const outcome = ctx.lastOutcome
    if (outcome !== null && outcome.trialIndex === trial.trialIndex) {
      try {
        ctx.advance()
      } catch {
        // جلسه هم‌زمان قطع/تکمیل شده
      }
      return
    }

    setWasCorrect(null)
    if (ctx.trialPresentation.wasInterrupted()) {
      // بازنصبِ پس از مکث: مستقیم آرایهٔ آزمون — بدون بازپخش نمونه
      setPhase('test')
      return
    }
    setPhase('sample')
    guards.setTrackedTimeout(() => setPhase('blank'), trial.displayMs)
    guards.setTrackedTimeout(() => setPhase('test'), trial.displayMs + trial.blankMs)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trial.trialIndex])

  const answer = (verdict: 'changed' | 'unchanged') => {
    if (guards.isSubmitted() || phase !== 'test' || ctx.paused) return
    void guards.submitOnce(verdict, {
      onAccepted: (result) => {
        setWasCorrect(result.record.correct)
        setPhase('feedback')
        // تایمر پیشروی — ردیابی‌شده؛ در تغییر مرحله/unmount پاک می‌شود
        guards.setTrackedTimeout(() => {
          try {
            ctx.advance()
          } catch {
            // جلسه هم‌زمان قطع/تکمیل شده
          }
        }, FEEDBACK_MS)
      },
      autoAdvance: false,
    })
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
