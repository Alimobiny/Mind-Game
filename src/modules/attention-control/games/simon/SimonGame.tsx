import { useEffect, useRef, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import { useTrialGuards } from '../../../../components/game/useTrialGuards'
import gameStyles from '../../../../components/game/game.module.css'
import type { SimonColor, SimonTrial } from './engine'
import styles from './simon.module.css'

/**
 * Simon Task — UI
 *
 * محرک: دایرهٔ رنگی چپ/راست نقطهٔ ثابت. پاسخ: فقط بر اساس رنگ — دکمهٔ آبی
 * برای دایرهٔ آبی، دکمهٔ قرمز برای دایرهٔ قرمز؛ مکان محرک باید نادیده گرفته
 * شود. بازخورد با نشان شناور. سطح ۵: دکمه‌ها در میانهٔ بلوک جای خود را
 * عوض می‌کنند و نشان «نگاشت وارونه» این جابه‌جایی را اعلام می‌کند.
 *
 * SOA ثابت (contentVersion 2): پاسخِ ثبت‌شده advance را جلو نمی‌اندازد —
 * محرک بعد دقیقاً در پایان پنجره (محرک + فاصله) می‌آید (GAMES-AUDIT §۳-۲).
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
  const guards = useTrialGuards(ctx, trial.trialIndex)
  const badgeTimerRef = useRef<number | null>(null)

  // با هر محرک جدید ریست می‌شود (مونت/ریمانت پس از مکث هم همین‌جا می‌گذرد)
  useEffect(() => {
    // رفع ریس pause بین پذیرش پاسخ و advance (الگوی محاسبه ×۲۰)
    const outcome = ctx.lastOutcome
    if (outcome !== null && outcome.trialIndex === trial.trialIndex) {
      try {
        ctx.advance()
      } catch {
        // جلسه هم‌زمان قطع/تکمیل شده؛ پوسته مسیر خودش را می‌رود
      }
      return
    }

    // پنهان‌شدن محرک پس از stimulusMs — پنجره پاسخ تا انتهای فاصله باز است.
    // در بازنصبِ پس از مکث: اگر نقطهٔ پنهان‌شدن گذشته باشد (remaining از
    // طول فاصله کمتر است) محرک از اول پنهان شروع می‌شود — نه نمایش کاملِ
    // دوباره همراه با انقضای مهلت
    const remaining = ctx.timeRemainingMs()
    const pastHide = remaining !== null && remaining < trial.interStimulusMs
    setStimulusVisible(!pastHide)
    if (!pastHide) {
      guards.setTrackedTimeout(() => setStimulusVisible(false), trial.stimulusMs)
    }

    // انقضای مهلت پاسخ → ثبت بی‌پاسخی و رفتن به محرک بعد (پیشرویِ خودکار
    // در انقضا = همان نقطهٔ ثابت شبکهٔ زمانی)؛ پس از rollback ذخیره با
    // پنجرهٔ کوتاه دوباره مسلح می‌شود
    if (remaining !== null) {
      guards.armDeadline(() => null, remaining)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trial.trialIndex])

  const flashBadge = (correct: boolean) => {
    setBadge(correct ? 'correct' : 'wrong')
    if (badgeTimerRef.current !== null) window.clearTimeout(badgeTimerRef.current)
    badgeTimerRef.current = window.setTimeout(() => setBadge(null), 900)
  }

  const respond = (color: SimonColor) => {
    if (guards.isSubmitted() || ctx.paused) return
    void guards.submitOnce(color, {
      onAccepted: (result) => {
        flashBadge(result.record.correct)
        // SOA ثابت: advance در پایان پنجرهٔ پاسخ
        if (!result.sessionCompleted) {
          const rest = ctx.timeRemainingMs()
          guards.setTrackedTimeout(() => {
            try {
              ctx.advance()
            } catch {
              // جلسه هم‌زمان متوقف/قطع/تکمیل شده
            }
          }, Math.max(rest ?? 0, 0))
        }
      },
      autoAdvance: false,
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
