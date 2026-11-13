import { useEffect, useRef, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import gameStyles from '../../../../components/game/game.module.css'
import { toFaDigits } from '../../../../utils/format'
import type { SyllableCountingTrial } from './engine'
import styles from './syllable-counting.module.css'

/**
 * شمارش هجا — UI
 *
 * نمایش جملهٔ فارسی به‌صورت درشت و وسط‌چین روی کارت تپنده؛ کاربر شمار
 * هجاها را با صفحه‌کلید عددی وارد می‌کند. بدون مهلت زمانی؛ پس از پاسخ،
 * شمار درست به‌صورت فلش کوتاه دیده می‌شود و سپس جملهٔ بعدی می‌آید
 * (e2e با waitProgressAdvance همگام است).
 */
export function SyllableCountingGame({ ctx }: { ctx: ActiveGameContext }) {
  const trial = ctx.trial as SyllableCountingTrial
  const [entry, setEntry] = useState('')
  const submittedRef = useRef(false)
  const flashTimerRef = useRef<number | null>(null)
  const [flash, setFlash] = useState<{ correct: boolean; expected: number } | null>(null)

  useEffect(() => {
    submittedRef.current = false
    setEntry('')
    setFlash(null)
    return () => {
      if (flashTimerRef.current !== null) window.clearTimeout(flashTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trial.trialIndex])

  const press = (key: string) => {
    if (key === 'back') {
      setEntry((current) => current.slice(0, -1))
      return
    }
    // بیشترین هجای بانک ۲۱ است → دو رقم کافی است
    setEntry((current) => (current.length >= 2 ? current : current + key))
  }

  const submit = async () => {
    if (submittedRef.current || entry.length === 0) return
    submittedRef.current = true
    const value = Number.parseInt(entry, 10)
    const result = await ctx.submit(value)
    if (!result.accepted || result.sessionCompleted) return
    const expected = trial.syllableCount
    setFlash({ correct: result.record.correct, expected })
    flashTimerRef.current = window.setTimeout(() => {
      setFlash(null)
      try {
        ctx.advance()
      } catch {
        // جلسه هم‌زمان قطع/تکمیل شده
      }
    }, 800)
  }

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', width: '100%', alignItems: 'center' }}>
      <p
        className={`${styles.sentenceCard} ${flash !== null ? (flash.correct ? styles.cardCorrect : styles.cardWrong) : ''}`}
        aria-label="جملهٔ ورودی"
        data-testid="syllable-sentence"
        key={trial.trialIndex}
      >
        {trial.text}
      </p>

      {flash !== null ? (
        <div
          className={`${gameStyles.floatingBadgeInner} ${flash.correct ? gameStyles.floatingBadgeCorrect : gameStyles.floatingBadgeWrong}`}
          role="status"
        >
          {flash.correct ? 'درست ✓' : `${toFaDigits(flash.expected)} هجا`}
        </div>
      ) : null}

      <p className={gameStyles.hint}>چند هجا دارد؟</p>
      <div className={gameStyles.answerDisplay} aria-label="پاسخ شما" data-testid="syllable-entry">
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
        <button type="button" className={gameStyles.key} onClick={() => press('back')} disabled={entry === ''}>
          ⌫
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
