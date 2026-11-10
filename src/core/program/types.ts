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
