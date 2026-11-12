import { useEffect, useRef, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import gameStyles from '../../../../components/game/game.module.css'
import { toFaDigits } from '../../../../utils/format'
import type { WordScrambleTrial } from './engine'
import styles from './word-scramble.module.css'

/**
 * واژهٔ به‌هم‌ریخته — UI
 *
 * کاشی حروف به‌هم‌ریخته؛ کاربر با لمس، حروف را به ترتیب به «نوار ساخت»
 * می‌فرستد (آخرین حرف با دکمهٔ برگشت برمی‌گردد) و وقتی واژه کامل شد تأیید
 * می‌کند. حروف استفاده‌شده خاموش می‌شوند؛ در سطح‌های فریب، حرف زائد را
 * نباید به کار برد. یک submit در پایان — قرارداد یک-submit-per-trial؛
 * هر سه گارد الزامی رعایت شده است.
 */

export function WordScrambleGame({ ctx }: { ctx: ActiveGameContext }) {
  const trial = ctx.trial as WordScrambleTrial
  const [used, setUsed] = useState<readonly number[]>([])
  const submittedRef = useRef(false)

  useEffect(() => {
    submittedRef.current = false
    setUsed([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trial.trialIndex])

  const built = used.map((i) => trial.letters[i] as string).join('')
  const complete = built.length === trial.target.length
  const hasDecoy = trial.letters.length > trial.target.length

  const tapLetter = (index: number) => {
    if (submittedRef.current || ctx.paused) return
    if (used.includes(index)) return
    if (built.length >= trial.letters.length) return
    setUsed((current) => [...current, index])
  }

  const undoLast = () => {
    if (submittedRef.current || ctx.paused) return
    setUsed((current) => current.slice(0, -1))
  }

  const clearAll = () => {
    if (submittedRef.current || ctx.paused) return
    setUsed([])
  }

  const submit = () => {
    if (submittedRef.current || ctx.paused) return
    if (!complete) return
    submittedRef.current = true
    void ctx.submit(built).then((result) => {
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

  return (
    <div className={styles.stage}>
      <p className={gameStyles.hint}>
        {hasDecoy
          ? `از حروف زیر، واژهٔ ${toFaDigits(trial.target.length)} حرفی را به ترتیب بساز — یک حرف اضافه است!`
          : `از حروف زیر، واژهٔ ${toFaDigits(trial.target.length)} حرفی را به ترتیب بساز`}
      </p>

      {/* نوار واژهٔ در حال ساخت */}
      <div className={styles.buildStrip} data-testid="ws-built" data-testid-built={built}>
        {built.length > 0 ? (
          built.split('').map((ch, i) => (
            <span key={i} className={styles.builtTile} data-testid="ws-built-tile">
              {ch}
            </span>
          ))
        ) : (
          <span className={styles.buildPlaceholder}>…</span>
        )}
      </div>

      {/* کاشی حروف */}
      <div className={styles.letterGrid} data-testid="ws-letters" data-target={trial.target} role="group" aria-label="حروف">
        {trial.letters.map((ch, i) => {
          const isUsed = used.includes(i)
          return (
            <button
              key={i}
              type="button"
              className={`${styles.letterTile} ${isUsed ? styles.letterUsed : ''}`}
              data-testid="ws-letter"
              data-index={i}
              data-letter={ch}
              onClick={() => tapLetter(i)}
              disabled={isUsed}
            >
              {ch}
            </button>
          )
        })}
      </div>

      <div className={styles.actionRow}>
        <button type="button" className={styles.secondaryButton} onClick={undoLast} disabled={used.length === 0}>
          برگشت آخر
        </button>
        <button type="button" className={styles.secondaryButton} onClick={clearAll} disabled={used.length === 0}>
          پاک‌کردن
        </button>
        <button
          type="button"
          className={gameStyles.keyWide}
          onClick={submit}
          disabled={!complete}
          data-testid="ws-submit"
        >
          تأیید
        </button>
      </div>
    </div>
  )
}
