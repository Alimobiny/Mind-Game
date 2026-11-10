import { useCallback, useEffect, useRef, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import gameStyles from '../../../../components/game/game.module.css'
import { toFaDigits } from '../../../../utils/format'
import type { WordMemoryTrial } from './engine'
import styles from './word-memory.module.css'

/**
 * Word Memory (حافظه واژه‌ها) — UI
 *
 * فازهای هر مرحله: مطالعه واژه‌ها یکی‌یکی → انتخاب همان واژه‌ها از میان
 * ۲N گزینه → بازخورد رنگی (سبز = درست، زرد = از قلم انداخته، قرمز = اشتباه)
 * → مرحله بعد.
 * منطق کاملاً در engine است؛ این کامپوننت فقط رندر و ورودی.
 */
type Phase = 'study' | 'recall' | 'feedback'

export function WordMemoryGame({ ctx }: { ctx: ActiveGameContext }) {
  const trial = ctx.trial as WordMemoryTrial
  const studyCount = trial.studyWords.length
  const [phase, setPhase] = useState<Phase>('study')
  const [shownWord, setShownWord] = useState<string | null>(trial.studyWords[0] ?? null)
  const [wordIndex, setWordIndex] = useState(0)
  const [selected, setSelected] = useState<string[]>([])
  const [wasCorrect, setWasCorrect] = useState(false)
  const timeoutsRef = useRef<number[]>([])

  const clearTimers = useCallback(() => {
    for (const t of timeoutsRef.current) window.clearTimeout(t)
    timeoutsRef.current = []
  }, [])

  // ریست فازها با شروع هر مرحله جدید + زمان‌بندی نمایش واژه‌ها:
  // هر واژه به‌مدت displayMsPerWord دیده می‌شود و gapMs فاصله تا بعدی
  useEffect(() => {
    setPhase('study')
    setShownWord(trial.studyWords[0] ?? null)
    setWordIndex(0)
    setSelected([])
    setWasCorrect(false)
    clearTimers()
    const { displayMsPerWord: display, gapMs: gap } = trial
    const timers: number[] = []
    trial.studyWords.forEach((word, i) => {
      const startAt = i * (display + gap)
      timers.push(
        window.setTimeout(() => {
          setWordIndex(i)
          setShownWord(word)
        }, startAt),
      )
      timers.push(window.setTimeout(() => setShownWord(null), startAt + display))
    })
    // پایان نمایش همه واژه‌ها → فاز بازخوانی
    timers.push(
      window.setTimeout(() => setPhase('recall'), trial.studyWords.length * (display + gap)),
    )
    timeoutsRef.current = timers
    return clearTimers
    // trial.trialIndex دقیقاً با شروع مرحله جدید تغییر می‌کند
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trial.trialIndex, clearTimers])

  const toggleWord = (word: string) => {
    if (phase !== 'recall' || ctx.paused) return
    setSelected((current) =>
      current.includes(word)
        ? current.filter((w) => w !== word)
        : current.length >= studyCount
          ? current
          : [...current, word],
    )
  }

  const submit = async () => {
    if (phase !== 'recall' || ctx.paused || selected.length !== studyCount) return
    const result = await ctx.submit(selected)
    setWasCorrect(result.accepted ? result.record.correct : false)
    setPhase('feedback')
    // بازخورد کوتاه رنگی، سپس مرحله بعد
    timeoutsRef.current.push(window.setTimeout(() => ctx.advance(), 1300))
  }

  if (phase === 'study') {
    return (
      <>
        <div className={styles.studyArea}>
          <div className={styles.studyWord} aria-live="polite" data-testid="wm-study-word">
            {shownWord ?? ''}
          </div>
        </div>
        <p className={gameStyles.hint}>
          کلمه {toFaDigits(wordIndex + 1)} از {toFaDigits(studyCount)} — واژه‌ها را به خاطر بسپار
        </p>
      </>
    )
  }

  const studySet = new Set(trial.studyWords)
  const selectedSet = new Set(selected)

  return (
    <>
      <div className={styles.wordGrid} role="group" aria-label="واژه‌های بازخوانی">
        {trial.recallOptions.map((word) => {
          let cls = styles.wordButton
          if (phase === 'recall' && selectedSet.has(word)) {
            cls = `${styles.wordButton} ${styles.selected}`
          } else if (phase === 'feedback') {
            const isStudy = studySet.has(word)
            const isPicked = selectedSet.has(word)
            if (isStudy && isPicked) cls = `${styles.wordButton} ${styles.hit}`
            else if (isStudy) cls = `${styles.wordButton} ${styles.miss}`
            else if (isPicked) cls = `${styles.wordButton} ${styles.falseAlarm}`
            else cls = `${styles.wordButton} ${styles.dim}`
          }
          return (
            <button
              type="button"
              key={word}
              className={cls}
              onClick={() => toggleWord(word)}
              disabled={phase !== 'recall'}
              aria-pressed={phase === 'recall' && selectedSet.has(word)}
              data-testid="wm-word-option"
            >
              {word}
            </button>
          )
        })}
      </div>
      {phase === 'recall' ? (
        <>
          <p className={gameStyles.hint}>
            {toFaDigits(selected.length)} از {toFaDigits(studyCount)} واژه انتخاب شد
          </p>
          <button
            type="button"
            className={gameStyles.primaryButton}
            onClick={() => void submit()}
            disabled={selected.length !== studyCount}
            data-testid="wm-confirm"
          >
            تأیید
          </button>
        </>
      ) : null}
      {phase === 'feedback' ? (
        <div
          className={`${gameStyles.feedback} ${wasCorrect ? gameStyles.feedbackCorrect : gameStyles.feedbackIncorrect}`}
        >
          {wasCorrect ? 'کامل و درست!' : 'دقیق نبود'}
        </div>
      ) : null}
    </>
  )
}
