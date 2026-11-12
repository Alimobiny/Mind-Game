import { openDatabase } from './database/db'
import {
  IdbExerciseSettingsRepository,
  IdbProgramRunRepository,
  IdbSessionRepository,
  IdbTrainingPlanRepository,
  IdbTrialEventRepository,
} from './repositories/indexeddb-repositories'
import { abortStaleSessions } from '../core/session/session-manager'
import type { SessionRecord, SessionStatus } from '../core/types'
import type {
  ExerciseSettingsRepository,
  ProgramRunRepository,
  SessionRepository,
  TrainingPlanRepository,
  TrialEventRepository,
} from './repositories/types'

export interface AppData {
  readonly sessions: SessionRepository
  readonly trialEvents: TrialEventRepository
  readonly settings: ExerciseSettingsRepository
  readonly plans: TrainingPlanRepository
  readonly runs: ProgramRunRepository
}

/**
 * پوشش اعلان‌دهندهٔ مخزن جلسات — هر نوشتار ماندگار (ایجاد/پایان جلسه)
 * رویداد تغییر داده می‌فرستد تا صفحات به‌جای focus پنجره، دقیقاً پس از
 * تغییر واقعی تازه‌سازی کنند. خواندن‌ها عیناً delegate می‌شوند.
 */
class NotifyingSessionRepository implements SessionRepository {
  constructor(private readonly inner: SessionRepository) {}

  async create(record: SessionRecord): Promise<void> {
    await this.inner.create(record)
    notifyAppDataChanged()
  }

  async update(record: SessionRecord): Promise<void> {
    await this.inner.update(record)
    notifyAppDataChanged()
  }

  get(id: string): Promise<SessionRecord | null> {
    return this.inner.get(id)
  }

  listByExercise(exerciseId: string): Promise<SessionRecord[]> {
    return this.inner.listByExercise(exerciseId)
  }

  listRecent(limit: number): Promise<SessionRecord[]> {
    return this.inner.listRecent(limit)
  }

  listByStatus(status: SessionStatus): Promise<SessionRecord[]> {
    return this.inner.listByStatus(status)
  }
}

let appDataPromise: Promise<AppData> | null = null

/**
 * دسترسی تک‌نمونه (singleton) به لایه داده — دیتابیس فقط یک‌بار باز
 * می‌شود و جلسات قطع‌شده اجرای قبلی در همان ابتدا aborted می‌شوند.
 */
export function getAppData(): Promise<AppData> {
  if (!appDataPromise) {
    appDataPromise = (async () => {
      const db = await openDatabase()
      const sessions = new NotifyingSessionRepository(new IdbSessionRepository(db))
      const trialEvents = new IdbTrialEventRepository(db)
      const settings = new IdbExerciseSettingsRepository(db)
      const plans = new IdbTrainingPlanRepository(db)
      const runs = new IdbProgramRunRepository(db)
      // جلسات in_progress از اجرای قبلی (refresh/بستن تب) قطع‌شده‌اند
      // (listenerها هنوز وصل نشده‌اند؛ رویدادهای بوت بی‌فرستنده‌اند)
      await abortStaleSessions(sessions)
      return { sessions, trialEvents, settings, plans, runs }
    })()
  }
  return appDataPromise
}

/** فقط برای تست‌ها: ریست singleton */
export function resetAppDataForTests(): void {
  appDataPromise = null
  dataChangeListeners.clear()
}

/* ─── رویداد تغییر داده ───
 * به‌جای گوش‌دادنِ صفحات به focus پنجره (هر alt-tab کل خط لولهٔ داده را
 * دوباره اجرا می‌کرد)، مدیر نشست پس از ثبت واقعی داده این رویداد را
 * می‌فرستد و فقط صفحاتِ واقعاً نیازمند تازه‌سازی، دوباره می‌خوانند.
 */

const dataChangeListeners = new Set<() => void>()

/** اعلان تغییر دادهٔ جلسات/اجراها — پس از هر ثبت ماندگار صدا زده می‌شود */
export function notifyAppDataChanged(): void {
  for (const listener of dataChangeListeners) listener()
}

/** گوش‌دادن به تغییر داده؛ تابع لغوِ گوش‌دادن برمی‌گرداند */
export function subscribeToAppDataChanges(listener: () => void): () => void {
  dataChangeListeners.add(listener)
  return () => dataChangeListeners.delete(listener)
}
