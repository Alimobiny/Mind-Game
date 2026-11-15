import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadProgressForExercises } from '../analytics/dashboard'
import type { AdaptiveDifficultyResult } from '../core/difficulty/adaptive-difficulty'
import { toLocalIsoDate } from '../core/difficulty/adaptive-difficulty'
import { buildHeatmapWeeks, groupSessionsByDay } from '../analytics/journey'
import type { HeatCell } from '../analytics/journey'
import { generateDailyPlan } from '../core/program/generate-daily-plan'
import { deriveCompletedExerciseIds } from '../core/program/plan-status'
import { findInProgressRun } from '../core/program/run-chain'
import type { TrainingPlanRecord } from '../core/program/types'
import { getAppData, subscribeToAppDataChanges } from '../data/app-data'
import { APP_TEXTS_FA, DOMAIN_LABELS_FA, FAMILY_LABELS_FA } from '../i18n/fa'
import { COGNITIVE_DOMAINS } from '../core/types'
import type { CognitiveDomain, ExerciseFamily } from '../core/types'
import type { ExerciseMeta } from '../core/registry/game-registry'
// کاتالوگ متادیتا — بدون بار موتورها؛ صفحات فهرست‌محور فقط متا لازم دارند
import { GAME_CATALOG } from '../modules/catalog'
import {
  activeCatalogDomains,
  familyOptions,
  filterCatalog,
  searchCatalog,
  type CatalogSort,
  type LastPlayedIndex,
} from './home-catalog'
import { formatDate, toFaDigits } from '../utils/format'
import { LogoMark } from '../components/icons/LogoMark'
import { TypeGlyph } from '../components/icons/TypeGlyphs'
import { ActivityHeatmap } from '../components/journey/ActivityHeatmap'
import { CalendarGlyph, ChartGlyph, CloseGlyph, FlagGlyph, FlameGlyph, ForwardGlyph } from '../components/icons/UiGlyphs'
import styles from './home.module.css'

/** وضعیت کارت «تمرین امروز» — از همان منطق idempotent صفحهٔ برنامه */
interface TodayState {
  readonly plan: TrainingPlanRecord
  readonly doneCount: number
  readonly activeRun: boolean
}

