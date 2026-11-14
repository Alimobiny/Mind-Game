import { useEffect, useRef, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import { useTrialGuards } from '../../../../components/game/useTrialGuards'
import gameStyles from '../../../../components/game/game.module.css'
import { BackspaceGlyph } from '../../../../components/icons/UiGlyphs'
import { toFaDigits } from '../../../../utils/format'
import type { PasatTrial } from './engine'
import styles from './pasat.module.css'
import { e2e } from '../../../../utils/e2e'

/**
 * PASAT — UI
 *
 * رقم برای digitDisplayMs دیده می‌شود و محو؛ کاربر باید جمع «رقم جدید + رقم
 * قبل» را با کیپد وارد و تأیید کند — پیش از ظهور رقم بعد (پنجره = interval).
 *
 * ریتم آزمونگر (contentVersion 2): پاسخِ ثبت‌شده ریتم را جلو نمی‌اندازد —
 * رقم بعد دقیقاً در پایان پنجرهٔ ثابت ظاهر می‌شود (پیشروی تأخیری تا انقضای
 * پنجره)؛ پاسخ پس از ظهور رقم بعد دیگر پذیرفته نمی‌شود (پنجره بسته است).
 * سه گارد الزامی در useTrialGuards است.
 */
const FA = '۰۱۲۳۴۵۶۷۸۹'
const MAX_ENTRY_DIGITS = 2

export function PasatGame({ ctx }: { ctx: ActiveGameContext }) {
  const trial = ctx.trial as PasatTrial
  const [digitVisible, setDigitVisible] = useState(true)
  const [entry, setEntry] = useState('')
  const [badge, setBadge] = useState<'correct' | 'wrong' | null>(null)
  const guards = useTrialGuards(ctx, trial.trialIndex)
  // تایمر نشان شناور جدا از تایمرهای ردیابی‌شده — پاک‌سازی per-trial آن را
  // می‌کشت و نشان تا کل رقم بعدی چسبیده می‌ماند
  const badgeTimerRef = useRef<number | null>(null)

  useEffect(() => {
    setEntry('')
    setDigitVisible(true)

    // محو شدن رقم پس از digitDisplayMs (فاصلهٔ فکری تا رقم بعد)
    guards.setTrackedTimeout(() => setDigitVisible(false), trial.digitDisplayMs)

    // انقضای پنجرهٔ پاسخ → بی‌پاسخ و رقم بعد (پیشروی خودکار useTrialGuards)؛
    // پس از rollback ذخیره با پنجرهٔ کوتاه دوباره مسلح می‌شود
    const remaining = ctx.timeRemainingMs()
    if (remaining !== null) {
      guards.armDeadline(() => null, remaining)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trial.trialIndex])

  // پاک‌سازی تایمر نشان شناور فقط در unmount
  useEffect(
    () => () => {
      if (badgeTimerRef.current !== null) window.clearTimeout(badgeTimerRef.current)
    },
    [],
  )

  const press = (key: string) => {
    if (guards.isSubmitted() || ctx.paused) return
    if (key === 'back') {
      setEntry((current) => current.slice(0, -1))
      return
    }
    setEntry((current) => (current.length >= MAX_ENTRY_DIGITS ? current : current + key))
  }

  const submit = () => {
    if (guards.isSubmitted() || ctx.paused || entry.length === 0) return
    const value = Number.parseInt(entry, 10)
    void guards.submitOnce(value, {
      onAccepted: (result) => {
        // نشان کوتاهٔ نتیجه روی رقم/فاصلهٔ بعدی می‌ماند (۹۰۰ms تایمر خودش)
        setBadge(result.record.correct ? 'correct' : 'wrong')
        if (badgeTimerRef.current !== null) window.clearTimeout(badgeTimerRef.current)
        badgeTimerRef.current = window.setTimeout(() => setBadge(null), 900)
        // پیشرویِ تأخیری تا پایان پنجره — پاسخ سریع ریتم را جلو نمی‌اندازد؛
        // رقم بعد در همان نقطهٔ ثابتِ شبکهٔ زمانی می‌آید
        const rest = ctx.timeRemainingMs()
        if (rest !== null && rest > 0) {
          guards.setTrackedTimeout(() => {
            try {
              ctx.advance()
            } catch {
              // جلسه هم‌زمان قطع/تکمیل شده — بی‌اثر
            }
          }, rest)
        }
      },
      // جلسه با آخرین پاسخ کامل شد → صفحهٔ نتایج بی‌درنگ (بدون انتظار پنجره)
      autoAdvance: false,
    })
  }

  const isWatch = trial.expected === null

  return (
    <div className={styles.stage}>
      {badge !== null ? (
        <span className={gameStyles.floatingBadge} aria-live="polite">
          <span className={`${gameStyles.floatingBadgeInner} ${badge === 'correct' ? gameStyles.floatingBadgeCorrect : gameStyles.floatingBadgeWrong}`}>
            {badge === 'correct' ? 'درست ✓' : 'غلط ✗'}
          </span>
        </span>
      ) : null}
      <div
        className={styles.digitArea}
        data-testid="pasat-display"
        data-digit={trial.digit}
        data-expected={e2e(trial.expected ?? '')}
      >
        {digitVisible ? (
          <span key={trial.trialIndex} className={`${gameStyles.bigNumber} ${styles.digitPop}`}>
            {toFaDigits(trial.digit)}
          </span>
        ) : (
          <span className={styles.fixation}>+</span>
        )}
      </div>

      <p className={gameStyles.hint}>
        {isWatch
          ? 'این رقم را فقط به خاطر بسپار — جمعی ندارد'
          : 'جمع این رقم با رقم قبل را وارد کن و تأیید بزن'}
      </p>

      <div className={gameStyles.answerDisplay} style={{ direction: 'ltr' }} aria-label="پاسخ شما">
        {entry === '' ? <span className={styles.placeholder}>?</span> : toFaDigits(entry)}
      </div>

      <div className={gameStyles.keypad} role="group" aria-label="صفحه کلید عددی">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} type="button" className={gameStyles.key} onClick={() => press(d)}>
            {FA[Number(d)]}
          </button>
        ))}
        <button type="button" className={gameStyles.key} onClick={() => press('0')}>
          {FA[0]}
        </button>
        <button type="button" className={gameStyles.key} aria-label="پاک‌کردن" onClick={() => press('back')}>
          <BackspaceGlyph size={22} />
        </button>
        <button
          type="button"
          className={gameStyles.keyWide}
          onClick={submit}
          data-testid="pasat-submit"
        >
          تأیید
        </button>
      </div>
    </div>
  )
}
