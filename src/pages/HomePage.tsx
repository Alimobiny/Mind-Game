import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadProgressForExercises } from '../analytics/dashboard'
import type { AdaptiveDifficultyResult } from '../core/difficulty/adaptive-difficulty'
import { describeStreakFa, toLocalIsoDate } from '../core/difficulty/adaptive-difficulty'
import { buildHeatmapWeeks, groupSessionsByDay } from '../analytics/journey'
import type { HeatCell } from '../analytics/journey'
import { getAppData, subscribeToAppDataChanges } from '../data/app-data'
import { APP_TEXTS_FA, DOMAIN_LABELS_FA, EXERCISE_TYPE_LABELS_FA, FAMILY_LABELS_FA, PROGRAM_TEXTS_FA } from '../i18n/fa'
import { COGNITIVE_DOMAINS } from '../core/types'
import type { CognitiveDomain, ExerciseType } from '../core/types'
import type { ExerciseMeta } from '../core/registry/game-registry'
// کاتالوگ متادیتا — بدون بار موتورها؛ صفحات فهرست‌محور فقط متا لازم دارند
import { GAME_CATALOG } from '../modules/catalog'
import { activeCatalogDomains, groupCatalog, searchCatalog, type CatalogViewMode } from './home-catalog'
import { formatDate, toFaDigits } from '../utils/format'
import { LogoMark } from '../components/icons/LogoMark'
import { DomainEmblem } from '../components/icons/DomainEmblems'
import { TypeGlyph } from '../components/icons/TypeGlyphs'
import { ActivityHeatmap } from '../components/journey/ActivityHeatmap'
import { CalendarGlyph, ChartGlyph, CloseGlyph, FlagGlyph, FlameGlyph, ForwardGlyph } from '../components/icons/UiGlyphs'
import styles from './home.module.css'

/** نماهای گروه‌بندی فهرست — حوزه/نوع/اثر/خانواده (منطق خالص در home-catalog) */
type ViewMode = CatalogViewMode

const VIEW_LABELS: Readonly<Record<ViewMode, string>> = {
  domain: APP_TEXTS_FA.groupByDomain,
  type: APP_TEXTS_FA.groupByType,
  effect: APP_TEXTS_FA.groupByEffect,
  family: APP_TEXTS_FA.groupByFamily,
}

