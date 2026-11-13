import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { GameShell } from '../components/game/GameShell'
import {
  computeAdaptiveDifficulty,
  describeStreakFa,
  toLocalIsoDate,
} from '../core/difficulty/adaptive-difficulty'
import type { AdaptiveDifficultyResult } from '../core/difficulty/adaptive-difficulty'
import { deriveCompletedExerciseIds } from '../core/program/plan-status'
import {
  finalizeRun,
  findInProgressRun,
  nextPendingItem,
  startRun,
  summarizeRun,
  withSession,
} from '../core/program/run-chain'
import type { ProgramRunSummary } from '../core/program/run-chain'
import type { ProgramRunRecord, TrainingPlanItem, TrainingPlanRecord } from '../core/program/types'
import { getAppData } from '../data/app-data'
import { PROGRAM_TEXTS_FA } from '../i18n/fa'
import { createAppRegistry, createExerciseConfig } from '../modules'
import { Calculation20Game } from '../modules/processing-speed/games/calculation-20/Calculation20Game'
import { Calculation100Game } from '../modules/processing-speed/games/calculation-100/Calculation100Game'
import { ContinuousCountdownGame } from '../modules/processing-speed/games/continuous-countdown/ContinuousCountdownGame'
import { MissingOperatorGame } from '../modules/processing-speed/games/missing-operator/MissingOperatorGame'
import { NumberComparisonGame } from '../modules/processing-speed/games/number-comparison/NumberComparisonGame'
import { GoNoGoGame } from '../modules/attention-control/games/go-no-go/GoNoGoGame'
import { StroopGame } from '../modules/attention-control/games/stroop/StroopGame'
import { ReactionTimeGame } from '../modules/sensorimotor/games/reaction-time/ReactionTimeGame'
import { MemoriseGridGame } from '../modules/visual-spatial/games/memorise-grid/MemoriseGridGame'
import { SpatialSequenceGame } from '../modules/visual-spatial/games/spatial-sequence/SpatialSequenceGame'
import { NumberSequenceGame } from '../modules/working-memory/games/number-sequence/NumberSequenceGame'
import { NBackGame } from '../modules/working-memory/games/n-back/NBackGame'
import { DualNBackGame } from '../modules/working-memory/games/dual-n-back/DualNBackGame'
import { PasatGame } from '../modules/processing-speed/games/pasat/PasatGame'
import { AssociativePairsGame } from '../modules/long-term-memory/games/associative-pairs/AssociativePairsGame'
import { WordMemoryGame } from '../modules/verbal-auditory/games/word-memory/WordMemoryGame'
import { SyllableCountingGame } from '../modules/verbal-auditory/games/syllable-counting/SyllableCountingGame'
import { SequenceLogicGame } from '../modules/reasoning/games/sequence-logic/SequenceLogicGame'
import { PatternCompletionGame } from '../modules/reasoning/games/pattern-completion/PatternCompletionGame'
import { ObjectTrackingGame } from '../modules/visual-spatial/games/object-tracking/ObjectTrackingGame'
import { MentalRotationGame } from '../modules/visual-spatial/games/mental-rotation/MentalRotationGame'
import { MirrorClockGame } from '../modules/visual-spatial/games/mirror-clock/MirrorClockGame'
import { BlockHeightGame } from '../modules/visual-spatial/games/block-height/BlockHeightGame'
import { TaskSwitchingGame } from '../modules/attention-control/games/task-switching/TaskSwitchingGame'
import { OperationSpanGame } from '../modules/working-memory/games/operation-span/OperationSpanGame'
import { SymmetrySpanGame } from '../modules/visual-spatial/games/symmetry-span/SymmetrySpanGame'
import { RuleDiscoveryCardSortingGame } from '../modules/reasoning/games/rule-discovery-card-sorting/RuleDiscoveryCardSortingGame'
import { ReadingAloudGame } from '../modules/verbal-auditory/games/reading-aloud/ReadingAloudGame'
import { WordScrambleGame } from '../modules/verbal-auditory/games/word-scramble/WordScrambleGame'
import { AudioRecallGame } from '../modules/verbal-auditory/games/audio-recall/AudioRecallGame'
import { WordBlendGame } from '../modules/verbal-auditory/games/word-blend/WordBlendGame'
import { SimonGame } from '../modules/attention-control/games/simon/SimonGame'
import { AttentionalBlinkGame } from '../modules/attention-control/games/attentional-blink/AttentionalBlinkGame'
import { RunningSpanGame } from '../modules/working-memory/games/running-span/RunningSpanGame'
import { ChangeDetectionGame } from '../modules/visual-spatial/games/change-detection/ChangeDetectionGame'
import { ProgressiveMatricesGame } from '../modules/reasoning/games/progressive-matrices/ProgressiveMatricesGame'
import { TypeGlyph } from '../components/icons/TypeGlyphs'
import { DOMAIN_LABELS_FA, EXERCISE_TYPE_LABELS_FA } from '../i18n/fa'
import { formatDuration, toFaDigits } from '../utils/format'
import styles from './exercise.module.css'

