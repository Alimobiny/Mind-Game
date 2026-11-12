import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadProgressForExercises } from '../analytics/dashboard'
import type { AdaptiveDifficultyResult } from '../core/difficulty/adaptive-difficulty'
import { describeStreakFa, toLocalIsoDate } from '../core/difficulty/adaptive-difficulty'
import { buildHeatmapWeeks, groupSessionsByDay } from '../analytics/journey'
import type { HeatCell } from '../analytics/journey'
import { getAppData } from '../data/app-data'
import { APP_TEXTS_FA, DOMAIN_LABELS_FA, EXERCISE_TYPE_LABELS_FA, PROGRAM_TEXTS_FA } from '../i18n/fa'
import { COGNITIVE_DOMAINS, EXERCISE_TYPES } from '../core/types'
import type { CognitiveDomain, ExerciseType } from '../core/types'
import { createAppRegistry } from '../modules'
import type { RegisteredExercise } from '../core/registry/game-registry'
import { formatDate, toFaDigits } from '../utils/format'
import { LogoMark } from '../components/icons/LogoMark'
import { DomainEmblem } from '../components/icons/DomainEmblems'
import { TypeGlyph } from '../components/icons/TypeGlyphs'
import { ActivityHeatmap } from '../components/journey/ActivityHeatmap'
import { CalendarGlyph, ChartGlyph, FlagGlyph, FlameGlyph, ForwardGlyph } from '../components/icons/UiGlyphs'
import styles from './home.module.css'

const registry = createAppRegistry()

/** نماهای گروه‌بندی فهرست — طبقه‌بندی و دسترسی بر اساس حوزه/نوع/اثر */
type ViewMode = 'domain' | 'type' | 'effect'

interface ExerciseGroup {
  readonly key: string
  readonly label: string
  /** سرفصل در نمای نوع، گلیف نوع دارد؛ در دو نمای دیگر نشان حوزه */
  readonly kind: 'domain' | 'type'
  readonly list: readonly RegisteredExercise[]
}

const VIEW_LABELS: Readonly<Record<ViewMode, string>> = {
  domain: APP_TEXTS_FA.groupByDomain,
  type: APP_TEXTS_FA.groupByType,
  effect: APP_TEXTS_FA.groupByEffect,
}