export function HomePage() {
  const exercises = useMemo(() => GAME_CATALOG, [])
  const [today, setToday] = useState<TodayState | null>(null)
  /** جستجوی زندهٔ کتابخانه — خالی یعنی حالت مرور فیلترشده */
  const [search, setSearch] = useState('')
  /** تب حوزه: 'all' یا یکی از حوزه‌های فعال */
  const [domainTab, setDomainTab] = useState<'all' | CognitiveDomain>('all')
  /** خانوادهٔ پارادایمی انتخابی؛ '' = همه */
  const [family, setFamily] = useState<'' | ExerciseFamily>('')
  const [sort, setSort] = useState<CatalogSort>('default')
  const [progress, setProgress] = useState<Record<string, AdaptiveDifficultyResult> | null>(null)
  /** ستون‌های تقویم فشردهٔ فعالیت — مسیر سبک، بدون محاسبهٔ سنگین سیر پیشرفت */
  const [heatmapWeeks, setHeatmapWeeks] = useState<ReadonlyArray<ReadonlyArray<HeatCell>>>([])
  const [refreshKey, setRefreshKey] = useState(0)

  // وضعیت پیشرفت هر بازی + برنامهٔ امروز — یک خواندن کامل جدول جلسات که
  // به هر سه تجمیع (تقویم + پیشرفت + کارت امروز) می‌رسد. برنامه هر روز فقط
  // یک‌بار تولید می‌شود (کلید تاریخ استور است) — همان الگوی صفحهٔ برنامه.
  useEffect(() => {
    let cancelled = false
    void getAppData().then((appData) => {
      void appData.sessions.listRecent(Number.MAX_SAFE_INTEGER).then((recent) => {
        if (cancelled) return
        const days = groupSessionsByDay(recent)
        setHeatmapWeeks(buildHeatmapWeeks(days, toLocalIsoDate(Date.now()), 8))
        void loadProgressForExercises(recent, exercises.map((m) => m.id)).then(async (result) => {
          if (cancelled) return
          setProgress(result)

          // کارت «تمرین امروز»: خواندن/تولید برنامه + شمارش انجام‌شدهها
          const todayIso = toLocalIsoDate(Date.now())
          let plan = await appData.plans.getByDate(todayIso)
          if (!plan) {
            const recentPlans = await appData.plans.listRecent(7)
            plan = generateDailyPlan({
              date: todayIso,
              catalog: exercises.map((meta) => ({
                exerciseId: meta.id,
                domain: meta.domain,
                plannedTrials: meta.plannedTrials ?? 0,
                difficultyLevels: meta.difficultyLevels,
              })),
              difficultyByExercise: Object.fromEntries(
                Object.entries(result).map(([id, r]) => [id, r.recommendedLevel]),
              ),
              recentPlans,
              generatedAt: Date.now(),
            })
            await appData.plans.put(plan)
          }
          const runs = await appData.runs.listByDate(todayIso)
          if (!cancelled) {
            const doneIds = deriveCompletedExerciseIds(recent, todayIso)
            setToday({
              plan,
              doneCount: plan.items.filter((item) => doneIds.has(item.exerciseId)).length,
              activeRun: findInProgressRun(runs) !== null,
            })
          }
        })
      })
    })
    return () => {
      cancelled = true
    }
  }, [exercises, refreshKey])
  // تازه‌سازی دقیق پس از تغییر واقعی داده (پایان/ایجاد جلسه) — نه هر focus
  useEffect(() => subscribeToAppDataChanges(() => setRefreshKey((k) => k + 1)), [])

  // نوار فیلتر: تب حوزه + گزینه‌های خانوادهٔ همان حوزه
  const activeDomains = useMemo(() => activeCatalogDomains(exercises), [exercises])
  const families = useMemo(
    () => familyOptions(exercises, domainTab === 'all' ? undefined : domainTab),
    [exercises, domainTab],
  )
  // تعویض تب حوزه، خانوادهٔ ناموجود در حوزهٔ تازه را پاک می‌کند
  useEffect(() => {
    if (family !== '' && !families.includes(family)) setFamily('')
  }, [families, family])

  /** تاریخ آخرین اجرای هر بازی — ورودی سورت «آخرین اجرا» و خط متای ردیف */
  const lastPlayed = useMemo<LastPlayedIndex>(
    () =>
      Object.fromEntries(
        Object.entries(progress ?? {})
          .filter(([, p]) => p.lastPlayedIsoDate !== null)
          .map(([id, p]) => [id, p.lastPlayedIsoDate as string]),
      ),
    [progress],
  )

  /** فهرست نمایش: جستجو فعال → نتایج تخت؛ وگرنه فیلتر/سورت کتابخانه */
  const trimmedQuery = search.trim()
  const visible = useMemo(() => {
    if (trimmedQuery !== '') return searchCatalog(exercises, trimmedQuery)
    return filterCatalog(
      exercises,
      {
        domain: domainTab === 'all' ? undefined : domainTab,
        family: family === '' ? undefined : family,
        sort,
      },
      lastPlayed,
    )
  }, [exercises, trimmedQuery, domainTab, family, sort, lastPlayed])

  // کارت فعالیت فقط برای کاربرِ سابقه‌دار — نقشهٔ حرارت برای کاربر تازه نویز است
  const hasActivity = useMemo(
    () => heatmapWeeks.some((week) => week.some((cell) => cell.level > 0)),
    [heatmapWeeks],
  )

  /** ردیف متراکم تمرین — مارک‌آپ واحد برای فهرست و نتایج جستجو */
  const renderGameRow = (meta: ExerciseMeta) => {
    const p = progress?.[meta.id]
    const last = lastPlayed[meta.id]
    return (
      <Link
        to={`/play/${meta.id}`}
        className={styles.gameRow}
        key={meta.id}
        data-domain={meta.domain}
      >
        <span className={styles.typeTile} data-type={meta.exerciseType}>
          <TypeGlyph type={meta.exerciseType} size={20} />
        </span>
        <span className={styles.rowTexts}>
          <span className={styles.rowName}>{meta.nameFa}</span>
          <span className={styles.rowMeta}>
            {FAMILY_LABELS_FA[meta.family]}
            {domainTab === 'all' ? ` · ${DOMAIN_LABELS_FA[meta.domain]}` : ''}
            {p ? ` · ${APP_TEXTS_FA.levelShort} ${toFaDigits(p.recommendedLevel)}` : ''}
          </span>
        </span>
        <span className={styles.rowSide}>
          <span className={styles.rowLast}>
            {last
              ? `${formatDate(new Date(`${last}T12:00:00`).getTime())}`
              : APP_TEXTS_FA.neverPlayed}
          </span>
          <span className={styles.rowPlay} aria-hidden="true">
            <ForwardGlyph size={16} />
          </span>
        </span>
      </Link>
    )
  }

  const todayTotal = today?.plan.items.length ?? 0
  const todayMinutes =
    today?.plan.items.reduce((sum, item) => sum + item.estimatedMinutes, 0) ?? 0
  const todayAllDone = today !== null && today.doneCount >= todayTotal

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

      {/* کارت قهرمان «تمرین امروز» — هدف روزانه بالای کتابخانه (الگوی Elevate/BrainHQ) */}
      {today !== null ? (
        <section className={styles.todayHero} aria-label={APP_TEXTS_FA.todayTitle}>
          <div className={styles.todayHeroTexts}>
            <h2 className={styles.todayHeroTitle}>
              <CalendarGlyph size={20} />
              {APP_TEXTS_FA.todayTitle}
            </h2>
            <p className={styles.todayHeroMeta}>
              {toFaDigits(todayTotal)} {APP_TEXTS_FA.todayExerciseCount} · ~
              {toFaDigits(todayMinutes)} {APP_TEXTS_FA.todayMinutesUnit}
              {todayAllDone
                ? ` — ${APP_TEXTS_FA.todayDone} ✓`
                : todayTotal > 0
                  ? ` — ${APP_TEXTS_FA.todayProgress(today.doneCount, todayTotal)}`
                  : ''}
            </p>
          </div>
          <Link to="/program" className={styles.todayHeroCta} data-testid="today-cta">
            {today.activeRun
              ? APP_TEXTS_FA.todayResume
              : todayAllDone
                ? PROGRAM_CTA_LABEL
                : APP_TEXTS_FA.todayStart}
            <ForwardGlyph size={16} />
          </Link>
        </section>
      ) : null}

      {/* دسترسی سریع — جستجوی زندهٔ کتابخانه */}
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

      {trimmedQuery !== '' ? (
        // نمای نتایج جستجو — تخت، با همان ردیف‌های کتابخانه
        <section className={styles.domainSection} aria-label={APP_TEXTS_FA.searchResults}>
          <h2 className={styles.libraryHeading}>
            {APP_TEXTS_FA.searchResults}
            <span className={styles.sectionCount}>
              {toFaDigits(visible.length)} {APP_TEXTS_FA.exerciseCountUnit}
            </span>
          </h2>
          {visible.length === 0 ? (
            <p className={styles.searchEmpty} data-testid="search-empty">
              {APP_TEXTS_FA.searchEmpty}
            </p>
          ) : (
            <div className={styles.gameList}>{visible.map(renderGameRow)}</div>
          )}
        </section>
      ) : (
        <>
          {/* نوار فیلتر چسبان: تب حوزه + خانواده + ترتیب (الگوی کتابخانهٔ فروشگاهی) */}
          <div className={styles.filterBar} role="group" aria-label={APP_TEXTS_FA.groupSwitchLabel}>
            <div className={styles.domainTabs}>
              <button
                type="button"
                className={`${styles.domainTab} ${domainTab === 'all' ? styles.domainTabActive : ''}`}
                aria-pressed={domainTab === 'all'}
                onClick={() => setDomainTab('all')}
                data-testid="domain-tab-all"
              >
                {APP_TEXTS_FA.allDomainsTab}
                <span className={styles.domainTabCount}>{toFaDigits(exercises.length)}</span>
              </button>
              {activeDomains.map((domain) => (
                <button
                  key={domain}
                  type="button"
                  className={`${styles.domainTab} ${domainTab === domain ? styles.domainTabActive : ''}`}
                  aria-pressed={domainTab === domain}
                  onClick={() => setDomainTab(domain)}
                  data-testid={`domain-tab-${domain}`}
                >
                  {DOMAIN_LABELS_FA[domain]}
                  <span className={styles.domainTabCount}>
                    {toFaDigits(exercises.filter((m) => m.domain === domain).length)}
                  </span>
                </button>
              ))}
            </div>
            <div className={styles.filterSelects}>
              <label className={styles.filterField}>
                <span>{APP_TEXTS_FA.familyFilterLabel}</span>
                <select
                  value={family}
                  onChange={(event) => setFamily(event.target.value as '' | ExerciseFamily)}
                  data-testid="family-filter"
                >
                  <option value="">{APP_TEXTS_FA.familyFilterAll}</option>
                  {families.map((f) => (
                    <option key={f} value={f}>
                      {FAMILY_LABELS_FA[f]}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.filterField}>
                <span>{APP_TEXTS_FA.sortLabel}</span>
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value as CatalogSort)}
                  data-testid="sort-select"
                >
                  <option value="default">{APP_TEXTS_FA.sortDefault}</option>
                  <option value="recent">{APP_TEXTS_FA.sortRecent}</option>
                  <option value="alpha">{APP_TEXTS_FA.sortAlpha}</option>
                </select>
              </label>
            </div>
          </div>

          <section className={styles.domainSection} aria-label={APP_TEXTS_FA.libraryTitle}>
            <h2 className={styles.libraryHeading}>
              {APP_TEXTS_FA.libraryTitle}
              <span className={styles.sectionCount}>
                {toFaDigits(visible.length)} {APP_TEXTS_FA.exerciseCountUnit}
              </span>
            </h2>
            <div className={styles.gameList}>{visible.map(renderGameRow)}</div>
          </section>
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

/** برچسب دکمهٔ hero وقتی امروز کامل شده — مسیر برنامه، گزارش/تمرین تکمیلی */
const PROGRAM_CTA_LABEL = 'مشاهدهٔ برنامه'
