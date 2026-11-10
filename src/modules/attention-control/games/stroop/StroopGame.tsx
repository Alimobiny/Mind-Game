import { useEffect, useRef } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import gameStyles from '../../../../components/game/game.module.css'
import {
  STROOP_COLORS,
  STROOP_COLOR_LABELS_FA,
  type StroopColorKey,
  type StroopTrial,
} from './engine'
import styles from './stroop.module.css'

/** کلید رنگ → رنگ CSS برای جوهر کلمه و چیپ دکمه‌های پاسخ */
const INK_CSS_COLORS: Readonly<Record<StroopColorKey, string>> = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
}

/**
 * Stroop — UI
 *
 * جریان پیوسته: کلمه رنگ با جوهرِ (احتمالاً متفاوت) نمایش داده می‌شود؛
 * کاربر رنگ جوهر را از چهار دکمه انتخاب می‌کند. با انقضای مهلت، مرحله
 * بدون پاسخ ثبت و بعدی می‌آید. منطق در engine است.
 */
export function StroopGame({ ctx }: { ctx: ActiveGameContext }) {
  const trial = ctx.trial as StroopTrial
  const deadlineRef = useRef<number | null>(null)
  const submittedRef = useRef(false)

  // با هر مرحله جدید ریست می‌شود
  useEffect(() => {
    submittedRef.current = false

    // انقضای مهلت پاسخ → ثبت بی‌پاسخی و رفتن به مرحله بعد
    const remaining = ctx.timeRemainingMs()
    if (remaining !== null) {
      deadlineRef.current = window.setTimeout(() => {
        if (submittedRef.current) return
        submittedRef.current = true
        void ctx.submit(null).then((result) => {
          if (result.accepted) ctx.advance()
        })
      }, remaining)
    }
    return () => {
      if (deadlineRef.current !== null) window.clearTimeout(deadlineRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trial.trialIndex])

  const answer = (color: StroopColorKey) => {
    if (submittedRef.current || ctx.paused) return
    submittedRef.current = true
    void ctx.submit(color).then((result) => {
      if (result.accepted) ctx.advance()
    })
  }

  return (
    <div className={styles.stage}>
      <div
        className={`${gameStyles.bigNumber} ${styles.word}`}
        style={{ color: INK_CSS_COLORS[trial.ink] }}
        data-testid="stroop-word"
        data-ink={trial.ink}
      >
        {STROOP_COLOR_LABELS_FA[trial.word]}
      </div>

      <div className={styles.answerRow} role="group" aria-label="انتخاب رنگ جوهر">
        {STROOP_COLORS.map((key) => (
          <button
            key={key}
            type="button"
            className={styles.colorButton}
            data-color={key}
            onClick={() => answer(key)}
            disabled={ctx.paused}
            aria-label={STROOP_COLOR_LABELS_FA[key]}
          >
            <span className={styles.chip} style={{ background: INK_CSS_COLORS[key] }} aria-hidden="true" />
            <span>{STROOP_COLOR_LABELS_FA[key]}</span>
          </button>
        ))}
      </div>

      <p className={gameStyles.hint}>رنگِ جوهر را انتخاب کن، نه معنی کلمه را</p>
    </div>
  )
}
