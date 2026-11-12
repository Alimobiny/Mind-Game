import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toLocalIsoDate } from '../core/difficulty/adaptive-difficulty'
import type { SessionRecord } from '../core/types'
import { getAppData } from '../data/app-data'
import { APP_TEXTS_FA, JOURNEY_TEXTS_FA } from '../i18n/fa'
import { buildHeatmapWeeks, loadJourney } from '../analytics/journey'
import type { JourneyData, JourneyMilestone } from '../analytics/journey'
import { createAppRegistry } from '../modules'
import { formatDate, formatDuration, toFaDigits } from '../utils/format'
import { DomainEmblem } from '../components/icons/DomainEmblems'
import { ChartGlyph, FlagGlyph, FlameGlyph } from '../components/icons/UiGlyphs'
import styles from './journey.module.css'

const registry = createAppRegistry()

interface JourneyPageState {
  readonly data: JourneyData | null
  readonly error: boolean
}

/** عنوان هر نشان از جنس و دادهٔ آن — کامپوزیشن طبق الگوی صفحات موجود */
function milestoneTitle(m: JourneyMilestone): string {
  switch (m.kind) {
    case 'first-session':
      return JOURNEY_TEXTS_FA.mFirstSession
    case 'domain-coverage':
      return JOURNEY_TEXTS_FA.mDomainCoverage
    case 'session-count':
      return `${toFaDigits(m.progress?.goal ?? 0)} ${JOURNEY_TEXTS_FA.mSessions}`
    case 'streak-days':
      return `${toFaDigits(m.progress?.goal ?? 0)} ${JOURNEY_TEXTS_FA.mStreakDays}`
    case 'level-up':
      return `${JOURNEY_TEXTS_FA.mLevelUp} · ${m.levelUp?.exerciseName ?? ''}`
  }
}

function MilestoneIcon({ m }: { m: JourneyMilestone }) {
  switch (m.kind) {
    case 'first-session':
      return <FlagGlyph size={22} />
    case 'domain-coverage':
      return <DomainEmblem domain="visual-spatial" size={22} />
    case 'session-count':
      return <ChartGlyph size={22} />
    case 'streak-days':
      return <FlameGlyph size={22} />
    case 'level-up':
      return <DomainEmblem domain="reasoning" size={22} />
  }
}

