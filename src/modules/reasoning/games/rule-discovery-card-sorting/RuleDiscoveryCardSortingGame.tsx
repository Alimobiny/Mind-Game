import { useEffect, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import { useTrialGuards } from '../../../../components/game/useTrialGuards'
import gameStyles from '../../../../components/game/game.module.css'
import type { CardStimulus, RuleDiscoveryTrial } from './engine'
import { REF_CARDS } from './engine'
import styles from './rule-discovery-card-sorting.module.css'
import { e2e } from '../../../../utils/e2e'

/**
 * کارت‌بندی قاعده — UI
 *
 * چهار کارت مرجع بالا ثابت‌اند؛ کارت جدید پایین می‌آید و با لمس یکی از چهار
  * جایگاه زیر کارت‌های مرجع دسته‌بندی می‌شود. پس از ثبت، فلش بازخوردِ درون‌بازی
 * (که در سطح ۵ ممکن است گمراه‌کننده باشد) برای feedbackMs می‌ماند و بعد
 * مرحلهٔ بعد می‌آید — advance با تأخیر، ولی فقط تا قبل از sessionCompleted.
 * هر سه گارد الزامی (قفل پاسخ · advance امن پس از sessionCompleted ناپذیر ·
 * تایمرهای ردیابی‌شده + re-arm مهلت) در useTrialGuards است.
 */

/** رنگ‌ها: قرمز، سبز، آبی، زرد */
const CARD_COLORS: readonly string[] = ['#ef4444', '#22c55e', '#3b82f6', '#eab308']
/** شکل‌ها: مثلث، ستاره، ضربدر، دایره — گلیف‌های خنثی */
const CARD_SHAPES: readonly string[] = ['▲', '★', '✕', '●']

function CardFace({ card, large }: { card: CardStimulus; large?: boolean }) {
  return (
    <div className={`${styles.card} ${large ? styles.cardLarge : ''}`} aria-hidden="true">
      {Array.from({ length: card.count + 1 }, (_, i) => (
        <span
          key={i}
          className={large ? styles.glyphLarge : styles.glyph}
          style={{ color: CARD_COLORS[card.color] }}
        >
          {CARD_SHAPES[card.shape]}
        </span>
      ))}
    </div>
  )
}

interface FeedbackState {
  readonly shownCorrect: boolean
  readonly omission: boolean
}

export function RuleDiscoveryCardSortingGame({ ctx }: { ctx: ActiveGameContext }) {
  const trial = ctx.trial as RuleDiscoveryTrial
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const guards = useTrialGuards(ctx, trial.trialIndex)

  useEffect(() => {
    setFeedback(null)

    // انقضای پنجرهٔ پاسخ → بی‌پاسخ و کارت بعد (با re-arm پس از rollback در
    // useTrialGuards)
    const remaining = ctx.timeRemainingMs()
    if (remaining !== null) {
      guards.armDeadline(() => null, remaining, {
        onAccepted: (result) => {
          showFeedbackThenAdvance(
            result.record as { stimulus: { shownCorrect: boolean } },
            result.sessionCompleted,
            true,
          )
        },
        autoAdvance: false,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trial.trialIndex])

  /** فلش بازخورد درون‌بازی و سپس کارت بعد — advance فقط تا قبل از پایان جلسه */
  const showFeedbackThenAdvance = (
    record: { stimulus: { shownCorrect: boolean } },
    sessionCompleted: boolean,
    omission: boolean,
  ) => {
    setFeedback({ shownCorrect: record.stimulus.shownCorrect, omission })
    guards.setTrackedTimeout(() => {
      setFeedback(null)
      if (!sessionCompleted) {
        try {
          ctx.advance()
        } catch {
          // جلسه هم‌زمان تمام/قطع شده — بی‌اثر
        }
      }
    }, trial.feedbackMs)
  }

  const choose = (pileIndex: number) => {
    if (ctx.paused) return
    void guards.submitOnce(pileIndex, {
      onAccepted: (result) => {
        showFeedbackThenAdvance(
          result.record as { stimulus: { shownCorrect: boolean } },
          result.sessionCompleted,
          false,
        )
      },
      autoAdvance: false,
    })
  }

  return (
    <div className={styles.stage}>
      <p className={gameStyles.hint}>کارت پایین را زیر کارت مرجع درست بگذار</p>

      <div
        className={styles.board}
        data-testid="wcs-board"
        data-expected={e2e(trial.correctPile)}
        data-active-rule={e2e(trial.activeRule)}
        data-card={`${trial.card.color}-${trial.card.shape}-${trial.card.count}`}
      >
        <div className={styles.currentCardArea}>
          <CardFace card={trial.card} large />
          {feedback ? (
            <div
              className={`${styles.feedbackFlash} ${
                feedback.omission
                  ? styles.feedbackNone
                  : feedback.shownCorrect
                    ? styles.feedbackCorrect
                    : styles.feedbackWrong
              }`}
              data-testid="wcs-feedback"
              data-shown-correct={feedback.shownCorrect ? 'true' : 'false'}
              data-omission={feedback.omission ? 'true' : 'false'}
            >
              {feedback.omission ? 'بی‌پاسخ' : feedback.shownCorrect ? 'درست ✓' : 'غلط ✗'}
            </div>
          ) : null}
        </div>

        <div className={styles.pilesRow} role="group" aria-label="کارت‌های مرجع">
          {REF_CARDS.map((ref, i) => (
            <div key={i} className={styles.pileColumn}>
              <CardFace card={ref} />
              <button
                type="button"
                className={styles.pileButton}
                data-testid="wcs-pile"
                data-pile-index={i}
                onClick={() => choose(i)}
                disabled={feedback !== null}
                aria-label={`زیر کارت مرجع ${i + 1}`}
              >
                بگذار
              </button>
            </div>
          ))}
        </div>
      </div>

      <p className={gameStyles.hint}>قاعده را از بازخوردها کشف کن — و وقتی عوض شد، از قاعدهٔ قبلی چشم‌پوشی کن</p>
    </div>
  )
}
