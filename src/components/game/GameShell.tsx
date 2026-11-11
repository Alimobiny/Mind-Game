import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { ExerciseConfig, ExerciseTrial, RecordedTrial } from '../../core/types'
import type { RegisteredExercise } from '../../core/registry/game-registry'
import {
  computeAdaptiveDifficulty,
  describeStreakFa,
  toLocalIsoDate,
  ACCURACY_LEVEL_UP_THRESHOLD,
} from '../../core/difficulty/adaptive-difficulty'
import type { AdaptiveDifficultyResult } from '../../core/difficulty/adaptive-difficulty'
import {
  ExerciseSessionManager,
  type SessionManagerDeps,
  type SubmitResult,
} from '../../core/session/session-manager'
import { APP_TEXTS_FA, DOMAIN_LABELS_FA } from '../../i18n/fa'
import { toFaDigits } from '../../utils/format'
import styles from './game.module.css'

/** API‌ای که کامپوننت هر بازی هنگام اجرای ACTIVE دریافت می‌کند */
export interface ActiveGameContext {
  readonly trial: ExerciseTrial
  readonly answeredTrials: number
  submit: (answer: unknown) => Promise<SubmitResult>
  /** تولید مرحله بعدی — فقط بعد از پاسخ مرحله جاری */
  advance: () => ExerciseTrial
  readonly lastOutcome: RecordedTrial | null
  /** مهلت باقی‌مانده مرحله جاری (ms) یا null */
  timeRemainingMs: () => number | null
  /** توقف/ادامه — بازی‌های زمان‌بندی‌شده باید تایمرهای خود را با آن همگام کنند */
  pause: () => void
  readonly paused: boolean
}

export interface GameShellProps {
  readonly registered: RegisteredExercise
  /** config کامل بازی — با configForDifficulty بازیِ مربوط ساخته می‌شود */
  readonly config: ExerciseConfig
  /** وابستگی‌های ذخیره‌سازی — در تست‌ها in-memory تزریق می‌شود */
  readonly deps: Pick<SessionManagerDeps, 'sessions' | 'trialEvents' | 'settings'>
  /** render prop مرحله فعال */
  readonly renderTrial: (ctx: ActiveGameContext) => ReactNode
  readonly onExit: () => void
}

const COUNTDOWN_SECONDS = 3

