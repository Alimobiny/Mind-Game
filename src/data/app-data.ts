import { openDatabase } from './database/db'
import {
  IdbExerciseSettingsRepository,
  IdbSessionRepository,
  IdbTrainingPlanRepository,
  IdbTrialEventRepository,
} from './repositories/indexeddb-repositories'
import { abortStaleSessions } from '../core/session/session-manager'
import type {
  ExerciseSettingsRepository,
  SessionRepository,
  TrainingPlanRepository,
  TrialEventRepository,
} from './repositories/types'

export interface AppData {
  readonly sessions: SessionRepository
  readonly trialEvents: TrialEventRepository
  readonly settings: ExerciseSettingsRepository
  readonly plans: TrainingPlanRepository
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
      const sessions = new IdbSessionRepository(db)
      const trialEvents = new IdbTrialEventRepository(db)
      const settings = new IdbExerciseSettingsRepository(db)
      const plans = new IdbTrainingPlanRepository(db)
      // جلسات in_progress از اجرای قبلی (refresh/بستن تب) قطع‌شده‌اند
      await abortStaleSessions(sessions)
      return { sessions, trialEvents, settings, plans }
    })()
  }
  return appDataPromise
}

/** فقط برای تست‌ها: ریست singleton */
export function resetAppDataForTests(): void {
  appDataPromise = null
}
