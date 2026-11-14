import type { RecordedTrial, TrialOutcome } from './exercise'

/**
 * رویداد خام یک مرحله در IndexedDB — مبنای تحلیل آینده.
 * id ترکیبی sessionId:trialIndex است تا ثبت تکراری یک مرحله عملاً
 * غیرممکن شود (upsert روی کلید یکتا).
 */
export interface TrialEventRecord extends RecordedTrial {
  readonly id: string
  readonly sessionId: string
  readonly difficulty: number
  readonly exerciseVersion: string
  /** epoch milliseconds */
  readonly createdAt: number
  /**
   * مرحله در میانهٔ اجرا مکث را تجربه کرده (unmount صحنه و بازگشت) —
   * بازپخش/تمرین ذهنی در مکث ممکن بوده؛ برای تحلیل اعتبار قابل فیلتر است.
   * غایب = تجربه نکرده (پیش‌فرض قدیمی‌ داده‌ها).
   */
  readonly contaminated?: boolean
  /**
   * پاسخ پس از حداقل یک شکست ذخیره‌سازی (persist_failed → rollback) با
   * تلاش مجدد ثبت شده — RT ممکن است متورم باشد؛ برای تحلیل قابل فیلتر.
   * غایب = ثبت بار اول (پیش‌فرض قدیمی‌ داده‌ها).
   */
  readonly retryAfterPersistFailure?: boolean
}

/** پرچم‌های رویداد خام — فقط کلیدهای true نوشته می‌شوند (داده‌های قدیمی بدون پرچم) */
export interface TrialEventFlags {
  readonly contaminated?: boolean
  readonly retryAfterPersistFailure?: boolean
}

export function toTrialEventRecord(
  sessionId: string,
  difficulty: number,
  exerciseVersion: string,
  trial: RecordedTrial,
  createdAt: number,
  flags: TrialEventFlags = {},
): TrialEventRecord {
  return {
    ...trial,
    id: `${sessionId}:${trial.trialIndex}`,
    sessionId,
    difficulty,
    exerciseVersion,
    createdAt,
    ...(flags.contaminated ? { contaminated: true } : {}),
    ...(flags.retryAfterPersistFailure ? { retryAfterPersistFailure: true } : {}),
  }
}

export type { TrialOutcome }
