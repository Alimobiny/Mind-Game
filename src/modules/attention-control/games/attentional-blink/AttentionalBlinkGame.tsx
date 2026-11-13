import { useEffect, useMemo, useRef, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import gameStyles from '../../../../components/game/game.module.css'
import type { AttentionalBlinkTrial } from './engine'
import styles from './attentional-blink.module.css'

/**
 * Attentional Blink — UI
 *
 * فازهای هر مرحله: جریان سریع حروف (هر آیتم itemMs) → انتخاب دو هدف از
 * جدول حروف (اول هدف روشن‌آبی، بعد هدف سبز) → فلش بازخورد کوتاه →
 * مرحلهٔ بعد. زمان‌بندی کاملاً تایمری و مونت‌محور است؛ با مکث/ریمانت،
 * جریان از ابتدا دوباره پخش می‌شود (پاسخ ثبت‌شده از دست نمی‌رود).
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
  const timeoutsRef = useRef<number[]>([])
  const submittedRef = useRef(false)
  // آینهٔ رندرِ مرحلهٔ جاری — گارد کهنگی تایمر پیشرویِ پس از بازخورد
  const currentTrialRef = useRef(trial.trialIndex)
  currentTrialRef.current = trial.trialIndex

  // ریست با شروع هر جریان جدید + زمان‌بندی RSVP: آیتم i در [i×itemMs)
  useEffect(() => {
    submittedRef.current = false
    setPhase('stream')
    setItemIndex(-1)
    setPicks([])
    setWasCorrect(null)
    for (const t of timeoutsRef.current) window.clearTimeout(t)
    timeoutsRef.current = []

    // رفع ریس pause بین پذیرش پاسخ و advance (الگوی محاسبه ×۲۰)
    const outcome = ctx.lastOutcome
    if (outcome !== null && outcome.trialIndex === trial.trialIndex) {
      submittedRef.current = true
      try {
        ctx.advance()
      } catch {
        // جلسه هم‌زمان قطع/تکمیل شده
      }
      return
    }

    const timers: number[] = [window.setTimeout(() => setItemIndex(0), FIXATION_MS)]
    trial.stream.forEach((_, i) => {
      if (i > 0) timers.push(window.setTimeout(() => setItemIndex(i), FIXATION_MS + i * trial.itemMs))
    })
    timers.push(
      window.setTimeout(
        () => setPhase('recall'),
        FIXATION_MS + trial.stream.length * trial.itemMs,
      ),
    )
    timeoutsRef.current = timers
    return () => {
      for (const t of timeoutsRef.current) window.clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trial.trialIndex])

  // جدول بازیابی — حروف جریان به ترتیب تصادفی (ترتیب اصلی لو نمی‌رود)
  const gridLetters = useMemo(() => {
    const letters = trial.stream.map((item) => item.letter)
    for (let i = letters.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      const tmp = letters[i] as string
      letters[i] = letters[j] as string
      letters[j] = tmp
    }
    return letters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trial.trialIndex])

  const pick = (letter: string) => {
    if (phase !== 'recall' || picks.length >= 2 || picks.includes(letter)) return
    setPicks((current) => [...current, letter])
  }

  const submit = async () => {
    if (submittedRef.current || phase !== 'recall' || picks.length !== 2) return
    submittedRef.current = true
    const [t1, t2] = picks as [string, string]
    const result = await ctx.submit({ t1, t2 })
    if (!result.accepted) {
      submittedRef.current = false
      return
    }
    if (result.sessionCompleted) {
      setWasCorrect(result.record.correct)
      setPhase('feedback')
      return
    }
    setWasCorrect(result.record.correct)
    setPhase('feedback')
    // تایمر پیشروی با گارد کهنگی: اگر مکثِ وسط پنجرهٔ IDB ریمانت ساخته
    // باشد، فیکس ریس pause خودش پیشروی کرده و این تایمر کهنه بی‌اثر می‌ماند
    timeoutsRef.current.push(
      window.setTimeout(() => {
        if (currentTrialRef.current !== trial.trialIndex) return
        try {
          ctx.advance()
        } catch {
          // جلسه هم‌زمان قطع/تکمیل شده
        }
      }, FEEDBACK_MS),
    )
  }

  if (phase === 'stream') {
    const item = itemIndex >= 0 ? trial.stream[itemIndex] : null
    return (
      <>
        <div className={styles.streamStage} data-testid="ab-stream" data-lag={trial.lag}>
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
        data-t1={trial.t1}
        data-t2={trial.t2}
        data-lag={trial.lag}
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
