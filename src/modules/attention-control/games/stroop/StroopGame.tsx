import { useEffect, useRef, useState } from 'react'
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

/** نمایش نتیجهٔ پاسخ برای فلش کوتاه پیش از مرحلهٔ بعد */
interface FlashState {
  readonly correct: boolean
  readonly ink: StroopColorKey
}

/**
 * Stroop — UI
 *
 * کلمهٔ رنگ با جوهرِ (احتمالاً متفاوت) روی یک قطرهٔ مرکب SVG هم‌رنگِ جوهر
 * نمایش داده می‌شود؛ کاربر رنگ جوهر را از چهار دکمه انتخاب می‌کند. پس از
 * پاسخ، فلش کوتاه تمام-صحنه (سبز/قرمز) نتیجه را نشان می‌دهد و سپس مرحلهٔ
 * بعد می‌آید (e2e با waitProgressAdvance همگام است). با انقضای مهلت، مرحله
 * بدون پاسخ ثبت و بعدی می‌آید.
 */
export function StroopGame({ ctx }: { ctx: ActiveGameContext }) {
  const trial = ctx.trial as StroopTrial
  const deadlineRef = useRef<number | null>(null)
  const flashTimerRef = useRef<number | null>(null)
  const submittedRef = useRef(false)
  const [flash, setFlash] = useState<FlashState | null>(null)

  // با هر مرحله جدید ریست می‌شود
  useEffect(() => {
    submittedRef.current = false
    setFlash(null)

    // انقضای مهلت پاسخ → ثبت بی‌پاسخی و رفتن به مرحله بعد
    const remaining = ctx.timeRemainingMs()
    if (remaining !== null) {
      deadlineRef.current = window.setTimeout(() => {
        if (submittedRef.current) return
        submittedRef.current = true
        void ctx.submit(null).then((result) => {
          if (!result.accepted) {
            // persist_failed: مدیر rollback کرده — قفل باز بماند تا تلاش
            // مجدد ممکن باشد (وگرنه جلسه تا abort قفل می‌شد)
            submittedRef.current = false
            return
          }
          if (!result.sessionCompleted) {
            try {
              ctx.advance()
            } catch {
              // جلسه هم‌زمان قطع/تکمیل شده — بی‌اثر
            }
          }
        })
      }, remaining)
    }
    return () => {
      if (deadlineRef.current !== null) window.clearTimeout(deadlineRef.current)
      if (flashTimerRef.current !== null) window.clearTimeout(flashTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trial.trialIndex])

  /** فلش نتیجه و سپس پیشروی — e2e با waitProgressAdvance صبر می‌کند */
  const flashThenAdvance = (correct: boolean, ink: StroopColorKey, onAdvance: () => void) => {
    setFlash({ correct, ink })
    flashTimerRef.current = window.setTimeout(() => {
      setFlash(null)
      onAdvance()
    }, 650)
  }

  const answer = (color: StroopColorKey) => {
    if (submittedRef.current || ctx.paused) return
    submittedRef.current = true
    void ctx.submit(color).then((result) => {
      if (!result.accepted) {
        // persist_failed: مدیر rollback کرده — قفل باز بماند
        submittedRef.current = false
        return
      }
      if (result.sessionCompleted) return
      flashThenAdvance(result.record.correct, trial.ink, () => {
        try {
          ctx.advance()
        } catch {
          // جلسه هم‌زمان قطع/تکمیل شده
        }
      })
    })
  }

  return (
    <div
      className={`${styles.stage} ${flash !== null ? (flash.correct ? styles.stageCorrect : styles.stageWrong) : ''}`}
    >
      {/* قطرهٔ مرکب پس‌زمینه — هم‌رنگِ جوهر، حس «چاپ» کلمه */}
      <svg className={styles.inkBlob} viewBox="0 0 200 160" aria-hidden="true">
        <path
          className={styles.inkBlobPath}
          style={{ fill: INK_CSS_COLORS[trial.ink], fillOpacity: 0.14 }}
          d="M100 8 C 138 8, 168 34, 172 72 C 176 112, 148 150, 100 152 C 52 150, 24 112, 28 72 C 32 34, 62 8, 100 8 Z M 60 30 C 44 44, 36 60, 38 80 C 40 96, 52 108, 66 112 C 56 96, 52 78, 58 58 C 62 46, 68 38, 78 32 C 70 28, 64 27, 60 30 Z"
        />
      </svg>

      <div
        className={`${gameStyles.bigNumber} ${styles.word}`}
        style={{ color: INK_CSS_COLORS[trial.ink] }}
        data-testid="stroop-word"
        data-ink={trial.ink}
        key={trial.trialIndex}
      >
        {STROOP_COLOR_LABELS_FA[trial.word]}
      </div>

      {flash !== null ? (
        <div className={styles.flashPill} role="status">
          {flash.correct
            ? 'درست ✓'
            : `رنگ جوهر: ${STROOP_COLOR_LABELS_FA[flash.ink]}`}
        </div>
      ) : null}

      <div className={styles.answerRow} role="group" aria-label="انتخاب رنگ جوهر">
        {STROOP_COLORS.map((key) => (
          <button
            key={key}
            type="button"
            className={styles.colorButton}
            data-color={key}
            onClick={() => answer(key)}
            disabled={ctx.paused || flash !== null}
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
