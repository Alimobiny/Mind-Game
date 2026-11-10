import { useEffect, useRef } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import gameStyles from '../../../../components/game/game.module.css'
import { toFaDigits } from '../../../../utils/format'
import { PATTERN_COLORS_FA, type PatternCell, type PatternCompletionTrial } from './engine'
import styles from './pattern-completion.module.css'

/** کلید رنگ → رنگ CSS برای ترسیم شکل‌ها */
const CELL_CSS_COLORS: Readonly<Record<PatternCell['color'], string>> = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
}

/**
 * ترسیم یک خانه الگو: «count» عدد شکل کوچک (دایره/مربع/مثلث) با SVG —
 * کاملاً هندسی و انتزاعی، بدون هیچ دارایی خارجی.
 */
function CellArt({ cell }: { readonly cell: PatternCell }) {
  const fill = CELL_CSS_COLORS[cell.color]
  return (
    <span className={styles.cellShapes} aria-hidden="true">
      {Array.from({ length: cell.count }, (_, i) => (
        <svg key={i} className={styles.shape} viewBox="0 0 24 24" focusable="false">
          {cell.shape === 'circle' ? (
            <circle cx="12" cy="12" r="9" fill={fill} />
          ) : cell.shape === 'square' ? (
            <rect x="4" y="4" width="16" height="16" rx="2" fill={fill} />
          ) : (
            <polygon points="12,3.5 21,20 3,20" fill={fill} />
          )}
        </svg>
      ))}
    </span>
  )
}

/**
 * Pattern Completion — UI
 *
 * ماتریس ۳×۳ الگو (خانه پایین-راست با «؟» خالی) + چهار گزینه ۲×۲.
 * بازی غیرزمانی است (responseWindowMs = null): با انتخاب گزینه، پاسخ
 * ثبت و بلافاصله مرحله بعد می‌آید. منطق کاملاً در engine است.
 */
export function PatternCompletionGame({ ctx }: { ctx: ActiveGameContext }) {
  const trial = ctx.trial as PatternCompletionTrial
  const submittedRef = useRef(false)

  // با هر مرحله جدید ریست می‌شود
  useEffect(() => {
    submittedRef.current = false
  }, [trial.trialIndex])

  const choose = (index: number) => {
    if (submittedRef.current || ctx.paused) return
    submittedRef.current = true
    void ctx.submit(index).then((result) => {
      if (result.accepted) ctx.advance()
    })
  }

  return (
    <div className={styles.stage}>
      <p className={gameStyles.hint}>خانه خالی با کدام گزینه کامل می‌شود؟</p>

      <div className={styles.matrix} data-testid="pattern-matrix" aria-label="ماتریس الگو">
        {trial.matrix.map((cell, i) =>
          cell === null ? (
            <div key={i} className={`${styles.cell} ${styles.emptyCell}`} data-testid="pattern-empty-cell">
              <span className={styles.questionMark}>؟</span>
            </div>
          ) : (
            <div key={i} className={styles.cell}>
              <CellArt cell={cell} />
            </div>
          ),
        )}
      </div>

      <div className={styles.options} role="group" aria-label="گزینه‌های پاسخ">
        {trial.options.map((option, index) => (
          <button
            key={index}
            type="button"
            className={styles.optionButton}
            data-testid="pattern-option"
            data-index={index}
            onClick={() => choose(index)}
            disabled={ctx.paused}
            aria-label={`گزینه ${toFaDigits(index + 1)}: ${toFaDigits(option.count)} ${PATTERN_COLORS_FA[option.color]}`}
          >
            <CellArt cell={option} />
          </button>
        ))}
      </div>
    </div>
  )
}
