import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadProgressForExercises } from '../analytics/dashboard'
import { toLocalIsoDate } from '../core/difficulty/adaptive-difficulty'
// قواعد طراحی برنامه (۱۵–۲۰ دقیقه، تنوع حوزه‌ها، فاصله‌گذاری، بدون ادعای بالینی)
// مستند در docs/SCIENTIFIC-VALIDATION.md
import { deriveCompletedExerciseIds } from '../core/program/plan-status'
import { generateDailyPlan } from '../core/program/generate-daily-plan'
import {
  findInProgressRun,
  nextPendingItem,
  summarizeRun,
} from '../core/program/run-chain'
import type { ProgramRunSummary } from '../core/program/run-chain'
import type {
  ProgramExerciseEntry,
  ProgramRunRecord,
  TrainingPlanRecord,
} from '../core/program/types'
import { getAppData, subscribeToAppDataChanges } from '../data/app-data'
import { APP_TEXTS_FA, DOMAIN_LABELS_FA, PROGRAM_TEXTS_FA } from '../i18n/fa'
import { createAppRegistry } from '../modules'
import { TypeGlyph } from '../components/icons/TypeGlyphs'
import { ForwardGlyph } from '../components/icons/UiGlyphs'
import { formatDate, formatDuration, toFaDigits } from '../utils/format'
import styles from './program.module.css'

const registry = createAppRegistry()

interface ProgramViewData {
  readonly plan: TrainingPlanRecord
  readonly doneIds: ReadonlySet<string>
  /** اجرای زنجیره‌ای بازِ امروز — برای برچسب «ادامهٔ اجرا» */
  readonly activeRun: ProgramRunRecord | null
  /** آخرین اجرای پایان‌یافتهٔ امروز + خلاصهٔ تحلیلی آن */
  readonly finishedRun: ProgramRunRecord | null
  readonly runSummary: ProgramRunSummary | null
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

      // اجراهای زنجیره‌ای امروز: اجرای باز برای برچسب ادامه؛ آخرین اجرای
      // پایان‌یافته برای کارت خلاصه (زمان کل و تحلیل)
      const runs = await appData.runs.listByDate(todayIso)
      const activeRun = findInProgressRun(runs)
      const finishedRun = [...runs].reverse().find((r) => r.status !== 'in_progress') ?? null
      let runSummary: ProgramRunSummary | null = null
      if (finishedRun) {
        // جلسات لینک‌شدهٔ همان اجرا با get — نه اسکن کامل جدول
        const linked = await Promise.all(
          finishedRun.sessionIds.map((id) => appData.sessions.get(id)),
        )
        runSummary = summarizeRun(
          finishedRun,
          linked.filter((s): s is NonNullable<typeof s> => s !== null),
        )
      }
      return { plan, doneIds, activeRun, finishedRun, runSummary }
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
  // تازه‌سازی دقیق پس از تغییر واقعی داده (پایان/ایجاد جلسه) — نه هر focus
  useEffect(() => subscribeToAppDataChanges(() => setReloadKey((k) => k + 1)), [])

  const totalMinutes =
    data?.plan.items.reduce((sum, item) => sum + item.estimatedMinutes, 0) ?? 0

  // نخستین آیتم در انتظار — مقصد دکمهٔ اجرای زنجیره‌ای
  const firstPending = data ? nextPendingItem(data.plan.items, data.doneIds) : null

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
          <div className={styles.dateRow}>
            <span className={styles.todayDate}>{formatDate(Date.now())}</span>
            <span className={styles.totalLine}>
              {PROGRAM_TEXTS_FA.estimatedTotal}: {toFaDigits(totalMinutes)}{' '}
              {PROGRAM_TEXTS_FA.minutesUnit} · {PROGRAM_TEXTS_FA.targetRange}
            </span>
          </div>

          {firstPending ? (
            <Link
              to={`/play/${firstPending.exerciseId}?run=${data.plan.date}`}
              className={styles.runLink}
              data-testid="program-run-start"
            >
              <span className={styles.runLinkTitle}>
                {data.activeRun ? PROGRAM_TEXTS_FA.runContinue : PROGRAM_TEXTS_FA.runStart}
              </span>
              <span className={styles.runLinkHint}>
                {toFaDigits(data.plan.items.length - data.doneIds.size)}{' '}
                {APP_TEXTS_FA.exerciseCountUnit} · {toFaDigits(totalMinutes)}{' '}
                {PROGRAM_TEXTS_FA.minutesUnit}
              </span>
              <ForwardGlyph size={18} className={styles.runLinkArrow} />
            </Link>
          ) : null}

          {data.finishedRun ? (
            <div className={styles.runSummaryCard} data-testid="program-run-summary">
              <span className={styles.runSummaryTitle}>
                {PROGRAM_TEXTS_FA.runSummaryTitle}
                {' · '}
                {data.finishedRun.status === 'completed'
                  ? PROGRAM_TEXTS_FA.runSummaryDone
                  : PROGRAM_TEXTS_FA.runSummaryAborted}
              </span>
              {data.runSummary ? (
                <span className={styles.runSummaryLine}>
                  {PROGRAM_TEXTS_FA.runTotalTime}:{' '}
                  {formatDuration(data.finishedRun.durationMs ?? 0)}
                  {' · '}
                  {toFaDigits(data.runSummary.completedSessions)} {PROGRAM_TEXTS_FA.runSessions}
                  {data.runSummary.meanAccuracy !== null
                    ? ` · ${PROGRAM_TEXTS_FA.runMeanAccuracy}: ${toFaDigits(data.runSummary.meanAccuracy)}٪`
                    : ''}
                  {' · '}
                  {PROGRAM_TEXTS_FA.runActiveTime}: {formatDuration(data.runSummary.activeMs)}
                </span>
              ) : null}
            </div>
          ) : null}

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
                  data-domain={meta?.domain}
                >
                  {meta ? (
                    <span className={styles.itemTile} data-type={meta.exerciseType}>
                      <TypeGlyph type={meta.exerciseType} size={18} />
                    </span>
                  ) : null}
                  <span className={styles.itemBody}>
                    <span className={styles.itemName}>{meta?.nameFa ?? item.exerciseId}</span>
                    <span className={styles.itemMeta}>
                      {meta ? DOMAIN_LABELS_FA[meta.domain] : ''} · {PROGRAM_TEXTS_FA.suggestedLevel}{' '}
                      {toFaDigits(item.difficulty)} · {toFaDigits(item.estimatedMinutes)}{' '}
                      {PROGRAM_TEXTS_FA.minutesUnit}
                    </span>
                  </span>
                  <span className={done ? styles.badgeDone : styles.badgePending}>
                    {done ? PROGRAM_TEXTS_FA.statusDone : PROGRAM_TEXTS_FA.statusPending}
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

      <details className={styles.guidelineDetails}>
        <summary>اصول طراحی برنامهٔ روزانه</summary>
        <p className={styles.guideline}>{PROGRAM_TEXTS_FA.guideline}</p>
      </details>
      <footer className={styles.footer}>
        <p className={styles.disclaimer}>{APP_TEXTS_FA.disclaimer}</p>
      </footer>
    </main>
  )
}
