import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  accuracySparklinePath,
  loadDashboard,
  loadProgressForExercises,
} from '../analytics/dashboard'
import type { AdaptiveDifficultyResult, DashboardTotals, ExerciseProgress } from '../analytics/dashboard'
import type { SessionRecord } from '../core/types'
import { describeStreakFa } from '../core/difficulty/adaptive-difficulty'
import {
  createBackup,
  downloadBackupFile,
  restoreBackup,
  validateBackup,
} from '../data/export-import'
import { getAppData } from '../data/app-data'
import { createAppRegistry } from '../modules'
import { DOMAIN_LABELS_FA } from '../i18n/fa'
import { APP_TEXTS_FA } from '../i18n/fa'
import { formatDate, formatDateTime, formatDuration, toFaDigits } from '../utils/format'
import styles from './reports.module.css'

const registry = createAppRegistry()

interface ReportsData {
  totals: DashboardTotals
  recent: readonly SessionRecord[]
  byExercise: readonly ExerciseProgress[]
  progress: Record<string, AdaptiveDifficultyResult>
}

export function ReportsPage() {
  const [data, setData] = useState<ReportsData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [backupMessage, setBackupMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    void getAppData()
      .then(async (appData) => {
        const dashboard = await loadDashboard(appData.sessions)
        const progress = await loadProgressForExercises(
          appData.sessions,
          registry.list().map((e) => e.meta.id),
        )
        return { ...dashboard, progress }
      })
      .then((result) => {
        if (!cancelled) setData(result)
      })
      .catch(() => {
        if (!cancelled) setError('خواندن گزارش‌ها ناموفق بود.')
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const handleExport = async () => {
    setBackupMessage(null)
    try {
      const appData = await getAppData()
      const backup = await createBackup(appData.sessions, appData.trialEvents)
      downloadBackupFile(backup)
      setBackupMessage(
        `پشتیبان ساخته شد: ${toFaDigits(backup.sessions.length)} جلسه و ${toFaDigits(backup.trialEvents.length)} رویداد.`,
      )
    } catch {
      setBackupMessage('ساخت فایل پشتیبان ناموفق بود.')
    }
  }

  const handleImportFile = async (file: File) => {
    setBackupMessage(null)
    try {
      const text = await file.text()
      const backup = validateBackup(JSON.parse(text))
      const appData = await getAppData()
      const result = await restoreBackup(backup, appData.sessions, appData.trialEvents)
      setBackupMessage(
        `بازیابی شد: ${toFaDigits(result.sessionsImported)} جلسه و ${toFaDigits(result.trialEventsImported)} رویداد (ادغام بدون حذف).`,
      )
      setReloadKey((k) => k + 1)
    } catch (e) {
      // خطای JSON خراب پیام انگلیسی SyntaxError دارد؛ پیام فارسی واضح بده
      setBackupMessage(
        e instanceof SyntaxError
          ? 'فایل پشتیبان JSON معتبر نیست — فایل خراب یا ناقص است.'
          : e instanceof Error
            ? e.message
            : 'بازیابی فایل ناموفق بود.',
      )
    }
  }

  return (
    <main className="app-shell">
      <header className={styles.header}>
        <h1>{APP_TEXTS_FA.reports}</h1>
        <Link to="/" className={styles.backLink}>
          {APP_TEXTS_FA.home}
        </Link>
      </header>

      {error ? <p className={styles.empty}>{error}</p> : null}

      {/* پشتیبان‌گیری و بازیابی — داده‌ها فقط روی دستگاه شما هستند */}
      <section className={styles.backupSection} aria-label="پشتیبان‌گیری داده‌ها">
        <h2 className={styles.sectionTitle}>پشتیبان‌گیری داده‌ها</h2>
        <p className={styles.backupHint}>
          پیشرفت شما فقط روی همین دستگاه ذخیره می‌شود. با «خروجی پشتیبان» یک فایل JSON بگیرید و
          روی دستگاه دیگر (یا پس از تعویض مرورگر) با «بازیابی» آن را برگردانید — بازیابی
          داده‌های موجود را حذف نمی‌کند، فقط ادغام می‌کند.
        </p>
        <div className={styles.backupActions}>
          <button type="button" className={styles.backupButton} onClick={() => void handleExport()}>
            خروجی پشتیبان (JSON)
          </button>
          <button
            type="button"
            className={styles.backupButtonSecondary}
            onClick={() => fileInputRef.current?.click()}
          >
            بازیابی از فایل
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className={styles.hiddenInput}
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void handleImportFile(file)
              e.target.value = ''
            }}
          />
        </div>
        {backupMessage ? <p className={styles.backupMessage}>{backupMessage}</p> : null}
      </section>

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
              <div className={styles.card}>
                <div className={styles.cardValue}>{toFaDigits(registry.list().length)}</div>
                <div className={styles.cardLabel}>بازی‌های موجود</div>
              </div>
            </section>

            <section aria-label="روند هر تمرین">
              <h2 className={styles.sectionTitle}>روند تمرین‌ها</h2>
              {data.byExercise.map((progress) => {
                const meta = registry.get(progress.exerciseId)?.meta
                const adaptive = data.progress[progress.exerciseId]
                return (
                  <div className={styles.exerciseRow} key={progress.exerciseId}>
                    <div className={styles.exerciseInfo}>
                      <span className={styles.exerciseName}>{meta?.nameFa ?? progress.exerciseId}</span>
                      <span className={styles.exerciseDomain}>
                        {meta ? DOMAIN_LABELS_FA[meta.domain] : ''}
                      </span>
                      {adaptive ? (
                        <span className={styles.exerciseAdaptive}>
                          سطح {toFaDigits(adaptive.recommendedLevel)} · {describeStreakFa(adaptive)}
                        </span>
                      ) : null}
                      {adaptive && adaptive.levelHistory.length > 0 ? (
                        <span className={styles.levelTimeline}>
                          {adaptive.levelHistory
                            .map(
                              (c) =>
                                `${toFaDigits(c.from)}→${toFaDigits(c.to)} (${formatDate(
                                  new Date(`${c.isoDate}T12:00:00`).getTime(),
                                )})`,
                            )
                            .join(' · ')}
                        </span>
                      ) : null}
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
                        {session.status === 'completed' ? '' : ' · ناتمام'}
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
