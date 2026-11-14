import { useEffect, useRef, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import { useTrialGuards } from '../../../../components/game/useTrialGuards'
import gameStyles from '../../../../components/game/game.module.css'
import type { GoNoGoTrial } from './engine'
import styles from './go-no-go.module.css'

/**
 * Go/No-Go — UI
 *
 * جریان پیوسته: محرک نمایش داده می‌شود؛ کاربر کلید/ناحیه بزرگ را برای
 * محرک Go می‌زند و برای مربع (No-Go) خودداری می‌کند. با انقضای مهلت،
 * مرحله بدون پاسخ ثبت و بعدی می‌آید. منطق در engine است.
 *
 * SOA ثابت (contentVersion 2): پاسخِ ثبت‌شده advance را جلو نمی‌اندازد —
 * محرک بعد دقیقاً در پایان پنجره (محرک + ISI) می‌آید؛ نرخ commission دیگر
 * تابع سرعت خودکارِ کاربر نیست (GAMES-AUDIT §۳-۲).
 */
export function GoNoGoGame({ ctx }: { ctx: ActiveGameContext }) {
  const trial = ctx.trial as GoNoGoTrial
  const [stimulusVisible, setStimulusVisible] = useState(true)
  const [badge, setBadge] = useState<'correct' | 'wrong' | null>(null)
  const guards = useTrialGuards(ctx, trial.trialIndex)
  const badgeTimerRef = useRef<number | null>(null)

  // با هر محرک جدید ریست می‌شود. در بازنصبِ پس از مکث اگر نقطهٔ پنهان‌شدن
  // گذشته باشد (remaining از ISI کمتر) محرک از اول پنهان می‌ماند — نمایش
  // دوباره، پنجرهٔ پاسخ را عملاً طولانی‌تر از طراحی می‌کرد
  useEffect(() => {
    const remaining = ctx.timeRemainingMs()
    const pastHide =
      remaining !== null && trial.responseWindowMs !== null
        ? remaining < trial.responseWindowMs - trial.stimulusMs
        : false
    setStimulusVisible(!pastHide)
    if (!pastHide) {
      // پنهان‌شدن محرک بعد از stimulusMs
      guards.setTrackedTimeout(() => setStimulusVisible(false), trial.stimulusMs)
    }

    // انقضای مهلت پاسخ → ثبت بی‌پاسخی و رفتن به محرک بعد (پیشرویِ
    // خودکار در انقضا = همان نقطهٔ ثابت شبکهٔ زمانی)؛ پس از rollback
    // ذخیره با پنجرهٔ کوتاه دوباره مسلح می‌شود
    if (remaining !== null) {
      guards.armDeadline(() => null, remaining)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trial.trialIndex])

  // نشان شناور نتیجهٔ تپ — بدون تغییر زمانی
  const flashBadge = (correct: boolean) => {
    setBadge(correct ? 'correct' : 'wrong')
    if (badgeTimerRef.current !== null) window.clearTimeout(badgeTimerRef.current)
    badgeTimerRef.current = window.setTimeout(() => setBadge(null), 900)
  }

  const respond = () => {
    if (guards.isSubmitted() || ctx.paused) return
    void guards.submitOnce('tap', {
      onAccepted: (result) => {
        flashBadge(result.record.correct)
        // SOA ثابت: advance در پایان پنجرهٔ پاسخ — پاسخ سریع محرک بعد را
        // زودتر نمی‌آورد؛ ISI حداقلی تا پایان پنجره رعایت می‌شود
        if (!result.sessionCompleted) {
          const rest = ctx.timeRemainingMs()
          guards.setTrackedTimeout(() => {
            try {
              ctx.advance()
            } catch {
              // جلسه هم‌زمان قطع/تکمیل شده — بی‌اثر
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
    <button
      type="button"
      className={`${styles.tapArea} ${stimulusVisible ? '' : styles.blank}`}
      onPointerDown={respond}
      aria-label="ناحیه پاسخ"
    >
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
      {stimulusVisible ? (
        trial.kind === 'go' ? (
          <span className={styles.goStimulus} aria-label="محرک برو" data-kind="go" />
        ) : (
          <span className={styles.nogoStimulus} aria-label="محرک ممنوع" data-kind="nogo" />
        )
      ) : (
        <span className={styles.plusSign}>+</span>
      )}
      <span className={gameStyles.hint} style={{ position: 'absolute', bottom: 'var(--space-5)' }}>
        دایره = بزن · مربع = خودداری کن
      </span>
    </button>
  )
}
