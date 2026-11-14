import { useEffect, useMemo, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import { useTrialGuards } from '../../../../components/game/useTrialGuards'
import gameStyles from '../../../../components/game/game.module.css'
import { SeededRandom } from '../../../../core/randomization/seeded-random'
import { scheduleCadence } from '../../../shared/presentation-resume'
import type { AttentionalBlinkTrial } from './engine'
import styles from './attentional-blink.module.css'
import { e2e } from '../../../../utils/e2e'

/**
 * Attentional Blink — UI
 *
 * فازهای هر مرحله: جریان سریع حروف (هر آیتم itemMs) → انتخاب دو هدف از
 * جدول حروف (اول هدف روشن‌آبی، بعد هدف سبز) → فلش بازخورد کوتاه →
 * مرحلهٔ بعد. بازنصبِ پس از مکث (PAUSED=unmount): جریان از زمانِ
 * سپری‌شدهٔ جلسه ادامه می‌یابد نه از ابتدا — بازپخش کل جریان RSVP،
 * دوبار-دیدن اهداف و بایاس صعودی بود (GAMES-AUDIT §۲-۱).
 */

/** نمایش ثابت پیش از شروع جریان (ms) */
const FIXATION_MS = 700
/** مدت فلش بازخورد پیش از پیشروی (ms) */
const FEEDBACK_MS = 750

export function AttentionalBlinkGame({ ctx }: { ctx: ActiveGameContext }) {
  const trial = ctx.trial as AttentionalBlinkTrial
  const [phase, setPhase] = useState<'stream' | 'recall' | 'feedback'>('stream')
  const [itemIndex, setItemIndex] = useState(-1)
  const [picks, setPicks] = useState<string[]>([])
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null)
  const guards = useTrialGuards(ctx, trial.trialIndex)

  // شروع فاز پاسخ را در مدیر علامت بزن — RT از بازشدن انتخاب اهداف سنجیده
  // شود نه از شروع جریان RSVP (§۲-۲ ممیزی). idempotent؛ مسیر بازنصب مکث هم پوشش دارد.
  useEffect(() => {
    if (phase === 'recall') ctx.beginResponsePhase()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ریست با شروع هر جریان جدید + زمان‌بندی RSVP: آیتم i در [FIXATION + i×itemMs)
  useEffect(() => {
    // رفع ریس pause بین پذیرش پاسخ و advance (الگوی محاسبه ×۲۰)
    const outcome = ctx.lastOutcome
    if (outcome !== null && outcome.trialIndex === trial.trialIndex) {
      try {
        ctx.advance()
      } catch {
        // جلسه هم‌زمان قطع/تکمیل شده
      }
      return
    }

    const interrupted = ctx.trialPresentation.wasInterrupted()
    const elapsedMs = interrupted ? ctx.trialElapsedMs() : 0
    const saved = interrupted ? ctx.trialPresentation.get<string[]>('picks') : undefined
    setPicks(saved ?? [])
    setWasCorrect(null)
    setItemIndex(-1)

    const totalMs = FIXATION_MS + trial.stream.length * trial.itemMs
    const timers = scheduleCadence(
      trial.stream.map((_, i) => ({
        startAt: FIXATION_MS + i * trial.itemMs,
        displayMs: trial.itemMs,
        onShow: () => setItemIndex(i),
        onHide: () => undefined,
      })),
      totalMs,
      () => {
        setItemIndex(-1)
        setPhase('recall')
      },
      elapsedMs,
    )
    if (elapsedMs >= totalMs) {
      // جریان تمام شده بود — مستقیم به بازیابی
      setItemIndex(-1)
      setPhase('recall')
    } else {
      setPhase('stream')
    }
    for (const t of timers) guards.trackTimeoutId(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trial.trialIndex])

  // جدول بازیابی — حروف جریان به ترتیب تصادفیِ «قطعی» از بذرِ مرحله
  // (ترتیب اصلی لو نمی‌رود؛ پیش‌تر Math.random بود و قطعیت قرارداد را می‌شکست)
  const gridLetters = useMemo(() => {
    const letters = trial.stream.map((item) => item.letter)
    let hash = 0x811c9dc5
    const key = `${trial.trialIndex}:${letters.join('')}`
    for (let i = 0; i < key.length; i += 1) {
      hash ^= key.charCodeAt(i)
      hash = Math.imul(hash, 0x01000193) >>> 0
    }
    const rng = new SeededRandom(hash)
    for (let i = letters.length - 1; i > 0; i -= 1) {
      const j = rng.int(0, i)
      const tmp = letters[i] as string
      letters[i] = letters[j] as string
      letters[j] = tmp
    }
    return letters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trial.trialIndex])

  const pick = (letter: string) => {
    if (phase !== 'recall' || picks.length >= 2 || picks.includes(letter)) return
    const next = [...picks, letter]
    // نجات انتخاب‌ها برای بازنصبِ مکث
    ctx.trialPresentation.set('picks', next)
    setPicks(next)
  }

  const submit = () => {
    if (phase !== 'recall' || picks.length !== 2) return
    const [t1, t2] = picks as [string, string]
    void guards.submitOnce({ t1, t2 }, {
      onAccepted: (result) => {
        setWasCorrect(result.record.correct)
        setPhase('feedback')
        // تایمر پیشروی — ردیابی‌شده؛ در تغییر مرحله/unmount پاک می‌شود
        guards.setTrackedTimeout(() => {
          try {
            ctx.advance()
          } catch {
            // جلسه هم‌زمان قطع/تکمیل شده
          }
        }, FEEDBACK_MS)
      },
      autoAdvance: false,
    })
  }

  if (phase === 'stream') {
    const item = itemIndex >= 0 ? trial.stream[itemIndex] : null
    return (
      <>
        <div className={styles.streamStage} data-testid="ab-stream" data-lag={e2e(trial.lag)}>
          {item === null ? (
            <span className={styles.fixation}>+</span>
          ) : (
            <span
              className={`${styles.item} ${
                item.role === 't1'
                  ? styles.itemT1
                  : item.role === 't2'
                    ? styles.itemT2
                    : styles.itemDistractor
              }`}
              data-testid="ab-item"
              data-role={item.role}
              key={`${trial.trialIndex}-${itemIndex}`}
            >
              <bdi>{item.letter}</bdi>
            </span>
          )}
        </div>
        <p className={gameStyles.hint}>
          دو هدف را پیدا کن: روشن‌آبی (هدف اول) و سبز (هدف دوم)
        </p>
      </>
    )
  }

  if (phase === 'recall') {
    return (
      <div
        className={styles.recallBox}
        data-testid="ab-recall"
        data-t1={e2e(trial.t1)}
        data-t2={e2e(trial.t2)}
        data-lag={e2e(trial.lag)}
      >
        <div className={styles.pickRow} aria-label="هدف‌های انتخاب‌شده">
          <span className={`${styles.pickChip} ${styles.pickT1}`}>
            هدف اول: {picks[0] ? <bdi>{picks[0]}</bdi> : '؟'}
          </span>
          <span className={`${styles.pickChip} ${styles.pickT2}`}>
            هدف دوم: {picks[1] ? <bdi>{picks[1]}</bdi> : '؟'}
          </span>
        </div>
        <p className={gameStyles.hint}>
          {picks.length === 0
            ? 'اول حرفِ هدف روشن‌آبی را انتخاب کن'
            : picks.length === 1
              ? 'حالا حرفِ هدف سبز را انتخاب کن'
              : 'هر دو انتخاب شد — تأیید کن'}
        </p>
        <div className={styles.letterGrid} role="group" aria-label="جدول حروف جریان">
          {gridLetters.map((letter) => (
            <button
              type="button"
              key={letter}
              className={`${styles.letterCell} ${picks.includes(letter) ? styles.letterPicked : ''}`}
              data-testid="ab-option"
              data-letter={letter}
              onClick={() => pick(letter)}
              disabled={picks.includes(letter)}
            >
              <bdi>{letter}</bdi>
            </button>
          ))}
        </div>
        <button
          type="button"
          className={gameStyles.primaryButton}
          data-testid="ab-submit"
          onClick={() => void submit()}
          disabled={picks.length !== 2}
        >
          تأیید
        </button>
      </div>
    )
  }

  // feedback — نشان نتیجه + هر دو هدف درست
  return (
    <div className={styles.feedbackBox}>
      <div className={`${gameStyles.feedback} ${wasCorrect ? gameStyles.feedbackCorrect : gameStyles.feedbackIncorrect}`}>
        {wasCorrect ? 'هر دو درست!' : 'نادرست'}
      </div>
      <div className={styles.targetRow} aria-label="هدف‌های درست">
        <span className={`${styles.pickChip} ${styles.pickT1}`}>
          هدف اول: <bdi>{trial.t1}</bdi>
        </span>
        <span className={`${styles.pickChip} ${styles.pickT2}`}>
          هدف دوم: <bdi>{trial.t2}</bdi>
        </span>
      </div>
    </div>
  )
}
