import { lazy, Suspense, useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { ComponentType, LazyExoticComponent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { GameShell } from '../components/game/GameShell'
import type { ActiveGameContext } from '../components/game/GameShell'
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
import { TypeGlyph } from '../components/icons/TypeGlyphs'
import { DOMAIN_LABELS_FA, EXERCISE_TYPE_LABELS_FA } from '../i18n/fa'
import { formatDuration, toFaDigits } from '../utils/format'
import styles from './exercise.module.css'

const registry = createAppRegistry()

/** پراپ کامپوننت بازی — ctx پوستهٔ مشترک؛ auditory فقط ان-بک شنیداری */
type GameComponent = ComponentType<{ ctx: ActiveGameContext; auditory?: boolean }>

/**
 * بارگذاری تنبل هر بازی — به‌جای این‌که هر ۳۷ کامپوننت در یک chunk تمرینِ
 * ۱۳۵KB بسته شوند، فقط بازیِ در حال اجرا دانلود و parse می‌شود (~۳-۶KB).
 * پیش‌واکشی در مونت صفحه (زیر) حین انتخاب سطح/دستورالعمل، سوسپنس را
 * عملاً نامرئی می‌کند.
 */
const GAME_LOADERS: Readonly<Record<string, () => Promise<{ default: GameComponent }>>> = {
  'number-sequence': () => import('../modules/working-memory/games/number-sequence/NumberSequenceGame').then((m) => ({ default: m.NumberSequenceGame })),
  'n-back': () => import('../modules/working-memory/games/n-back/NBackGame').then((m) => ({ default: m.NBackGame })),
  'dual-n-back': () => import('../modules/working-memory/games/dual-n-back/DualNBackGame').then((m) => ({ default: m.DualNBackGame })),
  'dual-n-back-auditory': () => import('../modules/working-memory/games/dual-n-back/DualNBackGame').then((m) => ({ default: m.DualNBackGame })),
  'pasat': () => import('../modules/processing-speed/games/pasat/PasatGame').then((m) => ({ default: m.PasatGame })),
  'associative-pairs': () => import('../modules/long-term-memory/games/associative-pairs/AssociativePairsGame').then((m) => ({ default: m.AssociativePairsGame })),
  'go-no-go': () => import('../modules/attention-control/games/go-no-go/GoNoGoGame').then((m) => ({ default: m.GoNoGoGame })),
  'stroop': () => import('../modules/attention-control/games/stroop/StroopGame').then((m) => ({ default: m.StroopGame })),
  'calculation-20': () => import('../modules/processing-speed/games/calculation-20/Calculation20Game').then((m) => ({ default: m.Calculation20Game })),
  'calculation-100': () => import('../modules/processing-speed/games/calculation-100/Calculation100Game').then((m) => ({ default: m.Calculation100Game })),
  'continuous-countdown': () => import('../modules/processing-speed/games/continuous-countdown/ContinuousCountdownGame').then((m) => ({ default: m.ContinuousCountdownGame })),
  'missing-operator': () => import('../modules/processing-speed/games/missing-operator/MissingOperatorGame').then((m) => ({ default: m.MissingOperatorGame })),
  'number-comparison': () => import('../modules/processing-speed/games/number-comparison/NumberComparisonGame').then((m) => ({ default: m.NumberComparisonGame })),
  'memorise-grid': () => import('../modules/visual-spatial/games/memorise-grid/MemoriseGridGame').then((m) => ({ default: m.MemoriseGridGame })),
  'spatial-sequence': () => import('../modules/visual-spatial/games/spatial-sequence/SpatialSequenceGame').then((m) => ({ default: m.SpatialSequenceGame })),
  'reaction-time': () => import('../modules/sensorimotor/games/reaction-time/ReactionTimeGame').then((m) => ({ default: m.ReactionTimeGame })),
  'word-memory': () => import('../modules/verbal-auditory/games/word-memory/WordMemoryGame').then((m) => ({ default: m.WordMemoryGame })),
  'syllable-counting': () => import('../modules/verbal-auditory/games/syllable-counting/SyllableCountingGame').then((m) => ({ default: m.SyllableCountingGame })),
  'sequence-logic': () => import('../modules/reasoning/games/sequence-logic/SequenceLogicGame').then((m) => ({ default: m.SequenceLogicGame })),
  'pattern-completion': () => import('../modules/reasoning/games/pattern-completion/PatternCompletionGame').then((m) => ({ default: m.PatternCompletionGame })),
  'object-tracking': () => import('../modules/visual-spatial/games/object-tracking/ObjectTrackingGame').then((m) => ({ default: m.ObjectTrackingGame })),
  'mental-rotation': () => import('../modules/visual-spatial/games/mental-rotation/MentalRotationGame').then((m) => ({ default: m.MentalRotationGame })),
  'mirror-clock': () => import('../modules/visual-spatial/games/mirror-clock/MirrorClockGame').then((m) => ({ default: m.MirrorClockGame })),
  'block-height': () => import('../modules/visual-spatial/games/block-height/BlockHeightGame').then((m) => ({ default: m.BlockHeightGame })),
  'task-switching': () => import('../modules/attention-control/games/task-switching/TaskSwitchingGame').then((m) => ({ default: m.TaskSwitchingGame })),
  'operation-span': () => import('../modules/working-memory/games/operation-span/OperationSpanGame').then((m) => ({ default: m.OperationSpanGame })),
  'symmetry-span': () => import('../modules/visual-spatial/games/symmetry-span/SymmetrySpanGame').then((m) => ({ default: m.SymmetrySpanGame })),
  'rule-discovery-card-sorting': () => import('../modules/reasoning/games/rule-discovery-card-sorting/RuleDiscoveryCardSortingGame').then((m) => ({ default: m.RuleDiscoveryCardSortingGame })),
  'reading-aloud': () => import('../modules/verbal-auditory/games/reading-aloud/ReadingAloudGame').then((m) => ({ default: m.ReadingAloudGame })),
  'word-scramble': () => import('../modules/verbal-auditory/games/word-scramble/WordScrambleGame').then((m) => ({ default: m.WordScrambleGame })),
  'audio-recall': () => import('../modules/verbal-auditory/games/audio-recall/AudioRecallGame').then((m) => ({ default: m.AudioRecallGame })),
  'word-blend': () => import('../modules/verbal-auditory/games/word-blend/WordBlendGame').then((m) => ({ default: m.WordBlendGame })),
  'simon-task': () => import('../modules/attention-control/games/simon/SimonGame').then((m) => ({ default: m.SimonGame })),
  'attentional-blink': () => import('../modules/attention-control/games/attentional-blink/AttentionalBlinkGame').then((m) => ({ default: m.AttentionalBlinkGame })),
  'running-span': () => import('../modules/working-memory/games/running-span/RunningSpanGame').then((m) => ({ default: m.RunningSpanGame })),
  'change-detection': () => import('../modules/visual-spatial/games/change-detection/ChangeDetectionGame').then((m) => ({ default: m.ChangeDetectionGame })),
  'progressive-matrices': () => import('../modules/reasoning/games/progressive-matrices/ProgressiveMatricesGame').then((m) => ({ default: m.ProgressiveMatricesGame })),
}

const GAME_COMPONENTS: Readonly<Record<string, LazyExoticComponent<GameComponent>>> =
  Object.fromEntries(Object.entries(GAME_LOADERS).map(([id, load]) => [id, lazy(load)])) as Record<
    string,
    LazyExoticComponent<GameComponent>
  >

/** انتخاب کامپوننت بازی — منطق هر بازی در engine خودش است */
function renderGame(exerciseId: string) {
  const Game = GAME_COMPONENTS[exerciseId]
  if (Game === undefined) return null
  const auditory = exerciseId === 'dual-n-back-auditory'
  return (ctx: ActiveGameContext) => (
    <Suspense
      fallback={<p className={styles.runLoading}>در حال آماده‌سازی بازی…</p>}
    >
      <Game ctx={ctx} auditory={auditory} />
    </Suspense>
  )
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

  // پیش‌واکشی کامپوننت بازی حین انتخاب سطح/دستورالعمل — سوسپنس تقریباً
  // هرگز دیده نمی‌شود و فقط یک میکرو-chunk (~۳-۶KB) اضافه بار می‌شود
  useEffect(() => {
    void GAME_LOADERS[exerciseId]?.()
  }, [exerciseId])
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

  /** ترک زنجیره (خروج/توقف) — اجرای باز را قطع‌شده نهایی می‌کند و به برنامه برمی‌گردد.
   * بازخوانی تازه از DB: مسیر async پایان جلسه ممکن است همین لحظه وضعیت را
   * completed کرده باشد و runRef هنوز کهنه باشد (نرخ نوشتن رقابتی) */
  const leaveRun = useCallback(() => {
    if (runDate && appData) {
      void appData.runs.listByDate(runDate).then((runs) => {
        const fresh = findInProgressRun(runs)
        if (fresh !== null) {
          void appData.runs.update(finalizeRun(fresh, 'aborted', Date.now()))
        }
      })
    }
    void navigate('/program')
  }, [appData, navigate, runDate])

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
          <div
            className={styles.levelGrid}
            role="radiogroup"
            aria-label="سطح دشواری"
            onKeyDown={(e) => {
              // قرارداد کیبورد رادیو: کلیدهای جهت بین گزینه‌ها می‌چرخند
              // (در RTL، چپ/راست هم‌معنای بصری خودشان)
              const levels = registered?.meta.difficultyLevels ?? []
              if (levels.length === 0) return
              const currentIndex = Math.max(0, levels.indexOf(difficulty))
              let next: number | null = null
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                next = levels[(currentIndex + 1) % levels.length] as number
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                next = levels[(currentIndex - 1 + levels.length) % levels.length] as number
              }
              if (next !== null) {
                e.preventDefault()
                setDifficulty(next)
              }
            }}
          >
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
  // شمارش در تب مخفی فریز می‌شود: تمرین بعدیِ زنجیره نباید در پس‌زمینه
  // خودکار mount شود (جلسه با omission خالص تکمیل و تاریخچه آلوده می‌شد)
  const [visibilityTick, bumpVisibilityTick] = useReducer((x: number) => x + 1, 0)
  useEffect(() => {
    const onVisibility = () => bumpVisibilityTick()
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])
  useEffect(() => {
    if (seconds <= 0) {
      // آغاز خودکار فقط در تب نمایان — با بازگشت کاربر، تغییر visibilityTick
      // این افکت را دوباره ارزیابی می‌کند
      if (!document.hidden) onGo()
      return
    }
    const timer = window.setTimeout(() => setSeconds((s) => (document.hidden ? s : s - 1)), 1000)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, visibilityTick])

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
  // همان قید RunNextBar: بازگشت خودکار فقط در تب نمایان (فریز در پس‌زمینه)
  const [visibilityTick, bumpVisibilityTick] = useReducer((x: number) => x + 1, 0)
  useEffect(() => {
    const onVisibility = () => bumpVisibilityTick()
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])
  useEffect(() => {
    if (seconds <= 0) {
      if (!document.hidden) onBack()
      return
    }
    const timer = window.setTimeout(() => setSeconds((s) => (document.hidden ? s : s - 1)), 1000)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, visibilityTick])

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
