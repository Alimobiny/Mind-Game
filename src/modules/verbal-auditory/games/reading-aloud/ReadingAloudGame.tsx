import { useEffect, useRef, useState } from 'react'
import type { ActiveGameContext } from '../../../../components/game/GameShell'
import { useTrialGuards } from '../../../../components/game/useTrialGuards'
import gameStyles from '../../../../components/game/game.module.css'
import { toFaDigits } from '../../../../utils/format'
import type { ReadingAloudTrial } from './engine'
import styles from './reading-aloud.module.css'
import { e2e } from '../../../../utils/e2e'

/**
 * بلندخوانی — UI
 *
 * ماشین فاز درون‌مرحله‌ای: نمایش متن → خواندن (زمان‌سنج خودتنظیم، بدون
 * میکروفون) → سؤال‌های فهم (متن پنهان است تا حافظه سنجیده شود) → یک submit
 * با زمان خواندن و همهٔ پاسخ‌ها — قرارداد یک-submit-per-trial.
 * هر سه گارد الزامی در useTrialGuards است.
 *
 * مکث (PAUSED=unmount): فاز + زمان خوانده‌شده + پاسخ‌ها در
 * trialPresentation نجات داده می‌شوند و بازنصب از همان نقطه ادامه می‌یابد —
 * پیش‌تر همه‌چیز پاک و کاربر از idle شروع می‌کرد (ازدست‌رفتن داده، GAMES-AUDIT §۲-۱).
 */

type Phase = 'idle' | 'reading' | 'questions'

/** پیشرفت نجات‌یافتهٔ مرحله برای بازنصبِ پس از مکث */
interface ReadingProgress {
  readonly phase: Phase
  /** زمان خواندن تا لحظهٔ مکث (ms) — مکثِ خودِ کاربر؛ سشن عملاً pause بود */
  readonly readingMs: number
  readonly answers: readonly (number | null)[]
}

export function ReadingAloudGame({ ctx }: { ctx: ActiveGameContext }) {
  const trial = ctx.trial as ReadingAloudTrial
  const [phase, setPhase] = useState<Phase>('idle')
  const [elapsedSec, setElapsedSec] = useState(0)
  const [answers, setAnswers] = useState<readonly (number | null)[]>(
    trial.questions.map(() => null),
  )
  const guards = useTrialGuards(ctx, trial.trialIndex)
  /** زنجیرهٔ زمان‌سنج خواندن — جدا از تایمرهای گارد چون interval است */
  const intervalRef = useRef<number | null>(null)
  const readStartRef = useRef(0)
  const readingMsRef = useRef(0)

  const stopTicker = () => {
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current)
    intervalRef.current = null
  }

  useEffect(() => stopTicker, [])

  const saveProgress = (currentPhase: Phase, currentReadingMs: number, currentAnswers: readonly (number | null)[]) => {
    ctx.trialPresentation.set('progress', {
      phase: currentPhase,
      readingMs: currentReadingMs,
      answers: [...currentAnswers],
    } satisfies ReadingProgress)
  }

  // ریست با شروع هر مرحله — یا بازگردانی از پیشرفتِ نجات‌یافتهٔ مکث
  useEffect(() => {
    const interrupted = ctx.trialPresentation.wasInterrupted()
    const saved = interrupted ? ctx.trialPresentation.get<ReadingProgress>('progress') : undefined
    stopTicker()
    if (saved && saved.phase === 'reading') {
      // مکث وسط خواندن: زمان‌سنج از همان ثانیه ادامه می‌یابد (زمان مکث
      // در readingMs نمی‌نشیند — خواندنِ پس از مکث تازه شمارش می‌شود)
      readingMsRef.current = saved.readingMs
      readStartRef.current = performance.now()
      setElapsedSec(Math.floor(saved.readingMs / 1000))
      setAnswers(saved.answers ?? trial.questions.map(() => null))
      setPhase('reading')
      intervalRef.current = window.setInterval(() => {
        setElapsedSec(
          Math.floor((readingMsRef.current + (performance.now() - readStartRef.current)) / 1000),
        )
      }, 1000)
      return
    }
    if (saved && saved.phase === 'questions') {
      readingMsRef.current = saved.readingMs
      setElapsedSec(Math.floor(saved.readingMs / 1000))
      setAnswers(saved.answers ?? trial.questions.map(() => null))
      setPhase('questions')
      return
    }
    readingMsRef.current = 0
    setPhase('idle')
    setElapsedSec(0)
    setAnswers(trial.questions.map(() => null))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trial.trialIndex])

  const startReading = () => {
    if (guards.isSubmitted() || ctx.paused) return
    readStartRef.current = performance.now()
    readingMsRef.current = 0
    setPhase('reading')
    saveProgress('reading', 0, trial.questions.map(() => null))
    intervalRef.current = window.setInterval(() => {
      setElapsedSec(
        Math.floor((readingMsRef.current + (performance.now() - readStartRef.current)) / 1000),
      )
    }, 1000)
  }

  const finishReading = () => {
    if (guards.isSubmitted() || ctx.paused) return
    if (phase !== 'reading') return
    stopTicker()
    readingMsRef.current = Math.round(readingMsRef.current + (performance.now() - readStartRef.current))
    setPhase('questions')
    saveProgress('questions', readingMsRef.current, trial.questions.map(() => null))
  }

  const choose = (questionIndex: number, choiceIndex: number) => {
    if (guards.isSubmitted() || ctx.paused) return
    if (phase !== 'questions') return
    const next = answers.map((a, i) => (i === questionIndex ? choiceIndex : a))
    setAnswers(next)
    saveProgress('questions', readingMsRef.current, next)
  }

  const allAnswered = answers.every((a) => a !== null)

  const submit = () => {
    if (guards.isSubmitted() || ctx.paused) return
    if (phase !== 'questions' || !allAnswered) return
    void guards.submitOnce({ readingMs: readingMsRef.current, answers })
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
                      data-correct={e2e(ci === question.correctIndex ? 'true' : 'false')}
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
