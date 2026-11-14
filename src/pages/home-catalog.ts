import type { ExerciseMeta } from '../core/registry/game-registry'
import {
  COGNITIVE_DOMAINS,
  EXERCISE_FAMILIES,
  EXERCISE_TYPES,
  FAMILY_LABELS_FA,
} from '../core/types'
import type { CognitiveDomain, ExerciseFamily, ExerciseType } from '../core/types'
import { DOMAIN_LABELS_FA, EXERCISE_TYPE_LABELS_FA } from '../i18n/fa'
import { normalizePersian } from '../utils/persian'

/**
 * منطق خالص فهرست خانگی کاتالوگ — گروه‌بندی و جست‌وجو روی متاهای تمرین‌ها،
 * جدا از رندر تا در تست واحد مستقیم قابل راستی‌آزمایی باشد.
 */

/** نماهای گروه‌بندی فهرست — حوزه / نوع / اثر اصلی / خانوادهٔ پارادایم */
export type CatalogViewMode = 'domain' | 'type' | 'effect' | 'family'

export interface CatalogGroup {
  readonly key: string
  readonly label: string
  /** سرفصلِ بخش: نشان حوزه، گلیف نوع یا برچسب خانواده */
  readonly kind: 'domain' | 'type' | 'family'
  readonly list: readonly ExerciseMeta[]
}

/**
 * گروه‌بندی کاتالوگ بر اساس نمای فعال. هر تمرین در هر نما دقیقاً یک‌بار
 * ظاهر می‌شود (حوزه = meta.domain · نوع = exerciseType · اثر = effects[0]
 * · خانواده = family). خانواده‌ها به ترتیب اعلان EXERCISE_FAMILIES
 * می‌آیند (خانواده‌های هم‌خانوادهٔ مفهومی کنار هم).
 */
export function groupCatalog(
  catalog: readonly ExerciseMeta[],
  mode: CatalogViewMode,
): CatalogGroup[] {
  if (mode === 'family') {
    return EXERCISE_FAMILIES.map((family) => ({
      key: family,
      label: FAMILY_LABELS_FA[family],
      kind: 'family' as const,
      list: catalog.filter((m) => m.family === family),
    })).filter((g) => g.list.length > 0)
  }
  if (mode === 'type') {
    return EXERCISE_TYPES.map((type) => ({
      key: type,
      label: EXERCISE_TYPE_LABELS_FA[type],
      kind: 'type' as const,
      list: catalog.filter((m) => m.exerciseType === type),
    })).filter((g) => g.list.length > 0)
  }
  // effect و domain هر دو روی حوزه گره می‌خورند
  const pick =
    mode === 'effect'
      ? (m: ExerciseMeta) => m.effects[0] as CognitiveDomain
      : (m: ExerciseMeta) => m.domain
  return COGNITIVE_DOMAINS.map((domain) => ({
    key: domain,
    label: DOMAIN_LABELS_FA[domain],
    kind: 'domain' as const,
    list: catalog.filter((m) => pick(m) === domain),
  })).filter((g) => g.list.length > 0)
}

/** حوزه‌های دارای حداقل یک تمرین — به ترتیب استاندارد حوزه‌ها */
export function activeCatalogDomains(catalog: readonly ExerciseMeta[]): CognitiveDomain[] {
  const present = new Set(catalog.map((m) => m.domain))
  return COGNITIVE_DOMAINS.filter((d) => present.has(d))
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

/** برای تست‌ها/مصرف‌کننده‌های دیگر: نوع‌های طبقه‌بندی معتبر گروه */
export type { ExerciseFamily, ExerciseType }
