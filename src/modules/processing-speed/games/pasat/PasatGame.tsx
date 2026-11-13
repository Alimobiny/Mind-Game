import { useEffect, useRef, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import gameStyles from '../../../../components/game/game.module.css'
import { BackspaceGlyph } from '../../../../components/icons/UiGlyphs'
import { toFaDigits } from '../../../../utils/format'
import type { PasatTrial } from './engine'
import styles from './pasat.module.css'

/**
 * PASAT — UI
 *
 * رقم برای digitDisplayMs دیده می‌شود و محو؛ کاربر باید جمع «رقم جدید + رقم
 * قبل» را با کیپد وارد و تأیید کند — پیش از ظهور رقم بعد (پنجره = interval).
 * ثبت پاسخ یا انقضای مهلت، مرحله را تمام و رقم بعد را می‌آورد. سه گارد
 * الزامی: submittedRef · advance فقط تا قبل از sessionCompleted · تایمرها
 * در timersRef با پاک‌سازی.
 */
const FA = '۰۱۲۳۴۵۶۷۸۹'
const MAX_ENTRY_DIGITS = 2

export function PasatGame({ ctx }: { ctx: ActiveGameContext }) {
  const trial = ctx.trial as PasatTrial
  const [digitVisible, setDigitVisible] = useState(true)
  const [entry, setEntry] = useState('')
  const [badge, setBadge] = useState<'correct' | 'wrong' | null>(null)
  const timersRef = useRef<number[]>([])
  const submittedRef = useRef(false)

  useEffect(() => {
    submittedRef.current = false
    setEntry('')
    setDigitVisible(true)
    for (const t of timersRef.current) window.clearTimeout(t)
    timersRef.current = []

    // محو شدن رقم پس از digitDisplayMs (فاصلهٔ فکری تا رقم بعد)
    timersRef.current.push(window.setTimeout(() => setDigitVisible(false), trial.digitDisplayMs))

    // انقضای پنجرهٔ پاسخ → بی‌پاسخ و رقم بعد
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
    return () => {
      for (const t of timersRef.current) window.clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trial.trialIndex])

  const press = (key: string) => {
    if (submittedRef.current || ctx.paused) return
    if (key === 'back') {
      setEntry((current) => current.slice(0, -1))
      return
    }
    setEntry((current) => (current.length >= MAX_ENTRY_DIGITS ? current : current + key))
  }

  const submit = () => {
    if (submittedRef.current || ctx.paused || entry.length === 0) return
    submittedRef.current = true
    const value = Number.parseInt(entry, 10)
    void ctx.submit(value).then((result) => {
      if (result.accepted) {
        // نشان کوتاه نتیجه حین باقی پنجرهٔ ریتم — پیشروی همان‌طور با انقضای
        // interval خودکار است (رفتار زمانی دست‌نخورده)
        setBadge(result.record.correct ? 'correct' : 'wrong')
        timersRef.current.push(window.setTimeout(() => setBadge(null), 900))
      }
      if (result.accepted && !result.sessionCompleted) {
        try {
          ctx.advance()
        } catch {
          // جلسه هم‌زمان تمام/قطع شده — بی‌اثر
        }
      } else if (!result.accepted) {
        submittedRef.current = false
      }
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
        data-expected={trial.expected ?? ''}
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
        <button type="button" className={gameStyles.key} onClick={() => press('back')}>
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
