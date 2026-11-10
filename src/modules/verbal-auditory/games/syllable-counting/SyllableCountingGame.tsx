import { useEffect, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import gameStyles from '../../../../components/game/game.module.css'
import { toFaDigits } from '../../../../utils/format'
import type { SyllableCountingTrial } from './engine'
import styles from './syllable-counting.module.css'

/**
 * شمارش هجا — UI
 *
 * نمایش جملهٔ فارسی به‌صورت درشت و وسط‌چین؛ کاربر شمار هجاها را با
 * صفحه‌کلید عددی وارد می‌کند. بدون مهلت زمانی؛ پس از هر پاسخ بلافاصله
 * جملهٔ بعدی می‌آید (همان جریان Calculation × 20).
 */
export function SyllableCountingGame({ ctx }: { ctx: ActiveGameContext }) {
  const trial = ctx.trial as SyllableCountingTrial
  const [entry, setEntry] = useState('')

  useEffect(() => {
    setEntry('')
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
    if (entry.length === 0) return
    const value = Number.parseInt(entry, 10)
    const result = await ctx.submit(value)
    if (result.accepted && !result.sessionCompleted) {
      ctx.advance()
    }
  }

  return (
    <>
      <p
        className={styles.sentence}
        aria-label="جملهٔ ورودی"
        data-testid="syllable-sentence"
        key={trial.trialIndex}
      >
        {trial.text}
      </p>
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
    </>
  )
}
