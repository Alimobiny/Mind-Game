import type { ExerciseMeta } from '../core/registry/game-registry'
import {
  COGNITIVE_DOMAINS,
  EXERCISE_FAMILIES,
  FAMILY_LABELS_FA,
} from '../core/types'
import type { CognitiveDomain, ExerciseFamily } from '../core/types'
import { DOMAIN_LABELS_FA, EXERCISE_TYPE_LABELS_FA } from '../i18n/fa'
import { normalizePersian } from '../utils/persian'

/**
 * منطق خالص کتابخانهٔ فهرست خانگی — فیلتر/مرتب‌سازی و جست‌وجو روی متاهای
 * تمرین‌ها، جدا از رندر تا در تست واحد مستقیم قابل راستی‌آزمایی باشد.
 * UI متناظر: تب حوزه + انتخابگر خانواده + مرتب‌سازی + فهرست متراکم تخت.
 */

/** ترتیب نمایش کتابخانه — «آخرین اجرا» lastPlayedIsoDate را از بیرون می‌گیرد */
export type CatalogSort = 'default' | 'recent' | 'alpha'

export interface CatalogFilter {
  /** حوزهٔ انتخابی تب؛ undefined/خالی = همه */
  readonly domain?: CognitiveDomain
  /** خانوادهٔ پارادایمی انتخابی؛ undefined = همه */
  readonly family?: ExerciseFamily
  readonly sort?: CatalogSort
}

/** تاریخ آخرین اجرای هر بازی (ISO) — ورودی سورت «آخرین اجرا»؛ نداشتن = هرگز */
export type LastPlayedIndex = Readonly<Record<string, string>>

/** حوزه‌های دارای حداقل یک تمرین — به ترتیب استاندارد حوزه‌ها */
export function activeCatalogDomains(catalog: readonly ExerciseMeta[]): CognitiveDomain[] {
  const present = new Set(catalog.map((m) => m.domain))
  return COGNITIVE_DOMAINS.filter((d) => present.has(d))
}

/** گزینه‌های انتخابگر خانواده — فقط خانواده‌های دارای بازی در دامنهٔ ورودی */
export function familyOptions(
  catalog: readonly ExerciseMeta[],
  domain?: CognitiveDomain,
): ExerciseFamily[] {
  const scope = domain ? catalog.filter((m) => m.domain === domain) : catalog
  const present = new Set(scope.map((m) => m.family))
  return EXERCISE_FAMILIES.filter((f) => present.has(f))
}

/**
 * فهرست تختِ فیلترشده — پیش‌فرض همان ترتیب کاتالوگ (حوزه سپس نام)؛
 * «الفبایی» فقط نام؛ «آخرین اجرا»: بازی‌های تازه‌اجرا‌شده اول، بی‌سابقه‌ها
 * انتهای لیست به ترتیب پیش‌فرض.
 */
export function filterCatalog(
  catalog: readonly ExerciseMeta[],
  filter: CatalogFilter,
  lastPlayed: LastPlayedIndex = {},
): readonly ExerciseMeta[] {
  let list = catalog as readonly ExerciseMeta[]
  if (filter.domain !== undefined) {
    list = list.filter((m) => m.domain === filter.domain)
  }
  if (filter.family !== undefined) {
    list = list.filter((m) => m.family === filter.family)
  }
  if (filter.sort === 'alpha') {
    return [...list].sort((a, b) => a.nameFa.localeCompare(b.nameFa, 'fa'))
  }
  if (filter.sort === 'recent') {
    const rank = (m: ExerciseMeta): string => lastPlayed[m.id] ?? ''
    return [...list].sort((a, b) => {
      const ra = rank(a)
      const rb = rank(b)
      if (ra !== rb) return ra < rb ? 1 : -1 // ISO جدیدتر اول؛ خالی آخر
      return 0 // پایدار: ترتیب پیش‌فرض حفظ می‌شود
    })
  }
  return list
}

/**
 * جست‌وجوی نرمال‌شدهٔ کاتالوگ — پوشش نام فارسی، شرح، نام انگلیسی/علمی،
 * شناسه (مثل n-back یا pasat)، برچسب خانواده، نوع، حوزه‌ها و کلیدواژه‌ها.
 * خروجی بر اساس اعتبار نیست؛ فیلتر سادهٔ شمول است (قابل پیش‌بینی برای کاربر).
 */
export function searchCatalog(
  catalog: readonly ExerciseMeta[],
  query: string,
): readonly ExerciseMeta[] {
  const trimmed = query.trim()
  if (trimmed === '') return []
  const q = normalizePersian(trimmed)
  return catalog.filter((meta) => catalogHaystack(meta).includes(q))
}

/** رشتهٔ جست‌وجوی یک متا — نرمال‌شدهٔ الحاق همهٔ فیلدهای قابل جست‌وجو */
function catalogHaystack(meta: ExerciseMeta): string {
  return [
    meta.nameFa,
    meta.descriptionFa,
    meta.nameEn,
    meta.id,
    FAMILY_LABELS_FA[meta.family],
    EXERCISE_TYPE_LABELS_FA[meta.exerciseType],
    DOMAIN_LABELS_FA[meta.domain],
    ...meta.effects.map((d) => DOMAIN_LABELS_FA[d]),
    ...(meta.keywordsFa ?? []),
  ]
    .map(normalizePersian)
    .join(' ')
}
