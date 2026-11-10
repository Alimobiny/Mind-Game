import { COGNITIVE_DOMAINS } from '../types'
import type { CognitiveDomain } from '../types'
import { SeededRandom } from '../randomization/seeded-random'
import { estimateExerciseMinutes } from './time-estimation'
import type { ProgramExerciseEntry, TrainingPlanItem, TrainingPlanRecord } from './types'

/**
 * منطق خالص تولید «برنامه تمرینی روزانه».
 *
 * قواعد طراحی (مصوب و مبتنی بر docs/SCIENTIFIC-VALIDATION.md — سقف ۱۵–۲۰ دقیقه
 * جلسه روزانه، تنوع حوزه‌ها و فاصله‌گذاری بین جلسات؛ بدون هیچ ادعای بالینی):
 *  ۱. هر روز ۳ تا ۴ بازی، مجموع تخمینی در بازه ۱۵–۲۰ دقیقه.
 *  ۲. چرخش هفتگی: «حوزه لنگر» هر روز از جایگشتی seed شده از شنبه همان هفته
 *     برداشته می‌شود → در طول هفته هر ۷ حوزه دقیقاً یک‌بار لنگر روز می‌شود.
 *  ۳. فاصله‌گذاری: بازیِ روز قبل در همان حوزه تکرار نمی‌شود، مگر آنکه
 *     جایگزینی وجود نداشته باشد («وقتی جایگزین هست»).
 *  ۴. سطح هر آیتم = سطح پیشنهادی دشواری تطبیقی همان بازی (بدون تاریخچه = کف).
 *
 * قطعیت: همه تصادفات از SeededRandom با seed مشتق‌شده از خودِ تاریخ است
 * (FNV-1a روی رشته تاریخ)؛ ورودی‌ها هم ابتدا کانونی‌سازی می‌شوند تا خروجی
 * مستقل از ترتیب آرگومان‌ها باشد. تاریخِ برنامه کلید استور است، پس تولید
 * دوباره upsert روی همان کلید می‌شود و رکورد تکراری ساخته نمی‌شود.
 */

/** هدف مجموع دقیقه‌های روزانه (کف بازه توصیه‌شده) */
export const DAILY_TARGET_MINUTES = 15
/** سقف سخت مجموع دقیقه‌های روزانه */
export const DAILY_HARD_MAX_MINUTES = 20
export const MAX_ITEMS_PER_DAY = 4
export const MIN_ITEMS_PER_DAY = 3

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const DAY_MS = 86_400_000

export interface GenerateDailyPlanInput {
  /** تاریخ ISO محلی yyyy-mm-dd — همان کلید رکورد */
  readonly date: string
  readonly catalog: readonly ProgramExerciseEntry[]
  /** سطح پیشنهادی هر بازی (خروجی دشواری تطبیقی) — نبود = سطح پیش‌فرض */
  readonly difficultyByExercise?: Readonly<Record<string, number>>
  /** برنامه‌های اخیر — فقط برنامه دیروز برای قاعده فاصله‌گذاری خوانده می‌شود */
  readonly recentPlans?: readonly TrainingPlanRecord[]
  /** برای تست‌پذیری تزریق می‌شود؛ پیش‌فرض الان */
  readonly generatedAt?: number
}

