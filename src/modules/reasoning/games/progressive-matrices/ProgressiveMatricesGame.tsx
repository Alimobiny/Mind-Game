import { useEffect, useRef, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import { useTrialGuards } from '../../../../components/game/useTrialGuards'
import gameStyles from '../../../../components/game/game.module.css'
import { toFaDigits } from '../../../../utils/format'
import type { PmCell, ProgressiveMatricesTrial } from './engine'
import styles from './progressive-matrices.module.css'
import { e2e } from '../../../../utils/e2e'

/** کلید رنگ → رنگ CSS برای ترسیم شکل‌ها */
const CELL_CSS_COLORS: Readonly<Record<PmCell['color'], string>> = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
}

const COLORS_FA: Readonly<Record<PmCell['color'], string>> = {
  red: 'قرمز',
  blue: 'آبی',
  green: 'سبز',
}

/** ترسیم یک خانه: «count» شکل کوچک با SVG — همان زبان بصری تکمیل الگو */
function CellArt({ cell }: { readonly cell: PmCell }) {
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
 * Progressive Matrices — UI
 *
 * ماتریس ۳×۳ قاعده‌محور (خانهٔ پایین-راست خالی) + چهار گزینهٔ ۲×۲.
 * بازی غیرزمانی است: با انتخاب گزینه، پاسخ ثبت و بلافاصله مرحلهٔ بعد
 * می‌آید؛ نتیجه با نشان شناور دیده می‌شود (رفتار زمانی دست‌نخورده).
 * سه گارد الزامی (قفل/advance امن/rollback) در useTrialGuards است.
 */
export function ProgressiveMatricesGame({ ctx }: { ctx: ActiveGameContext }) {
  const trial = ctx.trial as ProgressiveMatricesTrial
  const [badge, setBadge] = useState<'correct' | 'wrong' | null>(null)
  const badgeTimerRef = useRef<number | null>(null)
  const guards = useTrialGuards(ctx, trial.trialIndex)

  // پاک‌سازی تایمر نشان شناور فقط در unmount (بدون دست بردن به نشان در
  // تغییر مرحله — پاک‌سازی تایمر نشان، محوشدنش را می‌کشت و می‌چسبید)
  useEffect(
    () => () => {
      if (badgeTimerRef.current !== null) window.clearTimeout(badgeTimerRef.current)
    },
    [],
  )

  const flashBadge = (correct: boolean) => {
    setBadge(correct ? 'correct' : 'wrong')
    if (badgeTimerRef.current !== null) window.clearTimeout(badgeTimerRef.current)
    badgeTimerRef.current = window.setTimeout(() => setBadge(null), 900)
  }

  const choose = (index: number) => {
    if (ctx.paused) return
    void guards.submitOnce(index, {
      onAccepted: (result) => flashBadge(result.record.correct),
    })
  }

  return (
    <div className={styles.stage}>
      {badge !== null ? (
        <span className={gameStyles.floatingBadge} aria-live="polite">
          <span
            className={`${gameStyles.floatingBadgeInner} ${
              badge === 'correct' ? gameStyles.floatingBadgeCorrect : gameStyles.floatingBadgeWrong
            }`}
          >
            {badge === 'correct' ? 'درست ✓' : 'غلط ✗'}
          </span>
        </span>
      ) : null}
      <p className={gameStyles.hint}>
        قاعدهٔ سطرها و ستون‌ها را پیدا کن و خانهٔ خالی را کامل کن
      </p>

      <div className={styles.matrix} data-testid="pm-matrix" aria-label="ماتریس پیشرونده">
        {trial.matrix.map((cell, i) =>
          cell === null ? (
            <div key={i} className={`${styles.cell} ${styles.emptyCell}`} data-testid="pm-empty-cell">
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
            data-testid="pm-option"
            data-index={index}
            data-correct={e2e(index === trial.correctIndex ? 'true' : 'false')}
            onClick={() => choose(index)}
            disabled={ctx.paused}
            aria-label={`گزینه ${toFaDigits(index + 1)}: ${toFaDigits(option.count)} ${COLORS_FA[option.color]}`}
          >
            <CellArt cell={option} />
          </button>
        ))}
      </div>
    </div>
  )
}
