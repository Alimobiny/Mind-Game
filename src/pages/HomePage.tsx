import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadProgressForExercises } from '../analytics/dashboard'
import type { AdaptiveDifficultyResult } from '../core/difficulty/adaptive-difficulty'
import { describeStreakFa } from '../core/difficulty/adaptive-difficulty'
import { getAppData } from '../data/app-data'
import { APP_TEXTS_FA, DOMAIN_LABELS_FA, PROGRAM_TEXTS_FA } from '../i18n/fa'
import { COGNITIVE_DOMAINS } from '../core/types'
import { createAppRegistry } from '../modules'
import { formatDate, toFaDigits } from '../utils/format'
import styles from './home.module.css'

const registry = createAppRegistry()

export function HomePage() {
  const exercises = useMemo(() => registry.list(), [])
  const activeDomains = useMemo(() => registry.activeDomains(), [])
  const [progress, setProgress] = useState<Record<string, AdaptiveDifficultyResult> | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // وضعیت پیشرفت هر بازی (سطح پیشنهادی، رکورد، آخرین تمرین) از داده خام
  useEffect(() => {
    let cancelled = false
    void getAppData().then((appData) => {
      void loadProgressForExercises(
        appData.sessions,
        exercises.map((e) => e.meta.id),
      ).then((result) => {
        if (!cancelled) setProgress(result)
      })
    })
    return () => {
      cancelled = true
    }
  }, [exercises, refreshKey])

  // تازه‌سازی پیشرفت وقتی از صفحه بازی برمی‌گردیم
  useEffect(() => {
    const onFocus = () => setRefreshKey((k) => k + 1)
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  return (
    <main className="app-shell">
      <header className={styles.hero}>
        <h1>{APP_TEXTS_FA.appName}</h1>
        <p className={styles.subtitle}>{APP_TEXTS_FA.appSubtitle}</p>
        <Link to="/program" className={styles.programLink}>
          <span className={styles.programTitle}>{PROGRAM_TEXTS_FA.title}</span>
          <span className={styles.programHint}>{PROGRAM_TEXTS_FA.entryHint}</span>
        </Link>
      </header>

      {activeDomains.map((domain) => {
        const domainExercises = exercises.filter((e) => e.meta.domain === domain)
        if (domainExercises.length === 0) return null
        return (
          <section key={domain} className={styles.domainSection} aria-labelledby={`domain-${domain}`}>
            <h2 id={`domain-${domain}`}>{DOMAIN_LABELS_FA[domain]}</h2>
            <div className={styles.exerciseGrid}>
              {domainExercises.map((exercise) => {
                const p = progress?.[exercise.meta.id]
                return (
                  <Link
                    to={`/play/${exercise.meta.id}`}
                    className={styles.exerciseCard}
                    key={exercise.meta.id}
                  >
                    <span className={styles.exerciseName}>{exercise.meta.nameFa}</span>
                    <span className={styles.exerciseDesc}>{exercise.meta.descriptionFa}</span>
                    <span className={styles.exerciseMeta}>
                      {p
                        ? `سطح ${toFaDigits(p.recommendedLevel)} · ${toFaDigits(p.totalSessions)} جلسه · ${describeStreakFa(p)}`
                        : `${toFaDigits(exercise.meta.difficultyLevels.length)} سطح · نسخه ${exercise.meta.version}`}
                    </span>
                    {p?.lastPlayedIsoDate ? (
                      <span className={styles.lastPlayed}>
                        آخرین تمرین: {formatDate(new Date(`${p.lastPlayedIsoDate}T12:00:00`).getTime())}
                      </span>
                    ) : null}
                  </Link>
                )
              })}
            </div>
          </section>
        )
      })}

      {COGNITIVE_DOMAINS.length > activeDomains.length ? (
        <p className={styles.comingSoon}>
          {toFaDigits(COGNITIVE_DOMAINS.length - activeDomains.length)} حوزه دیگر در فازهای بعدی
          اضافه می‌شوند؛ اولویت با تکمیل و اعتبارسنجی هر حوزه است.
        </p>
      ) : (
        <p className={styles.comingSoon}>هر هفت حوزه شناختی فعال است.</p>
      )}

      <footer className={styles.footer}>
        <Link to="/reports" className={styles.reportsLink}>
          {APP_TEXTS_FA.reports}
        </Link>
        <p className={styles.disclaimer}>{APP_TEXTS_FA.disclaimer}</p>
      </footer>
    </main>
  )
}
