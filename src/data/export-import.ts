import type { SessionRecord } from '../core/types'
import type { TrialEventRecord } from '../core/types'
import type { SessionRepository, TrialEventRepository } from './repositories/types'

/**
 * پشتیبان‌گیری و بازیابی داده‌ها (Export/Import)
 *
 * پاسخ به نیاز «ماندگاری و انتقال پیشرفت به دستگاه دیگر»:
 *  - خروجی: یک فایل JSON شامل همه جلسات و رویدادهای خام مراحل
 *  - ورودی: اعتبارسنجی ساختار + ادغام (upsert) بر اساس id —
 *    هیچ داده‌ای بدون رونویسی حذف نمی‌شود و ایمپورت دوباره
 *    رکورد تکراری نمی‌سازد (idempotent).
 */

export const BACKUP_SCHEMA_VERSION = 1
export const BACKUP_APP_ID = 'cognitive-training-lab'

export interface BackupFile {
  readonly app: typeof BACKUP_APP_ID
  readonly schemaVersion: number
  /** ISO 8601 */
  readonly exportedAt: string
  readonly sessions: readonly SessionRecord[]
  readonly trialEvents: readonly TrialEventRecord[]
}

export interface RestoreResult {
  readonly sessionsImported: number
  readonly trialEventsImported: number
}

export async function createBackup(
  sessions: SessionRepository,
  trialEvents: TrialEventRepository,
): Promise<BackupFile> {
  const [allSessions, allEvents] = await Promise.all([
    sessions.listRecent(Number.MAX_SAFE_INTEGER),
    trialEvents.listAll(),
  ])
  return {
    app: BACKUP_APP_ID,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    sessions: allSessions,
    trialEvents: allEvents,
  }
}

/**
 * اعتبارسنجی فایل پشتیبان — خطای فارسی با علت دقیق.
 * فقط ساختار سطح‌بالا و فیلدهای حیاتی چک می‌شود.
 */
export function validateBackup(value: unknown): BackupFile {
  if (typeof value !== 'object' || value === null) {
    throw new Error('فایل پشتیبان معتبر نیست: محتوای JSON object نیست')
  }
  const candidate = value as Partial<BackupFile>
  if (candidate.app !== BACKUP_APP_ID) {
    throw new Error('این فایل متعلق به آزمایشگاه تمرین شناختی نیست')
  }
  if (candidate.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    throw new Error(`نسخه ساختار فایل (${String(candidate.schemaVersion)}) پشتیبانی نمی‌شود`)
  }
  if (!Array.isArray(candidate.sessions) || !Array.isArray(candidate.trialEvents)) {
    throw new Error('فایل پشتیبان ناقص است (sessions یا trialEvents موجود نیست)')
  }
  for (const session of candidate.sessions) {
    if (typeof session?.id !== 'string' || typeof session?.exerciseId !== 'string') {
      throw new Error('رکورد جلسه نامعتبر در فایل پشتیبان')
    }
  }
  for (const event of candidate.trialEvents) {
    if (typeof event?.id !== 'string' || typeof event?.sessionId !== 'string') {
      throw new Error('رکورد رویداد نامعتبر در فایل پشتیبان')
    }
  }
  return {
    app: BACKUP_APP_ID,
    schemaVersion: candidate.schemaVersion,
    exportedAt: typeof candidate.exportedAt === 'string' ? candidate.exportedAt : '',
    sessions: candidate.sessions,
    trialEvents: candidate.trialEvents,
  }
}

/**
 * بازیابی: ادغام فایل پشتیبان به دیتابیس فعلی.
 * جلسات موجود با همان id به‌روزرسانی می‌شوند؛ جدیدها ایجاد؛ رویدادها
 * به‌صورت upsert درج می‌شوند (کلید یکتا id).
 */
export async function restoreBackup(
  backup: BackupFile,
  sessions: SessionRepository,
  trialEvents: TrialEventRepository,
): Promise<RestoreResult> {
  let sessionsImported = 0
  for (const record of backup.sessions) {
    const existing = await sessions.get(record.id)
    if (existing) {
      await sessions.update(record)
    } else {
      await sessions.create(record)
    }
    sessionsImported++
  }
  await trialEvents.appendMany(backup.trialEvents)
  return {
    sessionsImported,
    trialEventsImported: backup.trialEvents.length,
  }
}

/** دانلود فایل پشتیبان در مرورگر */
export function downloadBackupFile(backup: BackupFile): void {
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  const date = backup.exportedAt.slice(0, 10) || 'backup'
  anchor.download = `cognitive-training-backup-${date}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}