export function HomePage() {
  const exercises = useMemo(() => registry.list(), [])
  const activeDomains = useMemo(() => registry.activeDomains(), [])
  const [viewMode, setViewMode] = useState<ViewMode>('domain')
  const [progress, setProgress] = useState<Record<string, AdaptiveDifficultyResult> | null>(null)
  /** ستون‌های تقویم فشردهٔ فعالیت — مسیر سبک، بدون محاسبهٔ سنگین سیر پیشرفت */
  const [heatmapWeeks, setHeatmapWeeks] = useState<ReadonlyArray<ReadonlyArray<HeatCell>>>([])
  const [refreshKey, setRefreshKey] = useState(0)

  // وضعیت پیشرفت هر بازی (سطح پیشنهادی، رکورد، آخرین تمرین) از داده خام
  useEffect(() => {
    let cancelled = false
    void getAppData().then((appData) => {
      void appData.sessions.listRecent(Number.MAX_SAFE_INTEGER).then((recent) => {
        if (cancelled) return
        const days = groupSessionsByDay(recent)
        setHeatmapWeeks(buildHeatmapWeeks(days, toLocalIsoDate(Date.now()), 8))
      })
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

  // گروه‌بندی بر اساس نمای فعال:
  // حوزه → meta.domain · نوع → meta.exerciseType · اثر → effects[0] (اثر اصلی؛
  // هر تمرین دقیقاً یک‌بار ظاهر می‌شود تا انتخابگرهای تست تک‌نما بمانند)
  const groups = useMemo<ExerciseGroup[]>(() => {
    const byDomain = (pick: (e: RegisteredExercise) => CognitiveDomain | ExerciseType, kind: 'domain' | 'type') =>
      (kind === 'domain' ? COGNITIVE_DOMAINS : EXERCISE_TYPES)
        .map((key) => ({
          key: key as string,
          label: kind === 'domain' ? DOMAIN_LABELS_FA[key as CognitiveDomain] : EXERCISE_TYPE_LABELS_FA[key as ExerciseType],
          kind,
          list: exercises.filter((e) => pick(e) === key),
        }))
        .filter((g) => g.list.length > 0)

    if (viewMode === 'type') {
      return byDomain((e) => e.meta.exerciseType, 'type')
    }
    if (viewMode === 'effect') {
      return byDomain((e) => e.meta.effects[0] as CognitiveDomain, 'domain')
    }
    return byDomain((e) => e.meta.domain, 'domain')
  }, [viewMode, exercises])

  // کارت فعالیت فقط برای کاربرِ سابقه‌دار — نقشهٔ همه‌خامث برای کاربر تازه نویز است
  const hasActivity = useMemo(
    () => heatmapWeeks.some((week) => week.some((cell) => cell.level > 0)),
    [heatmapWeeks],
  )

  return (
    <main className="app-shell">
      <header className={styles.hero}>
        <div className={styles.brand}>
          <LogoMark size={46} className={styles.logo} />
          <div className={styles.brandText}>
            <h1 className={styles.appTitle}>{APP_TEXTS_FA.appName}</h1>
            <p className={styles.subtitle}>{APP_TEXTS_FA.appSubtitle}</p>
          </div>
        </div>
        <Link to="/program" className={styles.programLink}>
          <span className={styles.programIconWrap}>
            <CalendarGlyph size={22} />
          </span>
          <span className={styles.programTexts}>
            <span className={styles.programTitle}>{PROGRAM_TEXTS_FA.title}</span>
            <span className={styles.programHint}>{PROGRAM_TEXTS_FA.entryHint}</span>
          </span>
          <ForwardGlyph size={18} className={styles.programArrow} />
        </Link>
        {hasActivity ? (
          <Link to="/journey" className={styles.activityLink} data-testid="home-heatmap">
            <span className={styles.activityHead}>
              <FlameGlyph size={18} className={styles.activityIcon} />
              <span className={styles.activityTitle}>{APP_TEXTS_FA.recentActivity}</span>
              <span className={styles.activityHint}>{APP_TEXTS_FA.recentActivityHint}</span>
              <ForwardGlyph size={16} className={styles.programArrow} />
            </span>
            <ActivityHeatmap weeks={heatmapWeeks} compact />
          </Link>
        ) : null}
      </header>

      <div className={styles.viewSwitch} role="group" aria-label={APP_TEXTS_FA.groupSwitchLabel}>
        {(Object.keys(VIEW_LABELS) as ViewMode[]).map((mode) => (
          <button
            key={mode}
            type="button"
            className={styles.viewButton}
            aria-pressed={viewMode === mode}
            onClick={() => setViewMode(mode)}
            data-testid={`view-${mode}`}
          >
            {VIEW_LABELS[mode]}
          </button>
        ))}
      </div>

      {groups.map((group) => (
        <section
          key={`${viewMode}-${group.key}`}
          className={styles.domainSection}
          data-domain={group.kind === 'domain' ? group.key : undefined}
          aria-labelledby={`group-${viewMode}-${group.key}`}
        >
          <h2 id={`group-${viewMode}-${group.key}`} className={styles.sectionHeading}>
            {group.kind === 'domain' ? (
              <DomainEmblem domain={group.key as CognitiveDomain} size={20} className={styles.sectionIcon} />
            ) : (
              <span data-type={group.key} className={styles.sectionIconWrap}>
                <TypeGlyph type={group.key as ExerciseType} size={20} />
              </span>
            )}
            <span>{group.label}</span>
            <span className={styles.sectionCount}>
              {toFaDigits(group.list.length)} {APP_TEXTS_FA.exerciseCountUnit}
            </span>
          </h2>
          <div className={styles.exerciseGrid}>
            {group.list.map((exercise, index) => {
              const p = progress?.[exercise.meta.id]
              return (
                <Link
                  to={`/play/${exercise.meta.id}`}
                  className={styles.exerciseCard}
                  key={exercise.meta.id}
                  data-domain={exercise.meta.domain}
                  style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
                >
                  <span className={styles.cardHead}>
                    <span className={styles.typeTile} data-type={exercise.meta.exerciseType}>
                      <TypeGlyph type={exercise.meta.exerciseType} size={22} />
                    </span>
                    <span className={styles.cardTexts}>
                      <span className={styles.exerciseName}>{exercise.meta.nameFa}</span>
                      <span className={styles.exerciseDesc}>{exercise.meta.descriptionFa}</span>
                    </span>
                  </span>
                  <span className={styles.chipRow}>
                    <span className={styles.chip} data-type={exercise.meta.exerciseType}>
                      {EXERCISE_TYPE_LABELS_FA[exercise.meta.exerciseType]}
                    </span>
                    {exercise.meta.effects.map((effect) => (
                      <span key={effect} className={styles.chip} data-domain={effect}>
                        {DOMAIN_LABELS_FA[effect]}
                      </span>
                    ))}
                  </span>
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
      ))}

      {COGNITIVE_DOMAINS.length > activeDomains.length ? (
        <p className={styles.comingSoon}>
          {toFaDigits(COGNITIVE_DOMAINS.length - activeDomains.length)} حوزه دیگر در فازهای بعدی
          اضافه می‌شوند؛ اولویت با تکمیل و اعتبارسنجی هر حوزه است.
        </p>
      ) : (
        <p className={styles.comingSoon}>هر {toFaDigits(COGNITIVE_DOMAINS.length)} حوزهٔ شناختی فعال است.</p>
      )}

      <footer className={styles.footer}>
        <div className={styles.footerLinks}>
          <Link to="/journey" className={styles.journeyLink}>
            <FlagGlyph size={18} className={styles.journeyIcon} />
            {APP_TEXTS_FA.journey}
          </Link>
          <Link to="/reports" className={styles.reportsLink}>
            <ChartGlyph size={18} className={styles.reportsIcon} />
            {APP_TEXTS_FA.reports}
          </Link>
        </div>
        <p className={styles.disclaimer}>{APP_TEXTS_FA.disclaimer}</p>
      </footer>
    </main>
  )
}
