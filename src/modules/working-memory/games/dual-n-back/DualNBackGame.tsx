import { useEffect, useRef, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import gameStyles from '../../../../components/game/game.module.css'
import { toFaDigits } from '../../../../utils/format'
import type { DualNBackTrial } from './engine'
import styles from './dual-n-back.module.css'

/**
 * Dual N-Back — UI
 *
 * دو جریان هم‌زمان: حرف (بالای شبکه) + خانهٔ فعال شبکهٔ ۳×۳. در پنجرهٔ پاسخ،
 * «تطبیق حرف» و «تطبیق مکان» فقط ادعا ثبت می‌کنند (قفل یک‌بار هر جریان)؛
 * تایمر مهلت، یک submit با هر دو ادعا و زمان هر فشردن می‌فرستد — قرارداد
 * یک-submit-per-trial موتور. هر سه گارد الزامی رعایت شده است.
 */
export function DualNBackGame({ ctx }: { ctx: ActiveGameContext }) {
  const trial = ctx.trial as DualNBackTrial
  const [stimulusVisible, setStimulusVisible] = useState(true)
  const timersRef = useRef<number[]>([])
  const submittedRef = useRef(false)
  const trialStartRef = useRef(0)
  const claimsRef = useRef({ letterClaimed: false, letterRtMs: null as number | null, cellClaimed: false, cellRtMs: null as number | null })

  useEffect(() => {
    submittedRef.current = false
    setStimulusVisible(true)
    claimsRef.current = { letterClaimed: false, letterRtMs: null, cellClaimed: false, cellRtMs: null }
    trialStartRef.current = performance.now()
    for (const t of timersRef.current) window.clearTimeout(t)
    timersRef.current = []

    // پنهان‌شدن هر دو جریان بعد از stimulusMs (فاصله خالی تا محرک بعد)
    timersRef.current.push(window.setTimeout(() => setStimulusVisible(false), trial.stimulusMs))

    // انقضای مهلت → یک submit با ادعاهای جمع‌شدهٔ هر دو جریان
    const remaining = ctx.timeRemainingMs()
    if (remaining !== null) {
      timersRef.current.push(
        window.setTimeout(() => {
          if (submittedRef.current) return
          submittedRef.current = true
          const c = claimsRef.current
          const anyClaim = c.letterClaimed || c.cellClaimed
          void ctx.submit(
            anyClaim
              ? { letterClaimed: c.letterClaimed, cellClaimed: c.cellClaimed, letterRtMs: c.letterRtMs, cellRtMs: c.cellRtMs }
              : null,
          ).then((result) => {
            if (result.accepted && !result.sessionCompleted) {
              try {
                ctx.advance()
              } catch {
                // جلسه هم‌زمان قطع/تکمیل شده — بی‌اثر
              }
            }
          })
        }, remaining),
      )
    }
    return () => {
      for (const t of timersRef.current) window.clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trial.trialIndex])

  /** ادعای یک جریان — فقط یک‌بار؛ فشردنِ دوبارهٔ همان دکمه بی‌اثر است */
  const claim = (stream: 'letter' | 'cell') => {
    if (submittedRef.current || ctx.paused) return
    const rt = Math.round(performance.now() - trialStartRef.current)
    if (stream === 'letter' && !claimsRef.current.letterClaimed) {
      claimsRef.current.letterClaimed = true
      claimsRef.current.letterRtMs = rt
    }
    if (stream === 'cell' && !claimsRef.current.cellClaimed) {
      claimsRef.current.cellClaimed = true
      claimsRef.current.cellRtMs = rt
    }
  }

  const cells = Array.from({ length: 9 }, (_, i) => i)

  return (
    <div className={styles.stage}>
      <div className={styles.letterArea} data-testid="dnback-letter" data-is-letter-target={trial.isLetterTarget ? 'true' : 'false'}>
        {stimulusVisible ? (
          <span className={gameStyles.bigNumber}>{trial.letter}</span>
        ) : (
          <span className={styles.fixation}>+</span>
        )}
      </div>

      <div
        className={styles.grid}
        data-testid="dnback-grid"
        data-cell-index={trial.cell}
        data-is-cell-target={trial.isCellTarget ? 'true' : 'false'}
        aria-label="شبکه مکان"
      >
        {cells.map((i) => (
          <span
            key={i}
            className={`${styles.cell} ${i === trial.cell && stimulusVisible ? styles.cellActive : ''}`}
            data-cell-index={i}
          >
            {i === trial.cell && stimulusVisible ? (
              <span className={styles.cellDot} data-testid="dnback-cell" />
            ) : null}
          </span>
        ))}
      </div>

      <p className={gameStyles.hint}>
        اگر حرف یا مکان با {toFaDigits(trial.n)} مرحله قبل یکی بود، دکمهٔ همان جریان را بزن
      </p>

      <div className={styles.buttonRow}>
        <button
          type="button"
          className={styles.matchButton}
          onClick={() => claim('letter')}
          data-testid="dnback-letter-match"
        >
          تطبیق حرف
        </button>
        <button
          type="button"
          className={styles.matchButton}
          onClick={() => claim('cell')}
          data-testid="dnback-cell-match"
        >
          تطبیق مکان
        </button>
      </div>
    </div>
  )
}
