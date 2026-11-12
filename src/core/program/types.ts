import type { CognitiveDomain } from '../types'

/**
 * انواع دامنه «برنامه تمرینی» — منطق خالص در core/program است و
 * ذخیره‌سازی (استور training_plans) از همین انواع استفاده می‌کند.
 */

/** یک آیتم برنامه روزانه: بازی پیشنهادی با سطح و تخمین زمان */
export interface TrainingPlanItem {
  readonly exerciseId: string
  /** سطح پیشنهادی در لحظه ساخت برنامه — خروجی دشواری تطبیقی */
  readonly difficulty: number
  /** تخمین محافظه‌کارانه مدت جلسه (دقیقه) */
  readonly estimatedMinutes: number
}

/** رکورد برنامه روزانه — کلید: تاریخ ISO محلی yyyy-mm-dd */
export interface TrainingPlanRecord {
  readonly date: string
  /** epoch milliseconds لحظه تولید */
  readonly generatedAt: number
  readonly items: readonly TrainingPlanItem[]
}

/**
 * ورودی کاتالوگ بازی‌ها برای منطق برنامه — از متادیتای Registry ساخته
 * می‌شود تا منطق خالص به ماژول‌های بازی وابسته نباشد.
 */
export interface ProgramExerciseEntry {
  readonly exerciseId: string
  readonly domain: CognitiveDomain
  readonly plannedTrials: number
  readonly difficultyLevels: readonly number[]
}

/** وضعیت یک اجرای زنجیره‌ای برنامهٔ روزانه */
export type ProgramRunStatus = 'in_progress' | 'completed' | 'aborted'

/**
 * رکورد «اجرای برنامه» — یک گذر خودکار/زنجیره‌ای روی آیتم‌های برنامهٔ یک روز.
 * کلید id یکتاست (نه تاریخ): یک روز می‌تواند چند اجرا داشته باشد.
 * زمان کل دیواری است (از شروع زنجیره تا پایان آخرین جلسه) — زمان فعال هر
 * جلسه از خود SessionRecordها می‌آید.
 */
export interface ProgramRunRecord {
  /** id یکتا — مثلاً `${date}-${startedAt}` */
  readonly id: string
  /** تاریخ ISO محلی yyyy-mm-dd — همان کلید طرح برنامه */
  readonly date: string
  readonly startedAt: number
  /** پایان زنجیره (کامل یا قطع) — تا وقتی در حال اجراست null */
  readonly endedAt: number | null
  /** endedAt − startedAt (ms) — پس از نهایی‌شدن مقدار دارد */
  readonly durationMs: number | null
  /** شناسهٔ جلسه‌های ثبت‌شده در همین زنجیره، به ترتیب اجرا */
  readonly sessionIds: readonly string[]
  readonly status: ProgramRunStatus
}
