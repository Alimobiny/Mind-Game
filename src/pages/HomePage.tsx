import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { createAppRegistry } from '../modules'
import { APP_TEXTS_FA, DOMAIN_LABELS_FA } from '../i18n/fa'
import { COGNITIVE_DOMAINS } from '../core/types'
import styles from './home.module.css'

const registry = createAppRegistry()

export function HomePage() {
  const exercises = useMemo(() => registry.list(), [])
  const activeDomains = useMemo(() => registry.activeDomains(), [])

  return (
    <main className="app-shell">
      <header className={styles.hero}>
        <h1>{APP_TEXTS_FA.appName}</h1>
        <p className={styles.subtitle}>{APP_TEXTS_FA.appSubtitle}</p>
      </header>

      {activeDomains.map((domain) => {
        const domainExercises = exercises.filter((e) => e.meta.domain === domain)
        if (domainExercises.length === 0) return null
        return (
          <section key={domain} className={styles.domainSection} aria-labelledby={`domain-${domain}`}>
            <h2 id={`domain-${domain}`}>{DOMAIN_LABELS_FA[domain]}</h2>
            <div className={styles.exerciseGrid}>
              {domainExercises.map((exercise) => (
                <Link
                  to={`/play/${exercise.meta.id}`}
                  className={styles.exerciseCard}
                  key={exercise.meta.id}
                >
                  <span className={styles.exerciseName}>{exercise.meta.nameFa}</span>
                  <span className={styles.exerciseDesc}>{exercise.meta.descriptionFa}</span>
                  <span className={styles.exerciseMeta}>
                    {toFaLevel(exercise.meta.difficultyLevels.length)} سطح · نسخه{' '}
                    {exercise.meta.version}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )
      })}

      {COGNITIVE_DOMAINS.length > activeDomains.length ? (
        <p className={styles.comingSoon}>
          {toFaLevel(COGNITIVE_DOMAINS.length - activeDomains.length)} حوزه دیگر در فازهای بعدی
          اضافه می‌شوند؛ ابتدا معماری MVP اعتبارسنجی می‌شود.
        </p>
      ) : null}

      <footer className={styles.footer}>
        <Link to="/reports" className={styles.reportsLink}>
          {APP_TEXTS_FA.reports}
        </Link>
        <p className={styles.disclaimer}>{APP_TEXTS_FA.disclaimer}</p>
      </footer>
    </main>
  )
}

function toFaLevel(n: number): string {
  return String(n).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)] as string)
}
