import { useEffect, useRef, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import gameStyles from '../../../../components/game/game.module.css'
import type { SimonColor, SimonTrial } from './engine'
import styles from './simon.module.css'

/**
 * Simon Task — UI
 *
 * محرک: دایرهٔ رنگی چپ/راست نقطهٔ ثابت. پاسخ: فقط بر اساس رنگ — دکمهٔ آبی
 * برای دایرهٔ آبی، دکمهٔ قرمز برای دایرهٔ قرمز؛ مکان محرک باید نادیده گرفته
 * شود. پیشروی فوری (مثل برو/نرو) و بازخورد با نشان شناور — رفتار زمانی
 * دست‌نخورده. سطح ۵: دکمه‌ها در میانهٔ بلوک جای خود را عوض می‌کنند و
 * نشان «نگاشت وارونه» این جابه‌جایی را اعلام می‌کند.
 */

const COLOR_LABEL_FA: Record<SimonColor, string> = { blue: 'آبی', red: 'قرمز' }

/** ترتیب فیزیکی دکمه‌ها (چپ→راست) زیر نگاشت جاری */
function buttonOrder(mappingInverted: boolean): SimonColor[] {
  return mappingInverted ? ['red', 'blue'] : ['blue', 'red']
}

export function SimonGame({ ctx }: { ctx: ActiveGameContext }) {
  const trial = ctx.trial as SimonTrial
  const [stimulusVisible, setStimulusVisible] = useState(true)
  const [badge, setBadge] = useState<'correct' | 'wrong' | null>(null)
  const badgeTimerRef = useRef<number | null>(null)
  const timersRef = useRef<number[]>([])
  const submittedRef = useRef(false)

  // با هر محرک جدید ریست می‌شود (مونت/ریمانت پس از مکث هم همین‌جا می‌گذرد)
  useEffect(() => {
    submittedRef.current = false
    setStimulusVisible(true)
    for (const t of timersRef.current) window.clearTimeout(t)
    timersRef.current = []

    // پنهان‌شدن محرک پس از stimulusMs — پنجره پاسخ تا انتهای فاصله باز است
    timersRef.current.push(window.setTimeout(() => setStimulusVisible(false), trial.stimulusMs))

    // انقضای مهلت پاسخ → ثبت بی‌پاسخی و رفتن به محرک بعد
    const remaining = ctx.timeRemainingMs()
    if (remaining !== null) {
      timersRef.current.push(
        window.setTimeout(() => {
          if (submittedRef.current) return
          submittedRef.current = true
          void ctx.submit(null).then((result) => {
            if (result.accepted && !result.sessionCompleted) {
              try {
                ctx.advance()
              } catch {
                // جلسه هم‌زمان قطع/تکمیل شده؛ پوسته مسیر خودش را می‌رود
              }
            }
          })
        }, remaining),
      )
    }
    // رفع ریس pause بین پذیرش پاسخ و advance (الگوی محاسبه ×۲۰)
    const outcome = ctx.lastOutcome
    if (outcome !== null && outcome.trialIndex === trial.trialIndex) {
      submittedRef.current = true
      try {
        ctx.advance()
      } catch {
        // جلسه هم‌زمان قطع/تکمیل شده
      }
    }
    return () => {
      for (const t of timersRef.current) window.clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trial.trialIndex])

  const flashBadge = (correct: boolean) => {
    setBadge(correct ? 'correct' : 'wrong')
    if (badgeTimerRef.current !== null) window.clearTimeout(badgeTimerRef.current)
    badgeTimerRef.current = window.setTimeout(() => setBadge(null), 900)
  }

  const respond = (color: SimonColor) => {
    if (submittedRef.current || ctx.paused) return
    submittedRef.current = true
    void ctx.submit(color).then((result) => {
      if (result.accepted) flashBadge(result.record.correct)
      if (result.accepted && !result.sessionCompleted) {
        try {
          ctx.advance()
        } catch {
          // جلسه هم‌زمان متوقف/قطع/تکمیل شده
        }
      } else if (!result.accepted) {
        submittedRef.current = false
      }
    })
  }

  useEffect(
    () => () => {
      if (badgeTimerRef.current !== null) window.clearTimeout(badgeTimerRef.current)
    },
    [],
  )

  return (
    <div className={styles.wrap}>
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
      <div
        className={styles.stage}
        data-testid="simon-stage"
        data-color={trial.color}
        data-side={trial.side}
        data-congruent={trial.congruent ? 'true' : 'false'}
      >
        {trial.mappingInverted ? <span className={styles.invertCue}>نگاشت وارونه!</span> : null}
        <span className={styles.fixation}>+</span>
        {stimulusVisible ? (
          <span
            className={`${styles.stimulus} ${trial.color === 'blue' ? styles.blue : styles.red} ${
              trial.side === 'left' ? styles.onLeft : styles.onRight
            }`}
            aria-label={`دایرهٔ ${COLOR_LABEL_FA[trial.color]}`}
            key={trial.trialIndex}
          />
        ) : null}
      </div>
      <p className={gameStyles.hint}>فقط به رنگ پاسخ بده — مکان فریب است</p>
      <div className={styles.buttons} role="group" aria-label="دکمه‌های پاسخ رنگی">
        {buttonOrder(trial.mappingInverted).map((color) => (
          <button
            type="button"
            key={color}
            className={`${styles.button} ${color === 'blue' ? styles.buttonBlue : styles.buttonRed}`}
            data-testid="simon-button"
            data-color={color}
            onClick={() => respond(color)}
          >
            <span className={color === 'blue' ? styles.dotBlue : styles.dotRed} aria-hidden="true" />
            {COLOR_LABEL_FA[color]}
          </button>
        ))}
      </div>
    </div>
  )
}
