import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { GameShell } from '../components/game/GameShell'
import {
  computeAdaptiveDifficulty,
  describeStreakFa,
  toLocalIsoDate,
} from '../core/difficulty/adaptive-difficulty'
import type { AdaptiveDifficultyResult } from '../core/difficulty/adaptive-difficulty'
import { getAppData } from '../data/app-data'
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
import { WordMemoryGame } from '../modules/verbal-auditory/games/word-memory/WordMemoryGame'
import { SyllableCountingGame } from '../modules/verbal-auditory/games/syllable-counting/SyllableCountingGame'
import { SequenceLogicGame } from '../modules/reasoning/games/sequence-logic/SequenceLogicGame'
import { PatternCompletionGame } from '../modules/reasoning/games/pattern-completion/PatternCompletionGame'
import { ObjectTrackingGame } from '../modules/visual-spatial/games/object-tracking/ObjectTrackingGame'
import { MentalRotationGame } from '../modules/visual-spatial/games/mental-rotation/MentalRotationGame'
import { MirrorClockGame } from '../modules/visual-spatial/games/mirror-clock/MirrorClockGame'
import { BlockHeightGame } from '../modules/visual-spatial/games/block-height/BlockHeightGame'
import { TaskSwitchingGame } from '../modules/attention-control/games/task-switching/TaskSwitchingGame'
import { TypeGlyph } from '../components/icons/TypeGlyphs'
import { DOMAIN_LABELS_FA, EXERCISE_TYPE_LABELS_FA } from '../i18n/fa'
import { toFaDigits } from '../utils/format'
import styles from './exercise.module.css'

const registry = createAppRegistry()

/** انتخاب render اختصاصی هر بازی — منطق بازی در engine خودش است */
function renderGame(exerciseId: string) {
  switch (exerciseId) {
    case 'number-sequence':
      return (ctx: Parameters<typeof NumberSequenceGame>[0]['ctx']) => <NumberSequenceGame ctx={ctx} />
    case 'n-back':
      return (ctx: Parameters<typeof NBackGame>[0]['ctx']) => <NBackGame ctx={ctx} />
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
    default:
      return null
  }
}

export function ExercisePage() {
  const { exerciseId = '' } = useParams()
  const navigate = useNavigate()
  const registered = registry.get(exerciseId)

  const [difficulty, setDifficulty] = useState(1)
  const [difficultyConfirmed, setDifficultyConfirmed] = useState(false)
  const [appData, setAppData] = useState<Awaited<ReturnType<typeof getAppData>> | null>(null)
  // برای شروع مجدد جلسه با همان تنظیمات: کلید جدید، manager جدید
  const [sessionRound, setSessionRound] = useState(0)
  // دشواری تطبیقی: سطح پیشنهادی سیستم + وضعیت رکورد
  const [adaptive, setAdaptive] = useState<AdaptiveDifficultyResult | null>(null)
  const [progressRefreshKey, setProgressRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    void getAppData().then((data) => {
      if (!cancelled) setAppData(data)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // محاسبه سطح پیشنهادی از تاریخچه جلسات — با هر بازگشت به picker تازه می‌شود
  useEffect(() => {
    if (!appData || !registered) return
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
  }, [appData, registered, progressRefreshKey])

  const renderTrial = useMemo(() => (registered ? renderGame(registered.meta.id) : null), [registered])

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

  return (
    <main className="app-shell">
      <GameShell
        key={sessionRound}
        registered={registered}
        config={createExerciseConfig(registered.meta.id, difficulty)}
        deps={appData}
        renderTrial={(ctx) => renderTrial?.(ctx) ?? null}
        onExit={() => {
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
