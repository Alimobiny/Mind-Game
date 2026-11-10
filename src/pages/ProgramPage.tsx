import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadProgressForExercises } from '../analytics/dashboard'
import { toLocalIsoDate } from '../core/difficulty/adaptive-difficulty'
// قواعد طراحی برنامه (۱۵–۲۰ دقیقه، تنوع حوزه‌ها، فاصله‌گذاری، بدون ادعای بالینی)
// مستند در docs/SCIENTIFIC-VALIDATION.md
import { deriveCompletedExerciseIds } from '../core/program/plan-status'
import { generateDailyPlan } from '../core/program/generate-daily-plan'
import type {
  ProgramExerciseEntry,
  TrainingPlanRecord,
} from '../core/program/types'
import { getAppData } from '../data/app-data'
import { APP_TEXTS_FA, DOMAIN_LABELS_FA, PROGRAM_TEXTS_FA } from '../i18n/fa'
import { createAppRegistry } from '../modules'
import { formatDate, toFaDigits } from '../utils/format'
import styles from './program.module.css'

const registry = createAppRegistry()

interface ProgramViewData {
  readonly plan: TrainingPlanRecord
  readonly doneIds: ReadonlySet<string>
}

export function ProgramPage() {
  // کاتالوگ ورودی منطق برنامه — فقط متادیتا، بدون وابستگی به موتورها
  const catalog = useMemo<ProgramExerciseEntry[]>(
    () =>
      registry.list().map((exercise) => ({
        exerciseId: exercise.meta.id,
        domain: exercise.meta.domain,
        plannedTrials: exercise.meta.plannedTrials ?? 0,
        difficultyLevels: exercise.meta.difficultyLevels,
      })),
    [],
  )

  const [data, setData] = useState<ProgramViewData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const appData = await getAppData()
      const todayIso = toLocalIsoDate(Date.now())

      // برنامه هر روز فقط یک‌بار تولید می‌شود؛ تاریخ کلید استور است، پس
      // بازکردن دوباره صفحه همان روز همان برنامه را نشان می‌دهد (idempotent)
      let plan = await appData.plans.getByDate(todayIso)
      if (!plan) {
        const [recentPlans, progress] = await Promise.all([
          appData.plans.listRecent(7),
          loadProgressForExercises(appData.sessions, catalog.map((entry) => entry.exerciseId)),
        ])
        // سطح هر آیتم = سطح پیشنهادی دشواری تطبیقی همان بازی (بدون تاریخچه = کف)
        const difficultyByExercise = Object.fromEntries(
          Object.entries(progress).map(([id, result]) => [id, result.recommendedLevel]),
        )
        plan = generateDailyPlan({
          date: todayIso,
          catalog,
          difficultyByExercise,
          recentPlans,
          generatedAt: Date.now(),
        })
        await appData.plans.put(plan)
      }

      // وضعیت «انجام‌شده» از رکوردهای جلسه همان روز مشتق می‌شود —
      // هرگز در استور برنامه ذخیره نمی‌شود (پرهیز از دفترداری دوباره)
      const sessionsPerItem = await Promise.all(
        plan.items.map((item) => appData.sessions.listByExercise(item.exerciseId)),
      )
      const doneIds = deriveCompletedExerciseIds(sessionsPerItem.flat(), todayIso)
      return { plan, doneIds }
    })()
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch(() => {
        if (!cancelled) setError(PROGRAM_TEXTS_FA.loadError)
      })
    return () => {
      cancelled = true
    }
  }, [catalog, reloadKey])

  // تازه‌سازی وضعیت‌ها وقتی از صفحه بازی برمی‌گردیم
  useEffect(() => {
    const onFocus = () => setReloadKey((k) => k + 1)
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  const totalMinutes =
    data?.plan.items.reduce((sum, item) => sum + item.estimatedMinutes, 0) ?? 0

  return (
    <main className="app-shell">
      <header className={styles.header}>
        <h1>{PROGRAM_TEXTS_FA.title}</h1>
        <Link to="/" className={styles.backLink}>
          {PROGRAM_TEXTS_FA.backToHome}
        </Link>
      </header>

      {error ? <p className={styles.empty}>{error}</p> : null}

      {!error && data ? (
        <>
          <p className={styles.todayDate}>{formatDate(Date.now())}</p>
          <p className={styles.totalLine}>
            {PROGRAM_TEXTS_FA.estimatedTotal}: {toFaDigits(totalMinutes)}{' '}
            {PROGRAM_TEXTS_FA.minutesUnit} · {PROGRAM_TEXTS_FA.targetRange}
          </p>

          {data.doneIds.size === data.plan.items.length && data.plan.items.length > 0 ? (
            <p className={styles.allDone}>{PROGRAM_TEXTS_FA.allDone}</p>
          ) : null}

          <ul className={styles.itemList}>
            {data.plan.items.map((item) => {
              const meta = registry.get(item.exerciseId)?.meta
              const done = data.doneIds.has(item.exerciseId)
              return (
                <li
                  key={item.exerciseId}
                  className={done ? styles.itemDone : styles.item}
                  data-testid="program-item"
                >
                  <div className={styles.itemHead}>
                    <span className={styles.itemName}>{meta?.nameFa ?? item.exerciseId}</span>
                    <span className={done ? styles.badgeDone : styles.badgePending}>
                      {done ? PROGRAM_TEXTS_FA.statusDone : PROGRAM_TEXTS_FA.statusPending}
                    </span>
                  </div>
                  <span className={styles.itemDomain}>
                    {meta ? DOMAIN_LABELS_FA[meta.domain] : ''}
                  </span>
                  <span className={styles.itemMeta}>
                    {PROGRAM_TEXTS_FA.suggestedLevel} {toFaDigits(item.difficulty)} ·{' '}
                    {PROGRAM_TEXTS_FA.estimatedMinutes} {toFaDigits(item.estimatedMinutes)}{' '}
                    {PROGRAM_TEXTS_FA.minutesUnit}
                  </span>
                  <Link
                    to={`/play/${item.exerciseId}`}
                    className={done ? styles.startLinkSecondary : styles.startLink}
                    data-testid="program-start"
                  >
                    {done ? PROGRAM_TEXTS_FA.redoCta : PROGRAM_TEXTS_FA.startCta}
                  </Link>
                </li>
              )
            })}
          </ul>
        </>
      ) : !error ? (
        <p className={styles.empty}>در حال آماده‌سازی برنامه…</p>
      ) : null}

      <p className={styles.guideline}>{PROGRAM_TEXTS_FA.guideline}</p>
      <footer className={styles.footer}>
        <p className={styles.disclaimer}>{APP_TEXTS_FA.disclaimer}</p>
      </footer>
    </main>
  )
}
