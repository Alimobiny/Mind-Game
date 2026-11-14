import { useEffect, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import { useTrialGuards } from '../../../../components/game/useTrialGuards'
import gameStyles from '../../../../components/game/game.module.css'
import { toFaDigits } from '../../../../utils/format'
import { scheduleCadence } from '../../../shared/presentation-resume'
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
  const [shownWord, setShownWord] = useState<string | null>(null)
  const [wordIndex, setWordIndex] = useState(0)
  const [selected, setSelected] = useState<string[]>([])
  const [wasCorrect, setWasCorrect] = useState(false)
  const guards = useTrialGuards(ctx, trial.trialIndex)

  // شروع فاز پاسخ را در مدیر علامت بزن — RT از بازشدن جدول انتخاب سنجیده
  // شود نه از شروع مطالعهٔ واژه‌ها (§۲-۲ ممیزی). idempotent؛ مسیر بازنصب مکث هم پوشش دارد.
  useEffect(() => {
    if (phase === 'recall') ctx.beginResponsePhase()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ریست فازها با شروع هر مرحله جدید + زمان‌بندی نمایش واژه‌ها:
  // هر واژه به‌مدت displayMsPerWord دیده می‌شود و gapMs فاصله تا بعدی.
  // بازنصبِ پس از مکث (PAUSED=unmount): مطالعه از زمانِ سپری‌شدهٔ جلسه
  // ادامه می‌یابد نه از صفر — بازپخش فهرست واژه‌ها، دوبار-دیدن محرک و
  // بایاس صعودی بود (GAMES-AUDIT §۲-۱)
  useEffect(() => {
    // رفع ریس pause بین پذیرش پاسخ و advance (الگوی محاسبه ×۲۰): پاسخِ
    // ثبت‌شدهٔ بدون پیشروی را در بازنصب بلافاصله جلو ببر تا جلسه قفل نماند
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
    const saved = interrupted ? ctx.trialPresentation.get<string[]>('selected') : undefined
    setSelected(saved ?? [])
    setWasCorrect(false)
    setShownWord(null)
    setWordIndex(0)

    const { displayMsPerWord: display, gapMs: gap } = trial
    const totalMs = trial.studyWords.length * (display + gap)
    const finishStudy = () => {
      setShownWord(null)
      setPhase('recall')
    }
    const timers = scheduleCadence(
      trial.studyWords.map((word, i) => ({
        startAt: i * (display + gap),
        displayMs: display,
        onShow: () => {
          setWordIndex(i)
          setShownWord(word)
        },
        onHide: () => setShownWord((current) => (current === word ? null : current)),
      })),
      totalMs,
      finishStudy,
      elapsedMs,
    )
    if (elapsedMs >= totalMs) {
      // مطالعه تمام شده بود — مستقیم به بازخوانی
      setPhase('recall')
    } else {
      setPhase('study')
    }
    for (const t of timers) guards.trackTimeoutId(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trial.trialIndex])

  const toggleWord = (word: string) => {
    if (phase !== 'recall' || ctx.paused) return
    const next = selected.includes(word)
      ? selected.filter((w) => w !== word)
      : selected.length >= studyCount
        ? selected
        : [...selected, word]
    // نجات انتخاب‌ها برای بازنصبِ مکث
    ctx.trialPresentation.set('selected', next)
    setSelected(next)
  }

  const submit = () => {
    if (phase !== 'recall' || ctx.paused || selected.length !== studyCount) return
    void guards.submitOnce(selected, {
      onAccepted: (result) => {
        setWasCorrect(result.record.correct)
        setPhase('feedback')
        // بازخورد کوتاه رنگی، سپس مرحله بعد — تایمر ردیابی‌شده + مهار خطای
        // جلسهٔ هم‌زمان قطع/تکمیل
        guards.setTrackedTimeout(() => {
          try {
            ctx.advance()
          } catch {
            // جلسه هم‌زمان قطع/تکمیل شده
          }
        }, 1300)
      },
      autoAdvance: false,
    })
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
          className={`${gameStyles.feedback} ${wasCorrect ? gameStyles.feedbackCorrect : gameStyles.feedbackIncorrect} ${styles.feedbackBanner} ${
            wasCorrect ? '' : styles.feedbackBannerWrong
          }`}
        >
          {wasCorrect ? 'کامل و درست!' : 'دقیق نبود'}
        </div>
      ) : null}
    </>
  )
}
