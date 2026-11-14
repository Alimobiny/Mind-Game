import { useEffect, useRef, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import gameStyles from '../../../../components/game/game.module.css'
import { toFaDigits } from '../../../../utils/format'
import type { ReadingAloudTrial } from './engine'
import styles from './reading-aloud.module.css'

/**
 * بلندخوانی — UI
 *
 * ماشین فاز درون‌مرحله‌ای: نمایش متن → خواندن (زمان‌سنج خودتنظیم، بدون
 * میکروفون) → سؤال‌های فهم (متن پنهان است تا حافظه سنجیده شود) → یک submit
 * با زمان خواندن و همهٔ پاسخ‌ها — قرارداد یک-submit-per-trial.
 * هر سه گارد الزامی رعایت شده است (قفل submittedRef · advance فقط تا قبل
 * از sessionCompleted · همهٔ تایمرها در ref با پاک‌سازی).
 */

type Phase = 'idle' | 'reading' | 'questions'

export function ReadingAloudGame({ ctx }: { ctx: ActiveGameContext }) {
  const trial = ctx.trial as ReadingAloudTrial
  const [phase, setPhase] = useState<Phase>('idle')
  const [elapsedSec, setElapsedSec] = useState(0)
  const [answers, setAnswers] = useState<readonly (number | null)[]>(
    trial.questions.map(() => null),
  )
  const timersRef = useRef<number[]>([])
  const submittedRef = useRef(false)
  const readStartRef = useRef(0)
  const readingMsRef = useRef(0)

  useEffect(() => {
    submittedRef.current = false
    setPhase('idle')
    setElapsedSec(0)
    setAnswers(trial.questions.map(() => null))
    for (const t of timersRef.current) window.clearInterval(t)
    timersRef.current = []
    return () => {
      for (const t of timersRef.current) window.clearInterval(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trial.trialIndex])

  const startReading = () => {
    if (submittedRef.current || ctx.paused) return
    readStartRef.current = performance.now()
    setPhase('reading')
    timersRef.current.push(
      window.setInterval(() => {
        setElapsedSec(Math.round((performance.now() - readStartRef.current) / 1000))
      }, 1000),
    )
  }

  const finishReading = () => {
    if (submittedRef.current || ctx.paused) return
    if (phase !== 'reading') return
    for (const t of timersRef.current) window.clearInterval(t)
    timersRef.current = []
    readingMsRef.current = Math.round(performance.now() - readStartRef.current)
    setPhase('questions')
  }

  const choose = (questionIndex: number, choiceIndex: number) => {
    if (submittedRef.current || ctx.paused) return
    if (phase !== 'questions') return
    setAnswers((current) =>
      current.map((a, i) => (i === questionIndex ? choiceIndex : a)),
    )
  }

  const allAnswered = answers.every((a) => a !== null)

  const submit = () => {
    if (submittedRef.current || ctx.paused) return
    if (phase !== 'questions' || !allAnswered) return
    submittedRef.current = true
    void ctx
      .submit({ readingMs: readingMsRef.current, answers })
      .then((result) => {
        if (result.accepted && !result.sessionCompleted) {
          try {
            ctx.advance()
          } catch {
            // جلسه هم‌زمان تمام/قطع شده — بی‌اثر
          }
        } else if (!result.accepted) {
          submittedRef.current = false
        }
      })
  }

  return (
    <div className={styles.stage}>
      {phase !== 'questions' ? (
        <div
          className={styles.passageCard}
          data-testid="ra-passage"
          data-words={trial.wordCount}
        >
          <p className={styles.passageText}>{trial.passage.text}</p>
          <p className={styles.passageMeta}>
            {toFaDigits(trial.wordCount)} واژه
            {phase === 'reading' ? ` · ${toFaDigits(elapsedSec)} ثانیه` : ''}
          </p>
        </div>
      ) : null}

      {phase === 'idle' ? (
        <div className={styles.actionRow}>
          <button type="button" className={styles.primaryButton} onClick={startReading} data-testid="ra-start">
            آماده‌ام — شروع خواندن
          </button>
        </div>
      ) : null}

      {phase === 'reading' ? (
        <div className={styles.actionRow}>
          <button type="button" className={styles.primaryButton} onClick={finishReading} data-testid="ra-done">
            خواندم — پایان خواندن
          </button>
        </div>
      ) : null}

      {phase === 'questions' ? (
        <div className={styles.questionsArea} data-testid="ra-questions">
          <p className={gameStyles.hint}>متن را به یاد بیار و پاسخ بده</p>
          {trial.questions.map((question, qi) => (
            <div key={qi} className={styles.questionBlock}>
              <p className={styles.questionPrompt}>{question.prompt}</p>
              <div className={styles.choiceGrid} role="group" aria-label={`سؤال ${toFaDigits(qi + 1)}`}>
                {question.choices.map((choice, ci) => {
                  const selected = answers[qi] === ci
                  return (
                    <button
                      key={ci}
                      type="button"
                      className={`${styles.choiceButton} ${selected ? styles.choiceSelected : ''}`}
                      data-testid="ra-option"
                      data-q-index={qi}
                      data-index={ci}
                      data-correct={ci === question.correctIndex ? 'true' : 'false'}
                      onClick={() => choose(qi, ci)}
                    >
                      {choice}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
          <div className={styles.actionRow}>
            <button
              type="button"
              className={gameStyles.keyWide}
              onClick={submit}
              disabled={!allAnswered}
              data-testid="ra-submit"
            >
              تأیید
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
