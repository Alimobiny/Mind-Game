import { useEffect, useRef, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import gameStyles from '../../../../components/game/game.module.css'
import { BackspaceGlyph } from '../../../../components/icons/UiGlyphs'
import { toFaDigits } from '../../../../utils/format'
import type { Calculation20Trial } from './engine'
import styles from './calculation-20.module.css'

/**
 * Calculation × 20 — UI
 *
 * نمایش سؤال با ارقام فارسی، پاسخ با صفحه‌کلید عددی، بدون مهلت
 * زمانی برای سؤال منفرد؛ پس از هر پاسخ بلافاصله سؤال بعدی می‌آید و
 * نتیجهٔ پاسخ پیشین به‌صورت نشان شناور (درست ✓ / غلط ✗) دیده می‌شود —
 * بدون تأخیر در پیشروی تا رفتار زمانی دست‌نخورده بماند.
 */
export function Calculation20Game({ ctx }: { ctx: ActiveGameContext }) {
  const trial = ctx.trial as Calculation20Trial
  const [entry, setEntry] = useState('')
  const [badge, setBadge] = useState<'correct' | 'wrong' | null>(null)
  const badgeTimerRef = useRef<number | null>(null)
  // قفل پاسخِ ثبت‌شده — تپ دومی روی «تأیید» نباید همان پاسخ را
  // به سؤال بعدی هم بفرستد (پنجره race بین advance و پاک‌شدن entry)
  const submittedRef = useRef(false)

  useEffect(() => {
    submittedRef.current = false
    setEntry('')
    // رفع ریس pause بین پذیرش پاسخ و advance (الگوی محاسبه ×۱۰۰)
    const outcome = ctx.lastOutcome
    if (outcome !== null && outcome.trialIndex === trial.trialIndex) {
      submittedRef.current = true
      try {
        ctx.advance()
      } catch {
        // جلسه هم‌زمان قطع/تکمیل شده؛ پوسته مسیر خودش را می‌رود
      }
    }
    return () => {
      if (badgeTimerRef.current !== null) window.clearTimeout(badgeTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trial.trialIndex])

  const press = (key: string) => {
    if (key === 'back') {
      setEntry((current) => current.slice(0, -1))
      return
    }
    setEntry((current) => (current.length >= 3 ? current : current + key))
  }

  const flashBadge = (correct: boolean) => {
    setBadge(correct ? 'correct' : 'wrong')
    if (badgeTimerRef.current !== null) window.clearTimeout(badgeTimerRef.current)
    badgeTimerRef.current = window.setTimeout(() => setBadge(null), 900)
  }

  const submit = async () => {
    if (submittedRef.current || entry.length === 0) return
    submittedRef.current = true
    const value = Number.parseInt(entry, 10)
    const result = await ctx.submit(value)
    if (result.accepted) {
      flashBadge(result.record.correct)
    }
    if (result.accepted && !result.sessionCompleted) {
      try {
        ctx.advance()
      } catch {
        // جلسه هم‌زمان متوقف/قطع/تکمیل شده
      }
    } else if (!result.accepted) {
      submittedRef.current = false
    }
  }

  const q = trial.question

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
        className={styles.questionCard}
        aria-label="سؤال حساب"
        data-testid="calc-question"
        key={trial.trialIndex}
      >
        {toFaDigits(q.a)} {q.operator} {toFaDigits(q.b)} = ?
      </div>
      <div className={gameStyles.answerDisplay} aria-label="پاسخ شما">
        {entry === '' ? <span className={gameStyles.hint}>?</span> : toFaDigits(entry)}
      </div>
      <div className={gameStyles.keypad} role="group" aria-label="صفحه کلید عددی">
        {(['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const).map((key) => (
          <button type="button" className={gameStyles.key} key={key} onClick={() => press(key)}>
            {toFaDigits(key)}
          </button>
        ))}
        <button type="button" className={gameStyles.key} onClick={() => press('0')}>
          {toFaDigits(0)}
        </button>
        <button
          type="button"
          className={gameStyles.key}
          aria-label="پاک‌کردن"
          onClick={() => press('back')}
          disabled={entry === ''}
        >
          <BackspaceGlyph size={22} />
        </button>
        <button
          type="button"
          className={`${gameStyles.key} ${gameStyles.keyWide}`}
          onClick={() => void submit()}
          disabled={entry.length === 0}
        >
          تأیید
        </button>
      </div>
    </div>
  )
}