export function GameShell({ registered, config, deps, renderTrial, onExit }: GameShellProps) {
  const managerRef = useRef<ExerciseSessionManager | null>(null)
  if (managerRef.current === null) {
    managerRef.current = new ExerciseSessionManager({
      definition: registered.definition,
      config,
      sessions: deps.sessions,
      trialEvents: deps.trialEvents,
      settings: deps.settings,
    })
  }
  const manager = managerRef.current

  // اتصال React به snapshot با re-render دستی — ساده و کافی برای MVP
  const [, setVersion] = useState(0)
  const rerender = useCallback(() => setVersion((v) => v + 1), [])
  useEffect(() => {
    const unsubscribe = manager.subscribe(rerender)
    return unsubscribe
  }, [manager, rerender])

  // شروع خودکار جلسه (IDLE → READY)
  useEffect(() => {
    // در React StrictMode دولوپمنت این افکت دوبار اجرا می‌شود؛
    // شروع دومِ همان manager باید بی‌اثر بماند نه unhandled rejection بسازد
    if (manager.getSnapshot().machine.phase === 'IDLE') {
      void manager.start()
    }
  }, [manager])

  const snapshot = manager.getSnapshot()
  const phase = snapshot.machine.phase

  // توقف خودکار وقتی صفحه مخفی می‌شود — پاسخ‌های پس‌زمینه نامعتبرند
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.hidden && manager.getSnapshot().machine.phase === 'ACTIVE') {
        manager.pause()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [manager])

  const [countdown, setCountdown] = useState<number | null>(null)
  // خروج دوتایی-تأیید: اولین ضربه حالت تأیید می‌سازد، دومی جلسه را قطع می‌کند
  const [confirmExit, setConfirmExit] = useState(false)
  const confirmExitTimer = useRef<number | null>(null)
  // وضعیت دشواری تطبیقی پس از پایان جلسه — برای بازخورد حد نصاب و رکورد
  const [postAdaptive, setPostAdaptive] = useState<AdaptiveDifficultyResult | null>(null)

  const requestExit = useCallback(() => {
    if (!confirmExit) {
      setConfirmExit(true)
      if (confirmExitTimer.current !== null) window.clearTimeout(confirmExitTimer.current)
      confirmExitTimer.current = window.setTimeout(() => setConfirmExit(false), 2500)
      return
    }
    setConfirmExit(false)
    void manager.abort()
  }, [confirmExit, manager])

  // پس از تکمیل جلسه، وضعیت ارتقای سطح را از تاریخچه محاسبه کن
  useEffect(() => {
    if (phase !== 'COMPLETED') return
    let cancelled = false
    void deps.sessions.listByExercise(registered.meta.id).then((history) => {
      if (cancelled) return
      setPostAdaptive(computeAdaptiveDifficulty(history, toLocalIsoDate(Date.now())))
    })
    return () => {
      cancelled = true
    }
  }, [phase, deps.sessions, registered.meta.id])

  const beginCountdown = useCallback(() => {
    manager.beginCountdown()
    setCountdown(COUNTDOWN_SECONDS)
  }, [manager])

  // شمارش معکوس
  useEffect(() => {
    if (phase !== 'COUNTDOWN' || countdown === null) return
    if (countdown === 0) {
      manager.beginActive()
      setCountdown(null)
      return
    }
    const timer = window.setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [phase, countdown, manager])

  const ctx = useMemo<ActiveGameContext | null>(() => {
    if (phase !== 'ACTIVE' || snapshot.currentTrial === null) return null
    return {
      trial: snapshot.currentTrial,
      answeredTrials: snapshot.answeredTrials,
      submit: (answer: unknown) => manager.submitAnswer(answer),
      advance: () => manager.advanceTrial(),
      lastOutcome: snapshot.lastOutcome,
      timeRemainingMs: () => manager.timeRemainingMs(),
      pause: () => manager.pause(),
      paused: snapshot.machine.phase === 'PAUSED',
    }
  }, [phase, snapshot.currentTrial, snapshot.answeredTrials, snapshot.lastOutcome, snapshot.machine.phase, manager])

  return (
    <section className={styles.shell} data-phase={phase}>
      <header className={styles.header}>
        <h1 className={styles.headerTitle}>{registered.meta.nameFa}</h1>
        {phase === 'ACTIVE' || phase === 'PAUSED' || phase === 'COUNTDOWN' ? (
          <div className={styles.headerActions}>
            <span
              className={styles.progress}
              aria-label={`مرحلهٔ ${toFaDigits(snapshot.answeredTrials)} از ${toFaDigits(registered.meta.plannedTrials ?? 0)}`}
            >
              مرحله {toFaDigits(snapshot.answeredTrials)} / {toFaDigits(registered.meta.plannedTrials ?? 0)}
            </span>
            <button
              type="button"
              className={`${styles.exitButton} ${confirmExit ? styles.exitConfirm : ''}`}
              onClick={requestExit}
              aria-label={confirmExit ? 'قطع جلسه — تأیید' : 'خروج از جلسه'}
            >
              {confirmExit ? 'قطع جلسه؟' : '✕'}
            </button>
          </div>
        ) : null}
      </header>

      {phase === 'READY' ? (
        <InstructionsScreen
          registered={registered}
          difficulty={config.difficulty}
          onStart={beginCountdown}
          onExit={() => {
            // خروج پیش از شروع: رکورد in_progressِ ساخته‌شده در start()
            // باید همین‌جا aborted شود، نه این که تا بوت بعدی زنده بماند
            void manager.abort()
            onExit()
          }}
        />
      ) : null}

      {phase === 'COUNTDOWN' && countdown !== null ? (
        <div className={styles.stage}>
          <p className={styles.hint}>{APP_TEXTS_FA.getReady}</p>
          <div className={styles.countdownNumber}>{toFaDigits(countdown)}</div>
        </div>
      ) : null}

      {phase === 'ACTIVE' && ctx ? <div className={styles.stage}>{renderTrial(ctx)}</div> : null}

      {phase === 'PAUSED' ? (
        <div className={styles.pauseOverlay} role="dialog" aria-label={APP_TEXTS_FA.sessionPaused}>
          <h2>{APP_TEXTS_FA.sessionPaused}</h2>
          <p className={styles.hint}>
            با مخفی‌شدن صفحه، تمرین متوقف شد تا زمان اندازه‌گیری‌شده سالم بماند.
          </p>
          <button type="button" className={styles.primaryButton} onClick={() => manager.resume()}>
            {APP_TEXTS_FA.resume}
          </button>
          <button type="button" className={styles.secondaryButton} onClick={requestExit}>
            خروج از جلسه
          </button>
        </div>
      ) : null}

      {phase === 'COMPLETED' && snapshot.summary ? (
        <ResultsScreen
          registered={registered}
          summary={snapshot.summary}
          onRetry={onExit}
          adaptive={postAdaptive}
          extraActions={
            <Link className={styles.secondaryButton} to="/reports">
              {APP_TEXTS_FA.reports}
            </Link>
          }
        />
      ) : null}

      {phase === 'ABORTED' ? (
        <div className={styles.stage}>
          <div className={styles.card}>
            <h2>{APP_TEXTS_FA.aborted}</h2>
            <p className={styles.hint}>{APP_TEXTS_FA.disclaimer}</p>
            <div className={styles.buttonRow} style={{ marginTop: 'var(--space-4)' }}>
              <button type="button" className={styles.primaryButton} onClick={onExit}>
                {APP_TEXTS_FA.exit}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

function InstructionsScreen({
  registered,
  difficulty,
  onStart,
  onExit,
}: {
  registered: RegisteredExercise
  difficulty: number
  onStart: () => void
  onExit: () => void
}) {
  return (
    <div className={`${styles.stage} ${styles.instructions}`} data-testid="instructions">
      <div className={styles.card}>
        <span className={styles.domainChip}>{DOMAIN_LABELS_FA[registered.meta.domain]}</span>
        <h2>{registered.meta.nameFa}</h2>
        <p className={styles.hint} style={{ textAlign: 'start' }}>
          {registered.meta.descriptionFa}
        </p>
        <ol className={styles.steps}>
          {registered.meta.instructionsFa.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p className={styles.hint}>
          {APP_TEXTS_FA.difficulty}: {toFaDigits(difficulty)} از {toFaDigits(5)}
        </p>
        <div className={styles.buttonRow} style={{ marginTop: 'var(--space-4)' }}>
          <button type="button" className={styles.primaryButton} onClick={onStart}>
            {APP_TEXTS_FA.startExercise}
          </button>
          <button type="button" className={styles.secondaryButton} onClick={onExit}>
            {APP_TEXTS_FA.exit}
          </button>
        </div>
      </div>
    </div>
  )
}

function ResultsScreen({
  registered,
  summary,
  onRetry,
  adaptive,
  extraActions,
}: {
  registered: RegisteredExercise
  summary: import('../../core/types').ExerciseSummary
  onRetry: () => void
  adaptive: AdaptiveDifficultyResult | null
  extraActions?: ReactNode
}) {
  const metricEntries = Object.entries(summary.metrics)
  const thresholdMet = summary.accuracy >= ACCURACY_LEVEL_UP_THRESHOLD
  return (
    <div className={styles.stage} data-testid="results">
      <div className={styles.card}>
        <h2>جلسه کامل شد</h2>
        {adaptive ? (
          <div
            className={`${styles.thresholdBanner} ${thresholdMet ? styles.thresholdMet : styles.thresholdMissed}`}
            data-testid="threshold-banner"
          >
            {thresholdMet ? 'حد نصاب ارتقا (دقت ۸۰٪) پاس شد ✓' : 'حد نصاب ارتقا (دقت ۸۰٪) کامل نشد'}
            <span className={styles.thresholdDetail}>
              {describeStreakFa(adaptive)}
              {adaptive.levelHistory.at(-1)?.isoDate === toLocalIsoDate(Date.now())
                ? ` · سطح پیشنهادی اکنون: ${toFaDigits(adaptive.recommendedLevel)}`
                : ''}
            </span>
          </div>
        ) : null}
        <div className={styles.resultsGrid}>
          <div className={styles.metricCard}>
            <div className={styles.metricValue}>{toFaDigits(summary.correctTrials)}</div>
            <div className={styles.metricLabel}>پاسخ درست</div>
          </div>
          <div className={styles.metricCard}>
            <div className={styles.metricValue}>{toFaDigits(summary.accuracy)}٪</div>
            <div className={styles.metricLabel}>دقت</div>
          </div>
          {summary.medianReactionTimeMs !== null ? (
            <div className={styles.metricCard}>
              <div className={styles.metricValue}>{toFaDigits(Math.round(summary.medianReactionTimeMs))}</div>
              <div className={styles.metricLabel}>میانه زمان پاسخ (میلی‌ثانیه)</div>
            </div>
          ) : null}
          <div className={styles.metricCard}>
            <div className={styles.metricValue}>{toFaDigits(summary.difficulty)}</div>
            <div className={styles.metricLabel}>سطح دشواری</div>
          </div>
        </div>
        {metricEntries.length > 0 ? (
          <div className={styles.resultsGrid}>
            {metricEntries.map(([key, value]) => (
              <div className={styles.metricCard} key={key}>
                <div className={styles.metricValue}>{toFaDigits(value)}</div>
                <div className={styles.metricLabel}>
                  {registered.meta.metricLabelsFa[key] ?? key}
                </div>
              </div>
            ))}
          </div>
        ) : null}
        <p className={styles.hint}>{APP_TEXTS_FA.disclaimer}</p>
        <div className={styles.buttonRow} style={{ marginTop: 'var(--space-4)' }}>
          <button type="button" className={styles.primaryButton} onClick={onRetry}>
            {APP_TEXTS_FA.exit}
          </button>
          {extraActions}
        </div>
      </div>
    </div>
  )
}
