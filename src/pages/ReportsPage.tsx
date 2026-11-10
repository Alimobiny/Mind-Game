import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { accuracySparklinePath, loadDashboard } from '../analytics/dashboard'
import type { DashboardTotals, ExerciseProgress } from '../analytics/dashboard'
import type { SessionRecord } from '../core/types'
import { getAppData } from '../data/app-data'
import { createAppRegistry } from '../modules'
import { DOMAIN_LABELS_FA } from '../i18n/fa'
import { APP_TEXTS_FA } from '../i18n/fa'
import { formatDateTime, formatDuration, toFaDigits } from '../utils/format'
import styles from './reports.module.css'

const registry = createAppRegistry()

interface ReportsData {
  totals: DashboardTotals
  recent: readonly SessionRecord[]
  byExercise: readonly ExerciseProgress[]
}

export function ReportsPage() {
  const [data, setData] = useState<ReportsData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void getAppData()
      .then((appData) => loadDashboard(appData.sessions))
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch(() => {
        if (!cancelled) setError('خواندن گزارش‌ها ناموفق بود.')
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <main className="app-shell">
      <header className={styles.header}>
        <h1>{APP_TEXTS_FA.reports}</h1>
        <Link to="/" className={styles.backLink}>
          {APP_TEXTS_FA.home}
        </Link>
      </header>

      {error ? <p className={styles.empty}>{error}</p> : null}

      {!error && data ? (
        data.totals.completedSessions === 0 ? (
          <p className={styles.empty}>
            هنوز جلسه‌ای کامل نشده است. یک تمرین را از فهرست شروع کن؛ نتیجه‌ها همین‌جا نمایش
            داده می‌شوند.
          </p>
        ) : (
          <>
            <section className={styles.cardsGrid} aria-label="خلاصه کلی">
              <div className={styles.card}>
                <div className={styles.cardValue}>{toFaDigits(data.totals.completedSessions)}</div>
                <div className={styles.cardLabel}>جلسه کامل‌شده</div>
              </div>
              <div className={styles.card}>
                <div className={styles.cardValue}>
                  {data.totals.accuracyPercent === null
                    ? '—'
                    : `${toFaDigits(data.totals.accuracyPercent)}٪`}
                </div>
                <div className={styles.cardLabel}>دقت کل</div>
              </div>
              <div className={styles.card}>
                <div className={styles.cardValue}>{toFaDigits(data.totals.totalTrials)}</div>
                <div className={styles.cardLabel}>مراحل تمرین‌شده</div>
              </div>
              <div className={styles.card}>
                <div className={styles.cardValue}>{formatDuration(data.totals.totalActiveMs)}</div>
                <div className={styles.cardLabel}>زمان تمرین فعال</div>
              </div>
              <div className={styles.card}>
                <div className={styles.cardValue}>
                  {toFaDigits(data.totals.activeDomains.length)} از {toFaDigits(7)}
                </div>
                <div className={styles.cardLabel}>حوزه‌های فعال</div>
              </div>
            </section>

            <section aria-label="روند هر تمرین">
              <h2 className={styles.sectionTitle}>روند تمرین‌ها</h2>
              {data.byExercise.map((progress) => {
                const meta = registry.get(progress.exerciseId)?.meta
                return (
                  <div className={styles.exerciseRow} key={progress.exerciseId}>
                    <div className={styles.exerciseInfo}>
                      <span className={styles.exerciseName}>{meta?.nameFa ?? progress.exerciseId}</span>
                      <span className={styles.exerciseDomain}>
                        {meta ? DOMAIN_LABELS_FA[meta.domain] : ''}
                      </span>
                    </div>
                    <svg
                      className={styles.sparkline}
                      viewBox="0 0 220 48"
                      role="img"
                      aria-label={`روند دقت ${meta?.nameFa ?? ''}`}
                    >
                      <path
                        d={accuracySparklinePath(progress.accuracySeries)}
                        fill="none"
                        stroke="var(--color-primary)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className={styles.exerciseStats}>
                      <span>{toFaDigits(progress.sessionCount)} جلسه</span>
                      <span>بهترین: {toFaDigits(progress.bestAccuracy)}٪</span>
                    </div>
                  </div>
                )
              })}
            </section>

            <section aria-label="جلسات اخیر">
              <h2 className={styles.sectionTitle}>جلسات اخیر</h2>
              <ul className={styles.sessionList}>
                {data.recent.map((session) => {
                  const meta = registry.get(session.exerciseId)?.meta
                  return (
                    <li className={styles.sessionItem} key={session.id}>
                      <span className={styles.sessionName}>{meta?.nameFa ?? session.exerciseId}</span>
                      <span className={styles.sessionMeta}>
                        {formatDateTime(session.startedAt)} · سطح {toFaDigits(session.difficulty)}
                      </span>
                      <span className={styles.sessionAccuracy}>
                        {session.summary ? `${toFaDigits(session.summary.accuracy)}٪` : '—'}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </section>

            <p className={styles.disclaimer}>{APP_TEXTS_FA.disclaimer}</p>
          </>
        )
      ) : !error ? (
        <p className={styles.empty}>در حال خواندن داده‌ها…</p>
      ) : null}
    </main>
  )
}