export function HomePage() {
  const exercises = useMemo(() => GAME_CATALOG, [])
  const activeDomains = useMemo(() => activeCatalogDomains(exercises), [exercises])
  const [viewMode, setViewMode] = useState<ViewMode>('domain')
  /** جستجوی زندهٔ بازی — خالی یعنی حالت مرور گروه‌بندی‌شده */
  const [search, setSearch] = useState('')
  /** بخش‌های تاشوی باز — پیش‌فرض فقط نخستین بخش هر نما */
  const [openSections, setOpenSections] = useState<ReadonlySet<string>>(() => new Set())
  const [progress, setProgress] = useState<Record<string, AdaptiveDifficultyResult> | null>(null)
  /** ستون‌های تقویم فشردهٔ فعالیت — مسیر سبک، بدون محاسبهٔ سنگین سیر پیشرفت */
  const [heatmapWeeks, setHeatmapWeeks] = useState<ReadonlyArray<ReadonlyArray<HeatCell>>>([])
  const [refreshKey, setRefreshKey] = useState(0)

  // وضعیت پیشرفت هر بازی (سطح پیشنهادی، رکورد، آخرین تمرین) از داده خام —
  // یک خواندن کامل جدول که به هر دو تجمیع (تقویم + پیشرفت) می‌رسد
  useEffect(() => {
    let cancelled = false
    void getAppData().then((appData) => {
      void appData.sessions.listRecent(Number.MAX_SAFE_INTEGER).then((recent) => {
        if (cancelled) return
        const days = groupSessionsByDay(recent)
        setHeatmapWeeks(buildHeatmapWeeks(days, toLocalIsoDate(Date.now()), 8))
        void loadProgressForExercises(recent, exercises.map((m) => m.id)).then((result) => {
          if (!cancelled) setProgress(result)
        })
      })
    })
    return () => {
      cancelled = true
    }
  }, [exercises, refreshKey])
  // تازه‌سازی دقیق پس از تغییر واقعی داده (پایان/ایجاد جلسه) — نه هر focus
  useEffect(() => subscribeToAppDataChanges(() => setRefreshKey((k) => k + 1)), [])

  // گروه‌بندی بر اساس نمای فعال — منطق خالص و تست‌شده در home-catalog.ts
  // (حوزه/نوع/اثر/خانواده؛ هر تمرین دقیقاً یک‌بار ظاهر می‌شود)
  const groups = useMemo(() => groupCatalog(exercises, viewMode), [viewMode, exercises])

  // با تعویض نما، حالت تاشو به پیش‌فرض برمی‌گردد: فقط نخستین بخش باز
  const firstGroupKey = groups.length > 0 ? `${viewMode}-${groups[0]?.key}` : null
  useEffect(() => {
    if (firstGroupKey !== null) {
      setOpenSections(new Set([firstGroupKey]))
    }
  }, [viewMode, firstGroupKey])

  const toggleSection = (sectionKey: string) => {
    setOpenSections((current) => {
      const next = new Set(current)
      if (next.has(sectionKey)) next.delete(sectionKey)
      else next.add(sectionKey)
      return next
    })
  }

  /** جست‌وجوی نرمال‌شده — نام/شرح/انگلیسی/شناسه/خانواده/کلیدواژه‌ها (home-catalog) */
  const trimmedQuery = search.trim()
  const searchResults = useMemo(
    () => (trimmedQuery === '' ? null : searchCatalog(exercises, trimmedQuery)),
    [exercises, trimmedQuery],
  )

  // کارت فعالیت فقط برای کاربرِ سابقه‌دار — نقشهٔ همه‌خامث برای کاربر تازه نویز است
  const hasActivity = useMemo(
    () => heatmapWeeks.some((week) => week.some((cell) => cell.level > 0)),
    [heatmapWeeks],
  )

  /** کارت تمرین — مشترک بین بخش‌های تاشو و نتایج جستجو (مارک‌آپ واحد برای تست‌ها) */
  const renderExerciseCard = (meta: ExerciseMeta, index: number) => {
    const p = progress?.[meta.id]
    return (
      <Link
        to={`/play/${meta.id}`}
        className={styles.exerciseCard}
        key={meta.id}
        data-domain={meta.domain}
        style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
      >
        <span className={styles.cardHead}>
          <span className={styles.typeTile} data-type={meta.exerciseType}>
            <TypeGlyph type={meta.exerciseType} size={22} />
          </span>
          <span className={styles.cardTexts}>
            <span className={styles.exerciseName}>{meta.nameFa}</span>
            <span className={styles.exerciseDesc}>{meta.descriptionFa}</span>
          </span>
        </span>
        <span className={styles.chipRow}>
          <span className={styles.chip} data-type={meta.exerciseType}>
            {EXERCISE_TYPE_LABELS_FA[meta.exerciseType]}
          </span>
          <span className={styles.chip} data-family={meta.family}>
            {FAMILY_LABELS_FA[meta.family]}
          </span>
          {meta.effects.map((effect) => (
            <span key={effect} className={styles.chip} data-domain={effect}>
              {DOMAIN_LABELS_FA[effect]}
            </span>
          ))}
        </span>
        <span className={styles.exerciseMeta}>
          {p
            ? `سطح ${toFaDigits(p.recommendedLevel)} · ${toFaDigits(p.totalSessions)} جلسه · ${describeStreakFa(p)}`
            : `${toFaDigits(meta.difficultyLevels.length)} سطح · نسخه ${meta.version}`}
        </span>
        {p?.lastPlayedIsoDate ? (
          <span className={styles.lastPlayed}>
            آخرین تمرین: {formatDate(new Date(`${p.lastPlayedIsoDate}T12:00:00`).getTime())}
          </span>
        ) : null}
      </Link>
    )
  }

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

      {/* دسترسی سریع — جستجوی زندهٔ بازی؛ الگوی ترکیبی NN/g برای فهرست‌های طولانی دسته‌بندی‌شده */}
      <div className={styles.searchRow} role="search">
        <input
          type="search"
          className={styles.searchInput}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={APP_TEXTS_FA.searchPlaceholder}
          aria-label={APP_TEXTS_FA.searchPlaceholder}
          data-testid="game-search"
        />
        {trimmedQuery !== '' ? (
          <button
            type="button"
            className={styles.searchClear}
            onClick={() => setSearch('')}
            aria-label={APP_TEXTS_FA.searchClear}
            data-testid="game-search-clear"
          >
            <CloseGlyph size={18} />
          </button>
        ) : null}
      </div>

      {searchResults !== null ? (
        // نمای نتایج جستجو — تخت، با همان کارت‌های فهرست
        <section className={styles.domainSection} aria-label={APP_TEXTS_FA.searchResults}>
          <h2 className={styles.sectionHeading}>
            {APP_TEXTS_FA.searchResults}
            <span className={styles.sectionCount}>
              {toFaDigits(searchResults.length)} {APP_TEXTS_FA.exerciseCountUnit}
            </span>
          </h2>
          {searchResults.length === 0 ? (
            <p className={styles.searchEmpty} data-testid="search-empty">
              {APP_TEXTS_FA.searchEmpty}
            </p>
          ) : (
            <div className={styles.exerciseGrid}>
              {searchResults.map((exercise, index) => renderExerciseCard(exercise, index))}
            </div>
          )}
        </section>
      ) : (
        <>
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

          {groups.map((group) => {
            const sectionKey = `${viewMode}-${group.key}`
            const open = openSections.has(sectionKey)
            return (
              <section
                key={sectionKey}
                className={styles.domainSection}
                data-domain={group.kind === 'domain' ? group.key : undefined}
                aria-labelledby={`group-${sectionKey}`}
              >
                <h2 id={`group-${sectionKey}`} className={styles.sectionHeading}>
                  <button
                    type="button"
                    className={styles.sectionToggle}
                    data-testid="section-toggle"
                    aria-expanded={open}
                    aria-controls={`content-${sectionKey}`}
                    onClick={() => toggleSection(sectionKey)}
                  >
                    {group.kind === 'domain' ? (
                      <DomainEmblem domain={group.key as CognitiveDomain} size={20} className={styles.sectionIcon} />
                    ) : group.kind === 'type' ? (
                      <span data-type={group.key} className={styles.sectionIconWrap}>
                        <TypeGlyph type={group.key as ExerciseType} size={20} />
                      </span>
                    ) : (
                      <span data-family={group.key} className={styles.sectionIconWrap} aria-hidden="true">
                        <span className={styles.sectionFamilyMark} />
                      </span>
                    )}
                    <span className={styles.sectionLabel}>{group.label}</span>
                    <span className={styles.sectionCount}>
                      {toFaDigits(group.list.length)} {APP_TEXTS_FA.exerciseCountUnit}
                    </span>
                    <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`} aria-hidden="true" />
                  </button>
                </h2>
                {open ? (
                  <div className={styles.exerciseGrid} id={`content-${sectionKey}`}>
                    {group.list.map((exercise, index) => renderExerciseCard(exercise, index))}
                  </div>
                ) : null}
              </section>
            )
          })}
        </>
      )}

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
