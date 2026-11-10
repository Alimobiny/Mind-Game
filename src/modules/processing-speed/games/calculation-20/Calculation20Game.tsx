import { useEffect, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import gameStyles from '../../../../components/game/game.module.css'
import { toFaDigits } from '../../../../utils/format'
import type { Calculation20Trial } from './engine'

/**
 * Calculation × 20 — UI
 *
 * نمایش سؤال با ارقام فارسی، پاسخ با صفحه‌کلید عددی، بدون مهلت
 * زمانی برای سؤال منفرد؛ پس از هر پاسخ بلافاصله سؤال بعدی.
 */
export function Calculation20Game({ ctx }: { ctx: ActiveGameContext }) {
  const trial = ctx.trial as Calculation20Trial
  const [entry, setEntry] = useState('')

  useEffect(() => {
    setEntry('')
  }, [trial.trialIndex])

  const press = (key: string) => {
    if (key === 'back') {
      setEntry((current) => current.slice(0, -1))
      return
    }
    setEntry((current) => (current.length >= 3 ? current : current + key))
  }

  const submit = async () => {
    if (entry.length === 0) return
    const value = Number.parseInt(entry, 10)
    const result = await ctx.submit(value)
    if (result.accepted && !result.sessionCompleted) {
      ctx.advance()
    }
  }

  const q = trial.question

  return (
    <>
      <div
        className={gameStyles.bigNumber}
        style={{ direction: 'ltr' }}
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
