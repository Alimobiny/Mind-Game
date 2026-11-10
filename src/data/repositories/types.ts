import type { SessionRecord, SessionStatus, TrialEventRecord } from '../../core/types'

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
}