const registry = createAppRegistry()

/** انتخاب render اختصاصی هر بازی — منطق بازی در engine خودش است */
function renderGame(exerciseId: string) {
  switch (exerciseId) {
    case 'number-sequence':
      return (ctx: Parameters<typeof NumberSequenceGame>[0]['ctx']) => <NumberSequenceGame ctx={ctx} />
    case 'n-back':
      return (ctx: Parameters<typeof NBackGame>[0]['ctx']) => <NBackGame ctx={ctx} />
    case 'dual-n-back':
      return (ctx: Parameters<typeof DualNBackGame>[0]['ctx']) => <DualNBackGame ctx={ctx} />
    case 'dual-n-back-auditory':
      return (ctx: Parameters<typeof DualNBackGame>[0]['ctx']) => <DualNBackGame ctx={ctx} auditory />
    case 'pasat':
      return (ctx: Parameters<typeof PasatGame>[0]['ctx']) => <PasatGame ctx={ctx} />
    case 'associative-pairs':
      return (ctx: Parameters<typeof AssociativePairsGame>[0]['ctx']) => <AssociativePairsGame ctx={ctx} />
    case 'go-no-go':
      return (ctx: Parameters<typeof GoNoGoGame>[0]['ctx']) => <GoNoGoGame ctx={ctx} />
    case 'stroop':
      return (ctx: Parameters<typeof StroopGame>[0]['ctx']) => <StroopGame ctx={ctx} />
    case 'calculation-20':
      return (ctx: Parameters<typeof Calculation20Game>[0]['ctx']) => <Calculation20Game ctx={ctx} />
    case 'calculation-100':
      return (ctx: Parameters<typeof Calculation100Game>[0]['ctx']) => <Calculation100Game ctx={ctx} />
    case 'continuous-countdown':
      return (ctx: Parameters<typeof ContinuousCountdownGame>[0]['ctx']) => <ContinuousCountdownGame ctx={ctx} />
    case 'missing-operator':
      return (ctx: Parameters<typeof MissingOperatorGame>[0]['ctx']) => <MissingOperatorGame ctx={ctx} />
    case 'number-comparison':
      return (ctx: Parameters<typeof NumberComparisonGame>[0]['ctx']) => <NumberComparisonGame ctx={ctx} />
    case 'memorise-grid':
      return (ctx: Parameters<typeof MemoriseGridGame>[0]['ctx']) => <MemoriseGridGame ctx={ctx} />
    case 'spatial-sequence':
      return (ctx: Parameters<typeof SpatialSequenceGame>[0]['ctx']) => <SpatialSequenceGame ctx={ctx} />
    case 'reaction-time':
      return (ctx: Parameters<typeof ReactionTimeGame>[0]['ctx']) => <ReactionTimeGame ctx={ctx} />
    case 'word-memory':
      return (ctx: Parameters<typeof WordMemoryGame>[0]['ctx']) => <WordMemoryGame ctx={ctx} />
    case 'syllable-counting':
      return (ctx: Parameters<typeof SyllableCountingGame>[0]['ctx']) => <SyllableCountingGame ctx={ctx} />
    case 'sequence-logic':
      return (ctx: Parameters<typeof SequenceLogicGame>[0]['ctx']) => <SequenceLogicGame ctx={ctx} />
    case 'pattern-completion':
      return (ctx: Parameters<typeof PatternCompletionGame>[0]['ctx']) => <PatternCompletionGame ctx={ctx} />
    case 'object-tracking':
      return (ctx: Parameters<typeof ObjectTrackingGame>[0]['ctx']) => <ObjectTrackingGame ctx={ctx} />
    case 'mental-rotation':
      return (ctx: Parameters<typeof MentalRotationGame>[0]['ctx']) => <MentalRotationGame ctx={ctx} />
    case 'mirror-clock':
      return (ctx: Parameters<typeof MirrorClockGame>[0]['ctx']) => <MirrorClockGame ctx={ctx} />
    case 'block-height':
      return (ctx: Parameters<typeof BlockHeightGame>[0]['ctx']) => <BlockHeightGame ctx={ctx} />
    case 'task-switching':
      return (ctx: Parameters<typeof TaskSwitchingGame>[0]['ctx']) => <TaskSwitchingGame ctx={ctx} />
    case 'operation-span':
      return (ctx: Parameters<typeof OperationSpanGame>[0]['ctx']) => <OperationSpanGame ctx={ctx} />
    case 'symmetry-span':
      return (ctx: Parameters<typeof SymmetrySpanGame>[0]['ctx']) => <SymmetrySpanGame ctx={ctx} />
    case 'rule-discovery-card-sorting':
      return (ctx: Parameters<typeof RuleDiscoveryCardSortingGame>[0]['ctx']) => <RuleDiscoveryCardSortingGame ctx={ctx} />
    case 'reading-aloud':
      return (ctx: Parameters<typeof ReadingAloudGame>[0]['ctx']) => <ReadingAloudGame ctx={ctx} />
    case 'word-scramble':
      return (ctx: Parameters<typeof WordScrambleGame>[0]['ctx']) => <WordScrambleGame ctx={ctx} />
    case 'audio-recall':
      return (ctx: Parameters<typeof AudioRecallGame>[0]['ctx']) => <AudioRecallGame ctx={ctx} />
    case 'word-blend':
      return (ctx: Parameters<typeof WordBlendGame>[0]['ctx']) => <WordBlendGame ctx={ctx} />
    case 'simon-task':
      return (ctx: Parameters<typeof SimonGame>[0]['ctx']) => <SimonGame ctx={ctx} />
    case 'attentional-blink':
      return (ctx: Parameters<typeof AttentionalBlinkGame>[0]['ctx']) => <AttentionalBlinkGame ctx={ctx} />
    case 'running-span':
      return (ctx: Parameters<typeof RunningSpanGame>[0]['ctx']) => <RunningSpanGame ctx={ctx} />
    case 'change-detection':
      return (ctx: Parameters<typeof ChangeDetectionGame>[0]['ctx']) => <ChangeDetectionGame ctx={ctx} />
    case 'progressive-matrices':
      return (ctx: Parameters<typeof ProgressiveMatricesGame>[0]['ctx']) => <ProgressiveMatricesGame ctx={ctx} />
    default:
      return null
  }
}

