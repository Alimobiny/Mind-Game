import type { SessionRecord, SessionStatus, TrialEventRecord } from '../../core/types'
import type { ProgramRunRecord, TrainingPlanRecord } from '../../core/program/types'

/** قرارداد ذخیره‌سازی جلسه‌ها — پیاده‌سازی IndexedDB و in-memory دارد */
export interface SessionRepository {
  /** درج جلسه جدید؛ id تکراری خطا می‌دهد */
  create(record: SessionRecord): Promise<void>
  /** جایگزینی رکورد موجود (مثلاً تغییر status در پایان جلسه) */
  update(record: SessionRecord): Promise<void>
  get(id: string): Promise<SessionRecord | null>
  /** جلسات یک بازی به ترتیب زمان شروع (قدیمی → جدید) */
  listByExercise(exerciseId: string): Promise<SessionRecord[]>
  /** آخرین جلسات به ترتیب زمان شروع (جدید → قدیمی) */
  listRecent(limit: number): Promise<SessionRecord[]>
  listByStatus(status: SessionStatus): Promise<SessionRecord[]>
}

export interface ExerciseSettingsRecord {
  readonly exerciseId: string
  /** آخرین سطح دشواری انتخاب‌شده — فقط برای راحتی UI، نه مبنای تصمیم دشواری */
  readonly lastDifficulty: number
}

export interface ExerciseSettingsRepository {
  get(exerciseId: string): Promise<ExerciseSettingsRecord | null>
  put(record: ExerciseSettingsRecord): Promise<void>
}

/** قرارداد ذخیره‌سازی رویدادهای خام مراحل */
export interface TrialEventRepository {
  /**
   * درج/به‌روزرسانی یک رویداد بر اساس id یکتا (sessionId:trialIndex).
   * یعنی فراخوانی دوباره همان رویداد دیتای تکراری نمی‌سازد.
   */
  append(event: TrialEventRecord): Promise<void>
  appendMany(events: readonly TrialEventRecord[]): Promise<void>
  listBySession(sessionId: string): Promise<TrialEventRecord[]>
  countBySession(sessionId: string): Promise<number>
  /** همه رویدادها (برای پشتیبان‌گیری) — مرتب بر اساس sessionId سپس trialIndex */
  listAll(): Promise<TrialEventRecord[]>
}

/**
 * قرارداد ذخیره‌سازی برنامه‌های روزانه تولیدشده.
 * کلید همان تاریخ ISO است، پس put همیشه upsert روی تاریخ می‌شود —
 * تولید دوباره برنامه یک روز رکورد تکراری نمی‌سازد (idempotent).
 */
export interface TrainingPlanRepository {
  getByDate(date: string): Promise<TrainingPlanRecord | null>
  put(record: TrainingPlanRecord): Promise<void>
  /** آخرین برنامه‌ها به ترتیب تاریخ (جدید → قدیم) — برای قاعده فاصله‌گذاری */
  listRecent(limit: number): Promise<TrainingPlanRecord[]>
}

/**
 * قرارداد ذخیره‌سازی اجراهای زنجیره‌ای برنامهٔ روزانه.
 * برخلاف طرح‌ها، کلید id یکتاست — put روی id موجود به‌روزرسانی همان اجراست.
 */
export interface ProgramRunRepository {
  create(record: ProgramRunRecord): Promise<void>
  /** جایگزینی رکورد موجود — برای ضمیمه‌کردن جلسه یا نهایی‌سازی */
  update(record: ProgramRunRecord): Promise<void>
  get(id: string): Promise<ProgramRunRecord | null>
  /** اجراهای یک روز به ترتیب شروع (قدیمی → جدید) */
  listByDate(date: string): Promise<ProgramRunRecord[]>
  /** همهٔ اجراها (برای پشتیبان‌گیری) */
  listAll(): Promise<ProgramRunRecord[]>
}