export function JourneyPage() {
  const exerciseNames = useMemo(
    () => new Map(registry.list().map((e) => [e.meta.id, e.meta.nameFa])),
    [],
  )
  const [state, setState] = useState<JourneyPageState>({ data: null, error: false })
  const [reloadKey, setReloadKey] = useState(0)
  const todayIso = toLocalIsoDate(Date.now())

  useEffect(() => {
    let cancelled = false
    void getAppData()
      .then((appData) =>
        loadJourney(appData.sessions, (id) => exerciseNames.get(id) ?? id, todayIso),
      )
      .then((data) => {
        if (!cancelled) setState({ data, error: false })
      })
      .catch(() => {
        if (!cancelled) setState({ data: null, error: true })
      })
    return () => {
      cancelled = true
    }
  }, [exerciseNames, reloadKey, todayIso])

  // تازه‌سازی وقتی از صفحه بازی برمی‌گردیم
  useEffect(() => {
    const onFocus = () => setReloadKey((k) => k + 1)
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  const weeks = useMemo(
    () => (state.data ? buildHeatmapWeeks(state.data.days, todayIso) : []),
    [state.data, todayIso],
  )

  // خط زمانی: جلسات اخیر گروه‌شده بر اساس روز (جدیدترین اول، تا ۱۴ روز فعال)
  const timelineDays = useMemo(() => {
    if (!state.data) return []
    const byDay = new Map<string, SessionRecord[]>()
    for (const session of state.data.recentSessions) {
      const iso = toLocalIsoDate(session.startedAt)
      const list = byDay.get(iso)
      if (list) list.push(session)
      else byDay.set(iso, [session])
    }
    return [...byDay.entries()]
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .slice(0, 14)
      .map(([isoDate, list]) => ({
        isoDate,
        sessions: [...list].sort((a, b) => a.startedAt - b.startedAt),
      }))
  }, [state.data])

  const hasData = state.data !== null && state.data.totals.completedSessions > 0

  return (
    <main className="app-shell">
      <header className={styles.header}>
        <h1>{JOURNEY_TEXTS_FA.title}</h1>
        <Link to="/" className={styles.backLink}>
          {JOURNEY_TEXTS_FA.backToHome}
        </Link>
      </header>

      {state.error ? <p className={styles.empty}>{JOURNEY_TEXTS_FA.loadError}</p> : null}
      {!state.error && !state.data ? (
        <p className={styles.empty}>{JOURNEY_TEXTS_FA.loading}</p>
      ) : null}
      {state.data && !hasData ? <p className={styles.empty}>{JOURNEY_TEXTS_FA.empty}</p> : null}

      {state.data && hasData ? (
        <>
          <section className={styles.cardsGrid} aria-label={JOURNEY_TEXTS_FA.statsLabel}>
            <div className={styles.card}>
              <span className={styles.cardValue}>{toFaDigits(state.data.streak.totalActiveDays)}</span>
              <span className={styles.cardLabel}>{JOURNEY_TEXTS_FA.activeDays}</span>
            </div>
            <div className={styles.card}>
              <span className={styles.cardValue}>
                {toFaDigits(state.data.streak.currentDays)}
                <span className={styles.cardUnit}> {JOURNEY_TEXTS_FA.dayUnit}</span>
              </span>
              <span className={styles.cardLabel}>{JOURNEY_TEXTS_FA.currentStreak}</span>
            </div>
            <div className={styles.card}>
              <span className={styles.cardValue}>
                {toFaDigits(state.data.streak.bestDays)}
                <span className={styles.cardUnit}> {JOURNEY_TEXTS_FA.dayUnit}</span>
              </span>
              <span className={styles.cardLabel}>{JOURNEY_TEXTS_FA.bestStreak}</span>
            </div>
            <div className={styles.card}>
              <span className={styles.cardValue}>
                {toFaDigits(state.data.totals.completedSessions)}
              </span>
              <span className={styles.cardLabel}>{JOURNEY_TEXTS_FA.totalSessions}</span>
            </div>
            <div className={styles.card}>
              <span className={styles.cardValue}>
                {formatDuration(state.data.totals.activeMs)}
              </span>
              <span className={styles.cardLabel}>{JOURNEY_TEXTS_FA.totalTime}</span>
            </div>
          </section>

          <h2 className={styles.sectionTitle}>{JOURNEY_TEXTS_FA.heatmapLabel}</h2>
          <div className={styles.heatmap} role="img" aria-label={JOURNEY_TEXTS_FA.heatmapLabel}>
            {weeks.map((week, wi) => (
              <div className={styles.heatColumn} key={wi}>
                {week.map((cell) => (
                  <span
                    key={cell.isoDate}
                    className={styles.heatCell}
                    data-testid="heat-cell"
                    data-level={cell.level}
                    title={`${cell.isoDate} — ${JOURNEY_TEXTS_FA.heatmapCellTitle(cell.completedSessions)}`}
                  />
                ))}
              </div>
            ))}
          </div>

          <h2 className={styles.sectionTitle}>{JOURNEY_TEXTS_FA.milestonesLabel}</h2>
          <p className={styles.honestNote}>{JOURNEY_TEXTS_FA.milestonesHonestNote}</p>
          <div className={styles.milestonesGrid}>
            {state.data.milestones.map((m) => (
              <div
                key={m.id}
                className={`${styles.milestone} ${m.achievedIsoDate ? styles.milestoneAchieved : ''}`}
                data-testid="milestone"
                data-achieved={m.achievedIsoDate !== null}
              >
                <span className={styles.milestoneIconWrap}>
                  <MilestoneIcon m={m} />
                </span>
                <span className={styles.milestoneTitle}>{milestoneTitle(m)}</span>
                {m.achievedIsoDate ? (
                  <span className={styles.milestoneDate}>
                    {JOURNEY_TEXTS_FA.achievedOn}:{' '}
                    {formatDate(new Date(`${m.achievedIsoDate}T12:00:00`).getTime())}
                  </span>
                ) : m.levelUp ? null : (
                  <span className={styles.milestoneProgress}>
                    {toFaDigits(m.progress?.current ?? 0)} از {toFaDigits(m.progress?.goal ?? 0)}
                  </span>
                )}
                {m.kind === 'level-up' && m.levelUp ? (
                  <span className={styles.milestoneProgress}>
                    {JOURNEY_TEXTS_FA.levelUpDetail(
                      toFaDigits(m.levelUp.from),
                      toFaDigits(m.levelUp.to),
                    )}
                  </span>
                ) : null}
              </div>
            ))}
          </div>

          <h2 className={styles.sectionTitle}>{JOURNEY_TEXTS_FA.timelineLabel}</h2>
          <ul className={styles.timeline}>
            {timelineDays.map((day) => (
              <li key={day.isoDate} className={styles.timelineDay} data-testid="journey-day">
                <span className={styles.timelineDate}>
                  {formatDate(new Date(`${day.isoDate}T12:00:00`).getTime())}
                </span>
                <div className={styles.timelineChips}>
                  {day.sessions.map((session) => {
                    const meta = registry.get(session.exerciseId)?.meta
                    return (
                      <span
                        key={session.id}
                        className={styles.sessionChip}
                        data-domain={session.domain}
                        data-aborted={session.status !== 'completed'}
                      >
                        <span className={styles.chipName}>
                          {meta?.nameFa ?? session.exerciseId}
                        </span>
                        <span className={styles.chipMeta}>
                          {session.status === 'completed'
                            ? `سطح ${toFaDigits(session.difficulty)} · ${toFaDigits(session.summary?.accuracy ?? 0)}٪`
                            : JOURNEY_TEXTS_FA.sessionAborted}
                        </span>
                      </span>
                    )
                  })}
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <footer className={styles.footer}>
        <p className={styles.disclaimer}>{APP_TEXTS_FA.disclaimer}</p>
      </footer>
    </main>
  )
}