/**
 * صفحهٔ تمرین — wrapper فقط پارامترها را می‌خواند و با کلیدِ ترکیبی
 * «تمرین + تاریخ زنجیره» کامپوننت داخلی را remount می‌کند تا رفتن به
 * تمرین بعدیِ زنجیرهٔ برنامه، state تازهٔ تمیزی بگیرد.
 */
export function ExercisePage() {
  const { exerciseId = '' } = useParams()
  const [searchParams] = useSearchParams()
  const runDate = searchParams.get('run')
  return (
    <ExercisePageInner
      key={`${exerciseId}|${runDate ?? ''}`}
      exerciseId={exerciseId}
      runDate={runDate}
    />
  )
}

interface ExercisePageInnerProps {
  readonly exerciseId: string
  /** تاریخ طرح برنامه — وجودش یعنی حالت «اجرای زنجیره‌ای برنامه» */
  readonly runDate: string | null
}

/** وضعیت زنجیره پس از پایان یک جلسهٔ کامل */
interface RunNextState {
  /** آیتم بعدی یا null وقتی همهٔ آیتم‌های طرح انجام شده */
  readonly item: TrainingPlanItem | null
}

function ExercisePageInner({ exerciseId, runDate }: ExercisePageInnerProps) {
  const navigate = useNavigate()
  const [, setSearchParams] = useSearchParams()
  const registered = registry.get(exerciseId)

  const [difficulty, setDifficulty] = useState(1)
  const [difficultyConfirmed, setDifficultyConfirmed] = useState(false)
  const [appData, setAppData] = useState<Awaited<ReturnType<typeof getAppData>> | null>(null)
  // برای شروع مجدد جلسه با همان تنظیمات: کلید جدید، manager جدید
  const [sessionRound, setSessionRound] = useState(0)
  // دشواری تطبیقی: سطح پیشنهادی سیستم + وضعیت رکورد
  const [adaptive, setAdaptive] = useState<AdaptiveDifficultyResult | null>(null)
  const [progressRefreshKey, setProgressRefreshKey] = useState(0)
  // حالت زنجیرهٔ برنامه
  const [runPlan, setRunPlan] = useState<TrainingPlanRecord | null>(null)
  const [run, setRun] = useState<ProgramRunRecord | null>(null)
  const [runNext, setRunNext] = useState<RunNextState | null>(null)
  const [runSummary, setRunSummary] = useState<ProgramRunSummary | null>(null)

  useEffect(() => {
    let cancelled = false
    void getAppData().then((data) => {
      if (!cancelled) setAppData(data)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // محاسبه سطح پیشنهادی از تاریخچه جلسات — با هر بازگشت به picker تازه می‌شود.
  // در حالت زنجیره، سطح از آیتم طرح می‌آید و این محاسبه معلق است.
  useEffect(() => {
    if (!appData || !registered || runDate) return
    let cancelled = false
    void (async () => {
      const history = await appData.sessions.listByExercise(registered.meta.id)
      if (cancelled) return
      const todayIso = toLocalIsoDate(Date.now())
      const result = computeAdaptiveDifficulty(history, todayIso)
      setAdaptive(result)
      setDifficulty(result.recommendedLevel)
    })()
    return () => {
      cancelled = true
    }
  }, [appData, registered, progressRefreshKey, runDate])

  // حالت زنجیره: طرح را بارگذاری، سطح آیتم را بگذار، رکورد اجرا را تضمین کن
  useEffect(() => {
    if (!appData || !runDate || !registered) return
    let cancelled = false
    void (async () => {
      const plan = await appData.plans.getByDate(runDate)
      if (cancelled) return
      const item = plan?.items.find((i) => i.exerciseId === exerciseId)
      if (!plan || !item) {
        // پارامتر run نامعتبر است (طرح نیست/تمرین عضو طرح نیست) → حالت عادی
        setSearchParams({}, { replace: true })
        return
      }
      setRunPlan(plan)
      setDifficulty(item.difficulty)
      setDifficultyConfirmed(true)
      // ادامهٔ اجرای بازِ همان روز (رفرش وسط زنجیره) یا اجرای تازه
      const runs = await appData.runs.listByDate(runDate)
      let current = findInProgressRun(runs)
      if (!current) {
        current = startRun(runDate, Date.now())
        await appData.runs.create(current)
      }
      if (!cancelled) setRun(current)
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appData, runDate, registered, exerciseId])

  const renderTrial = useMemo(() => (registered ? renderGame(registered.meta.id) : null), [registered])

  // آخرین مقادیر برای callbackهای async (الگوی ref همگام)
  const runRef = useRef<ProgramRunRecord | null>(null)
  runRef.current = run
  const runPlanRef = useRef<TrainingPlanRecord | null>(null)
  runPlanRef.current = runPlan

  /** پایان جلسه در زنجیره: ضمیمهٔ جلسه؛ کامل → محاسبهٔ بعدی یا پایان برنامه؛ قطع → بستن زنجیره */
  const handleSessionFinished = useCallback(
    (info: { sessionId: string; status: 'completed' | 'aborted' }) => {
      if (!appData || !runDate) return
      void (async () => {
        const current = runRef.current
        const plan = runPlanRef.current
        if (!current || !plan) return
        let updated = withSession(current, info.sessionId)
        if (info.status === 'aborted') {
          // جلسه قطع شد — زنجیره همان‌جا بسته می‌شود؛ خروج کاربر به /program می‌رود
          updated = finalizeRun(updated, 'aborted', Date.now())
          await appData.runs.update(updated)
          setRun(updated)
          return
        }
        // جلسهٔ کامل — آیتم بعدی از وضعیت تازهٔ جلسات مشتق می‌شود
        const sessionsPerItem = await Promise.all(
          plan.items.map((item) => appData.sessions.listByExercise(item.exerciseId)),
        )
        const doneIds = deriveCompletedExerciseIds(sessionsPerItem.flat(), plan.date)
        const next = nextPendingItem(plan.items, doneIds)
        if (next === null) {
          // پایان برنامه — نهایی‌سازی و خلاصهٔ تحلیلی کل زنجیره
          // (جلسات لینک‌شده را با get می‌خوانیم — نه اسکن کامل جدول)
          const finished = finalizeRun(updated, 'completed', Date.now())
          await appData.runs.update(finished)
          const linked = await Promise.all(
            finished.sessionIds.map((id) => appData.sessions.get(id)),
          )
          setRun(finished)
          setRunNext({ item: null })
          setRunSummary(
            summarizeRun(
              finished,
              linked.filter((s): s is NonNullable<typeof s> => s !== null),
            ),
          )
          return
        }
        await appData.runs.update(updated)
        setRun(updated)
        setRunNext({ item: next })
      })()
    },
    [appData, runDate],
  )

  /** ترک زنجیره (خروج/توقف) — اجرای باز را قطع‌شده نهایی می‌کند و به برنامه برمی‌گردد */
  const leaveRun = useCallback(() => {
    const current = runRef.current
    if (current && current.status === 'in_progress' && appData) {
      void appData.runs.update(finalizeRun(current, 'aborted', Date.now()))
    }
    void navigate('/program')
  }, [appData, navigate])

  const goNextExercise = useCallback(
    (item: TrainingPlanItem) => {
      void navigate(`/play/${item.exerciseId}?run=${runDate ?? ''}`)
    },
    [navigate, runDate],
  )

  if (!registered) {
    return (
      <main className="app-shell">
        <div className={styles.notFound}>
          <h1>تمرین پیدا نشد</h1>
          <Link to="/" className={styles.backLink}>
            بازگشت به فهرست تمرین‌ها
          </Link>
        </div>
      </main>
    )
  }

  // حالت زنجیره: تا آماده‌سازی طرح/رکورد اجرا، پیام آماده‌سازی (نه فلش picker)
  if (runDate && (!difficultyConfirmed || !appData)) {
    return (
      <main className="app-shell">
        <p className={styles.runLoading} data-testid="run-loading">
          {PROGRAM_TEXTS_FA.runLoading}
        </p>
      </main>
    )
  }

  if (!difficultyConfirmed || !appData) {
    const recommended = adaptive?.recommendedLevel ?? null
    const isManual = recommended !== null && difficulty !== recommended
    return (
      <main className="app-shell">
        <div className={styles.picker} data-domain={registered.meta.domain}>
          <div className={styles.pickerHead}>
            <span className={styles.pickerTile} data-type={registered.meta.exerciseType}>
              <TypeGlyph type={registered.meta.exerciseType} size={24} />
            </span>
            <h1>{registered.meta.nameFa}</h1>
          </div>
          <div className={styles.pickerChips}>
            <span className={styles.pickerChip} data-type={registered.meta.exerciseType}>
              {EXERCISE_TYPE_LABELS_FA[registered.meta.exerciseType]}
            </span>
            {registered.meta.effects.map((effect) => (
              <span key={effect} className={styles.pickerChip} data-domain={effect}>
                {DOMAIN_LABELS_FA[effect]}
              </span>
            ))}
          </div>
          <p className={styles.pickerHint}>
            سطح پیشنهادی سیستم به‌صورت خودکار انتخاب شده است.
            {adaptive ? ` ${describeStreakFa(adaptive)}${adaptive.todayQualified ? ' · امروز انجام شد ✓' : ''}` : ''}
          </p>
          <div className={styles.levelGrid} role="radiogroup" aria-label="سطح دشواری">
            {registered.meta.difficultyLevels.map((level) => (
              <button
                type="button"
                key={level}
                role="radio"
                aria-checked={difficulty === level}
                className={`${styles.levelButton} ${difficulty === level ? styles.levelActive : ''}`}
                onClick={() => setDifficulty(level)}
              >
                {toFaDigits(level)}
                {recommended === level ? (
                  <span className={styles.recommendedBadge} aria-hidden="true">
                    پیشنهادی
                  </span>
                ) : null}
              </button>
            ))}
          </div>
          {isManual ? (
            <p className={styles.manualHint}>انتخاب دستی — جلسات سطح دستی در ارتقای سطح حساب نمی‌شوند.</p>
          ) : null}
          <button
            type="button"
            className={styles.startButton}
            disabled={!appData}
            onClick={() => setDifficultyConfirmed(true)}
          >
            {appData ? 'ادامه' : 'در حال آماده‌سازی…'}
          </button>
          <Link to="/" className={styles.backLink}>
            بازگشت
          </Link>
        </div>
      </main>
    )
  }

  // نوار زنجیرهٔ برنامه — پس از پایان جلسهٔ کامل در صفحهٔ نتایج
  const runExtraActions =
    runDate && runNext !== null
      ? runNext.item
        ? (
            <RunNextBar
              nextName={registry.get(runNext.item.exerciseId)?.meta.nameFa ?? runNext.item.exerciseId}
              onGo={() => goNextExercise(runNext.item as TrainingPlanItem)}
              onStop={leaveRun}
            />
          )
        : (
            <RunCompleteCard summary={runSummary} onBack={() => void navigate('/program')} />
          )
      : undefined

  return (
    <main className="app-shell">
      <GameShell
        key={sessionRound}
        registered={registered}
        config={createExerciseConfig(registered.meta.id, difficulty)}
        deps={appData}
        renderTrial={(ctx) => renderTrial?.(ctx) ?? null}
        autoStart={runDate !== null}
        onSessionFinished={runDate ? handleSessionFinished : undefined}
        extraActions={runExtraActions}
        onExit={() => {
          if (runDate) {
            // خروج از زنجیره — اجرا بسته می‌شود و به برنامه برمی‌گردیم
            leaveRun()
            return
          }
          // بازگشت به انتخاب سطح؛ round جدید جلسه تازه و progress تازه
          setDifficultyConfirmed(false)
          setSessionRound((r) => r + 1)
          setProgressRefreshKey((k) => k + 1)
          void navigate(`/play/${exerciseId}`, { replace: true })
        }}
      />
    </main>
  )
}

/** نوار «تمرین بعدی» در صفحهٔ نتایج — شمارش خودکار با دکمه‌های کنترل */
function RunNextBar({
  nextName,
  onGo,
  onStop,
  autoSeconds = 8,
}: {
  nextName: string
  onGo: () => void
  onStop: () => void
  autoSeconds?: number
}) {
  const [seconds, setSeconds] = useState(autoSeconds)
  useEffect(() => {
    if (seconds <= 0) {
      onGo()
      return
    }
    const timer = window.setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds])

  return (
    <div className={styles.runBar} data-testid="program-run-next">
      <span className={styles.runBarText}>
        {PROGRAM_TEXTS_FA.runNextExercise(nextName)} · {toFaDigits(seconds)}
      </span>
      <div className={styles.runBarButtons}>
        <button type="button" className={styles.runBarPrimary} onClick={onGo}>
          {PROGRAM_TEXTS_FA.runGoNow}
        </button>
        <button type="button" className={styles.runBarSecondary} onClick={onStop}>
          {PROGRAM_TEXTS_FA.runStop}
        </button>
      </div>
    </div>
  )
}

/** کارت پایان برنامه — خلاصهٔ تحلیلی کل زنجیره و بازگشت خودکار */
function RunCompleteCard({
  summary,
  onBack,
  autoSeconds = 6,
}: {
  summary: ProgramRunSummary | null
  onBack: () => void
  autoSeconds?: number
}) {
  const [seconds, setSeconds] = useState(autoSeconds)
  useEffect(() => {
    if (seconds <= 0) {
      onBack()
      return
    }
    const timer = window.setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds])

  return (
    <div className={styles.runBar} data-testid="program-run-complete">
      <span className={styles.runBarDone}>{PROGRAM_TEXTS_FA.runCompleteTitle}</span>
      {summary ? (
        <span className={styles.runBarText}>
          {PROGRAM_TEXTS_FA.runTotalTime}: {formatDuration(summary.wallDurationMs ?? 0)}
          {' · '}
          {PROGRAM_TEXTS_FA.runSessions}: {toFaDigits(summary.completedSessions)}
          {summary.meanAccuracy !== null
            ? ` · ${PROGRAM_TEXTS_FA.runMeanAccuracy}: ${toFaDigits(summary.meanAccuracy)}٪`
            : ''}
        </span>
      ) : null}
      <div className={styles.runBarButtons}>
        <button type="button" className={styles.runBarPrimary} onClick={onBack}>
          {PROGRAM_TEXTS_FA.runBackToProgram} ({toFaDigits(seconds)})
        </button>
      </div>
    </div>
  )
}
