import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { GameShell } from '../components/game/GameShell'
import { getAppData } from '../data/app-data'
import { createAppRegistry, createExerciseConfig } from '../modules'
import { Calculation20Game } from '../modules/processing-speed/games/calculation-20/Calculation20Game'
import { GoNoGoGame } from '../modules/attention-control/games/go-no-go/GoNoGoGame'
import { StroopGame } from '../modules/attention-control/games/stroop/StroopGame'
import { ReactionTimeGame } from '../modules/sensorimotor/games/reaction-time/ReactionTimeGame'
import { MemoriseGridGame } from '../modules/visual-spatial/games/memorise-grid/MemoriseGridGame'
import { SpatialSequenceGame } from '../modules/visual-spatial/games/spatial-sequence/SpatialSequenceGame'
import { NumberSequenceGame } from '../modules/working-memory/games/number-sequence/NumberSequenceGame'
import { NBackGame } from '../modules/working-memory/games/n-back/NBackGame'
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
    case 'memorise-grid':
      return (ctx: Parameters<typeof MemoriseGridGame>[0]['ctx']) => <MemoriseGridGame ctx={ctx} />
    case 'spatial-sequence':
      return (ctx: Parameters<typeof SpatialSequenceGame>[0]['ctx']) => <SpatialSequenceGame ctx={ctx} />
    case 'reaction-time':
      return (ctx: Parameters<typeof ReactionTimeGame>[0]['ctx']) => <ReactionTimeGame ctx={ctx} />
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

  useEffect(() => {
    let cancelled = false
    void getAppData().then((data) => {
      if (!cancelled) setAppData(data)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // آخرین دشواری انتخابی کاربر را از تنظیمات محلی می‌خواند
  useEffect(() => {
    if (!appData || !registered) return
    void appData.settings.get(registered.meta.id).then((record) => {
      if (record && registered.meta.difficultyLevels.includes(record.lastDifficulty)) {
        setDifficulty(record.lastDifficulty)
      }
    })
  }, [appData, registered])

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
    return (
      <main className="app-shell">
        <div className={styles.picker}>
          <h1>{registered.meta.nameFa}</h1>
          <p className={styles.pickerHint}>سطح دشواری را انتخاب کن — در MVP دشواری ثابت جلسه است.</p>
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
              </button>
            ))}
          </div>
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
          // بازگشت به انتخاب سطح؛ round جدید جلسه تازه می‌سازد
          setDifficultyConfirmed(false)
          setSessionRound((r) => r + 1)
          void navigate(`/play/${exerciseId}`, { replace: true })
        }}
      />
    </main>
  )
}
