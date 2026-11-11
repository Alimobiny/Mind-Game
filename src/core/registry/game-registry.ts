import type { CognitiveDomain } from '../types'
import { COGNITIVE_DOMAINS } from '../types'
import type { ExerciseType } from '../types'
import { isCognitiveDomain, isExerciseType } from '../types'
import type { ExerciseConfig, ExerciseDefinition, ExerciseState, ExerciseTrial } from '../types'

/**
 * نسخه «type-erased» قرارداد بازی برای نگهداری در Registry.
 * چون متدها با method syntax تعریف شده‌اند (bivariance)، هر
 * ExerciseDefinition با جنریک‌های اختصاصی مستقیماً قابل نگهداری است.
 */
export type AnyExerciseDefinition = ExerciseDefinition<ExerciseConfig, ExerciseState, ExerciseTrial, unknown>

/** متادیتای نمایشی یک تمرین برای UI */
export interface ExerciseMeta {
  readonly id: string
  readonly nameFa: string
  readonly descriptionFa: string
  readonly domain: CognitiveDomain
  /** نوع تمرین — جنس تکلیف (عددی/کلامی/دیداری/فضایی/واکنشی/منطقی) */
  readonly exerciseType: ExerciseType
  /** اثرهای شناختی این تمرین؛ عنصر اول = اثر اصلی (مبنای گروه‌بندی) */
  readonly effects: readonly CognitiveDomain[]
  readonly version: string
  readonly contentVersion: string
  /** دستورالعمل کوتاه — گام‌های اجرا */
  readonly instructionsFa: readonly string[]
  /** سطح‌های دشواری معتبر (معمولاً ۱..۵) */
  readonly difficultyLevels: readonly number[]
  /** تعداد مراحل برنامه‌ریزی‌شده جلسه — برای نمایش پیشرفت در header */
  readonly plannedTrials?: number
  /** برچسب‌های معیارهای اختصاصی این بازی برای نمایش در نتایج */
  readonly metricLabelsFa: Readonly<Record<string, string>>
}

export interface RegisteredExercise {
  readonly definition: AnyExerciseDefinition
  readonly meta: ExerciseMeta
}

export class GameRegistry {
  private readonly exercises = new Map<string, RegisteredExercise>()

  register(entry: RegisteredExercise): void {
    if (this.exercises.has(entry.definition.id)) {
      throw new Error(`تمرین ${entry.definition.id} قبلاً ثبت شده است`)
    }
    if (entry.meta.id !== entry.definition.id) {
      throw new Error(`id متادیتا (${entry.meta.id}) با id تعریف (${entry.definition.id}) یکی نیست`)
    }
    if (!isExerciseType(entry.meta.exerciseType)) {
      throw new Error(`نوع تمرین نامعتبر برای ${entry.definition.id}: ${entry.meta.exerciseType}`)
    }
    if (
      entry.meta.effects.length === 0 ||
      !entry.meta.effects.every((d) => isCognitiveDomain(d))
    ) {
      throw new Error(
        `اثرهای شناختی نامعتبر برای ${entry.definition.id}: ${entry.meta.effects.join(', ') || 'خالی'}`,
      )
    }
    this.exercises.set(entry.definition.id, entry)
  }

  get(id: string): RegisteredExercise | undefined {
    return this.exercises.get(id)
  }

  has(id: string): boolean {
    return this.exercises.has(id)
  }

  /** همه تمرین‌ها به ترتیب حوزه شناختی و سپس نام */
  list(): RegisteredExercise[] {
    const domainOrder = new Map(COGNITIVE_DOMAINS.map((d, i) => [d, i]))
    return [...this.exercises.values()].sort((a, b) => {
      const da = domainOrder.get(a.meta.domain) ?? 99
      const db = domainOrder.get(b.meta.domain) ?? 99
      return da !== db ? da - db : a.meta.nameFa.localeCompare(b.meta.nameFa, 'fa')
    })
  }

  listByDomain(domain: CognitiveDomain): RegisteredExercise[] {
    return this.list().filter((e) => e.meta.domain === domain)
  }

  /** حوزه‌هایی که حداقل یک تمرین ثبت‌شده دارند، به ترتیب استاندارد */
  activeDomains(): CognitiveDomain[] {
    const present = new Set([...this.exercises.values()].map((e) => e.meta.domain))
    return COGNITIVE_DOMAINS.filter((d) => present.has(d))
  }
}