/** هش FNV-1a رشته به uint32 — seed قطعی از تاریخ */
function hashStringToSeed(value: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

function parseIsoDate(iso: string): Date {
  return new Date(`${iso}T00:00:00Z`)
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** شاخص روز هفته ایرانی: شنبه=۰ … جمعه=۶ (مستقل از منطقه زمانی) */
function persianWeekdayIndex(iso: string): number {
  return (parseIsoDate(iso).getUTCDay() + 1) % 7
}

/** تاریخ شنبه‌ای که هفتهٔ ISO داده‌شده با آن شروع می‌شود */
function weekStartIso(iso: string): string {
  const utc = parseIsoDate(iso).getTime()
  return toIsoDate(new Date(utc - persianWeekdayIndex(iso) * DAY_MS))
}

/** ترتیب پایدار و مستقل از ورودی: به‌ترتیب COGNITIVE_DOMAINS سپس id */
function canonicalizeCatalog(
  catalog: readonly ProgramExerciseEntry[],
): ProgramExerciseEntry[] {
  const domainOrder = new Map(COGNITIVE_DOMAINS.map((d, i) => [d, i]))
  return [...catalog].sort((a, b) => {
    const da = domainOrder.get(a.domain) ?? COGNITIVE_DOMAINS.length
    const db = domainOrder.get(b.domain) ?? COGNITIVE_DOMAINS.length
    return da !== db ? da - db : a.exerciseId < b.exerciseId ? -1 : 1
  })
}

/** سطح پیشنهادی معتبر: پیشنهاد تطبیقی داخل سطح‌های خود بازی محدود می‌شود */
function resolveDifficulty(
  entry: ProgramExerciseEntry,
  difficultyByExercise: Readonly<Record<string, number>> | undefined,
): number {
  const levels =
    entry.difficultyLevels.length > 0
      ? [...entry.difficultyLevels].sort((a, b) => a - b)
      : [1]
  const suggested = difficultyByExercise?.[entry.exerciseId]
  if (suggested === undefined) return levels[0] as number
  if (suggested < (levels[0] as number)) return levels[0] as number
  if (suggested > (levels[levels.length - 1] as number)) {
    return levels[levels.length - 1] as number
  }
  return suggested
}

export function generateDailyPlan(input: GenerateDailyPlanInput): TrainingPlanRecord {
  if (!ISO_DATE_PATTERN.test(input.date)) {
    throw new RangeError(`قالب تاریخ باید yyyy-mm-dd باشد: ${input.date}`)
  }

  const canonical = canonicalizeCatalog(input.catalog)
  const minutesById = new Map(
    canonical.map((entry) => [entry.exerciseId, estimateExerciseMinutes(entry)] as const),
  )

  // حوزه‌های موجود به‌ترتیب استاندارد — چرخش روی همین‌هاست
  const domains = COGNITIVE_DOMAINS.filter((domain) =>
    canonical.some((entry) => entry.domain === domain),
  )

  const items: TrainingPlanItem[] = []
  if (canonical.length === 0) {
    return { date: input.date, generatedAt: input.generatedAt ?? Date.now(), items }
  }

  const dayRng = new SeededRandom(hashStringToSeed(input.date))

  // چرخش هفتگی: جایگشت ثابت حوزه‌ها در هر هفته → پوشش همه حوزه‌ها در ۷ روز
  const rotation = new SeededRandom(hashStringToSeed(weekStartIso(input.date))).shuffle(domains)
  const anchorDomain = rotation[persianWeekdayIndex(input.date) % rotation.length] as CognitiveDomain

  // فاصله‌گذاری: فقط برنامه دیروز ملاک است
  const yesterdayIso = toIsoDate(new Date(parseIsoDate(input.date).getTime() - DAY_MS))
  const yesterdayIds = new Set(
    input.recentPlans?.find((plan) => plan.date === yesterdayIso)?.items.map(
      (item) => item.exerciseId,
    ) ?? [],
  )

  const minItems = Math.min(MIN_ITEMS_PER_DAY, domains.length)
  const totalMinutes = (): number =>
    items.reduce((sum, item) => sum + item.estimatedMinutes, 0)

  /**
   * بهترین بازیِ مجاز یک حوزه: ابتدا فیلتر فاصله‌گذاری (بازی دیروز حذف،
   * مگر آنکه جایگزینی نباشد)، سپس بزرگ‌ترین گزینه — تساوی دقیقه‌ها با
   * انتخاب seed شده همان روز شکسته می‌شود (تنوع، بدون از‌دست‌رفتن قطعیت).
   */
  const bestCandidate = (
    domain: CognitiveDomain,
  ): { entry: ProgramExerciseEntry; minutes: number } | null => {
    const inDomain = canonical.filter(
      (entry) =>
        entry.domain === domain && !items.some((i) => i.exerciseId === entry.exerciseId),
    )
    if (inDomain.length === 0) return null
    const fresh = inDomain.filter((entry) => !yesterdayIds.has(entry.exerciseId))
    const pool = fresh.length > 0 ? fresh : inDomain
    const maxMinutes = Math.max(...pool.map((entry) => minutesById.get(entry.exerciseId) ?? 0))
    const tied = pool.filter(
      (entry) => (minutesById.get(entry.exerciseId) ?? 0) === maxMinutes,
    )
    const entry = tied.length > 1 ? dayRng.pick(tied) : (tied[0] as ProgramExerciseEntry)
    return { entry, minutes: maxMinutes }
  }

  // ترتیب پایه حوزه‌ها: لنگر روز اول، بقیه با جای‌به‌جایی seed شده همان روز
  const baseOrder: CognitiveDomain[] = [
    anchorDomain,
    ...dayRng.shuffle(domains.filter((domain) => domain !== anchorDomain)),
  ]
  const remaining = new Set<CognitiveDomain>(baseOrder)

  // ۱) لنگر روز همیشه اولین آیتم است — تضمین چرخش و پوشش هفتگی حوزه‌ها.
  // گزینه لنگر نیز از فیلتر فاصله‌گذاری می‌گذرد (بدون جایگزین → خود بازی).
  const anchorCandidate = bestCandidate(anchorDomain)
  if (anchorCandidate && anchorCandidate.minutes <= DAILY_HARD_MAX_MINUTES) {
    items.push({
      exerciseId: anchorCandidate.entry.exerciseId,
      difficulty: resolveDifficulty(anchorCandidate.entry, input.difficultyByExercise),
      estimatedMinutes: anchorCandidate.minutes,
    })
  }
  remaining.delete(anchorDomain)

  // ۲) پر کردن ادامه روز تا رسیدن به هدف/حداقل تعداد، با ترتیب بالا
  while (items.length < MAX_ITEMS_PER_DAY && remaining.size > 0) {
    const total = totalMinutes()
    if (total >= DAILY_TARGET_MINUTES && items.length >= minItems) break

    let chosenDomain: CognitiveDomain | null = null
    let chosen: { entry: ProgramExerciseEntry; minutes: number } | null = null

    if (total < DAILY_TARGET_MINUTES) {
      // زیر هدف: حریصانه بزرگ‌ترین گزینه بین حوزه‌های باقی‌مانده؛
      // تساوی بین حوزه‌ها به ترتیب پایه (شافل seed شده روز) شکسته می‌شود
      for (const domain of baseOrder) {
        if (!remaining.has(domain)) continue
        const candidate = bestCandidate(domain)
        if (!candidate) {
          remaining.delete(domain)
          continue
        }
        if (!chosen || candidate.minutes > chosen.minutes) {
          chosen = candidate
          chosenDomain = domain
        }
      }
    } else {
      // هدف تأمین شده ولی هنوز به حداقل تعداد نرسیده‌ایم — ترتیب پایه
      for (const domain of baseOrder) {
        if (!remaining.has(domain)) continue
        const candidate = bestCandidate(domain)
        if (!candidate) {
          remaining.delete(domain)
          continue
        }
        chosen = candidate
        chosenDomain = domain
        break
      }
    }

    if (chosenDomain === null || chosen === null) break
    // سقف سخت بودجه بر تعداد آیتم‌ها مقدم است (با کاتالوگ واقعی هرگز فعال نمی‌شود)
    if (total + chosen.minutes > DAILY_HARD_MAX_MINUTES) {
      remaining.delete(chosenDomain)
      continue
    }

    items.push({
      exerciseId: chosen.entry.exerciseId,
      difficulty: resolveDifficulty(chosen.entry, input.difficultyByExercise),
      estimatedMinutes: chosen.minutes,
    })
    remaining.delete(chosenDomain)
  }

  return { date: input.date, generatedAt: input.generatedAt ?? Date.now(), items }
}
