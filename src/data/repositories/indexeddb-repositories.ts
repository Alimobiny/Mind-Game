import type { SessionRecord, SessionStatus, TrialEventRecord } from '../../core/types'
import type { TrainingPlanRecord } from '../../core/program/types'
import { STORES, requestToPromise, transactionDone } from '../database/db'
import type {
  ExerciseSettingsRecord,
  ExerciseSettingsRepository,
  SessionRepository,
  TrainingPlanRepository,
  TrialEventRepository,
} from './types'

/** پیاده‌سازی قراردادهای ذخیره‌سازی روی IndexedDB */

export class IdbSessionRepository implements SessionRepository {
  constructor(private readonly db: IDBDatabase) {}

  async create(record: SessionRecord): Promise<void> {
    const existing = await this.get(record.id)
    if (existing) {
      throw new Error(`جلسه ${record.id} از قبل وجود دارد`)
    }
    await this.write(record)
  }

  async update(record: SessionRecord): Promise<void> {
    const existing = await this.get(record.id)
    if (!existing) {
      throw new Error(`جلسه ${record.id} برای به‌روزرسانی وجود ندارد`)
    }
    await this.write(record)
  }

  async get(id: string): Promise<SessionRecord | null> {
    const tx = this.db.transaction(STORES.exerciseSessions, 'readonly')
    const store = tx.objectStore(STORES.exerciseSessions)
    const result = await requestToPromise(store.get(id) as IDBRequest<SessionRecord | undefined>)
    return result ?? null
  }

  async listByExercise(exerciseId: string): Promise<SessionRecord[]> {
    const all = await this.listAll()
    return all
      .filter((s) => s.exerciseId === exerciseId)
      .sort((a, b) => a.startedAt - b.startedAt)
  }

  async listRecent(limit: number): Promise<SessionRecord[]> {
    const all = await this.listAll()
    return all.sort((a, b) => b.startedAt - a.startedAt).slice(0, limit)
  }

  async listByStatus(status: SessionStatus): Promise<SessionRecord[]> {
    const all = await this.listAll()
    return all.filter((s) => s.status === status)
  }

  private async listAll(): Promise<SessionRecord[]> {
    const tx = this.db.transaction(STORES.exerciseSessions, 'readonly')
    const store = tx.objectStore(STORES.exerciseSessions)
    return requestToPromise(store.getAll() as IDBRequest<SessionRecord[]>)
  }

  private async write(record: SessionRecord): Promise<void> {
    const tx = this.db.transaction(STORES.exerciseSessions, 'readwrite')
    tx.objectStore(STORES.exerciseSessions).put(record)
    await transactionDone(tx)
  }
}

export class IdbTrialEventRepository implements TrialEventRepository {
  constructor(private readonly db: IDBDatabase) {}

  async append(event: TrialEventRecord): Promise<void> {
    await this.appendMany([event])
  }

  async appendMany(events: readonly TrialEventRecord[]): Promise<void> {
    if (events.length === 0) return
    const tx = this.db.transaction(STORES.trialEvents, 'readwrite')
    const store = tx.objectStore(STORES.trialEvents)
    for (const event of events) {
      store.put(event)
    }
    await transactionDone(tx)
  }

  async listBySession(sessionId: string): Promise<TrialEventRecord[]> {
    const tx = this.db.transaction(STORES.trialEvents, 'readonly')
    const index = tx.objectStore(STORES.trialEvents).index('by_session')
    const events = await requestToPromise(
      index.getAll(sessionId) as IDBRequest<TrialEventRecord[]>,
    )
    return events.sort((a, b) => a.trialIndex - b.trialIndex)
  }

  async countBySession(sessionId: string): Promise<number> {
    const tx = this.db.transaction(STORES.trialEvents, 'readonly')
    const index = tx.objectStore(STORES.trialEvents).index('by_session')
    return requestToPromise(index.count(sessionId))
  }

  async listAll(): Promise<TrialEventRecord[]> {
    const tx = this.db.transaction(STORES.trialEvents, 'readonly')
    const store = tx.objectStore(STORES.trialEvents)
    const events = await requestToPromise(store.getAll() as IDBRequest<TrialEventRecord[]>)
    return events.sort((a, b) =>
      a.sessionId === b.sessionId ? a.trialIndex - b.trialIndex : a.sessionId < b.sessionId ? -1 : 1,
    )
  }
}

export class IdbExerciseSettingsRepository implements ExerciseSettingsRepository {
  constructor(private readonly db: IDBDatabase) {}

  async get(exerciseId: string): Promise<ExerciseSettingsRecord | null> {
    const tx = this.db.transaction(STORES.exerciseSettings, 'readonly')
    const result = await requestToPromise(
      tx.objectStore(STORES.exerciseSettings).get(exerciseId) as IDBRequest<
        ExerciseSettingsRecord | undefined
      >,
    )
    return result ?? null
  }

  async put(record: ExerciseSettingsRecord): Promise<void> {
    const tx = this.db.transaction(STORES.exerciseSettings, 'readwrite')
    tx.objectStore(STORES.exerciseSettings).put(record)
    await transactionDone(tx)
  }
}

export class IdbTrainingPlanRepository implements TrainingPlanRepository {
  constructor(private readonly db: IDBDatabase) {}

  async getByDate(date: string): Promise<TrainingPlanRecord | null> {
    const tx = this.db.transaction(STORES.trainingPlans, 'readonly')
    const result = await requestToPromise(
      tx.objectStore(STORES.trainingPlans).get(date) as IDBRequest<TrainingPlanRecord | undefined>,
    )
    return result ?? null
  }

  async put(record: TrainingPlanRecord): Promise<void> {
    const tx = this.db.transaction(STORES.trainingPlans, 'readwrite')
    tx.objectStore(STORES.trainingPlans).put(record)
    await transactionDone(tx)
  }

  async listRecent(limit: number): Promise<TrainingPlanRecord[]> {
    const tx = this.db.transaction(STORES.trainingPlans, 'readonly')
    const all = await requestToPromise(
      tx.objectStore(STORES.trainingPlans).getAll() as IDBRequest<TrainingPlanRecord[]>,
    )
    return all
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
      .slice(0, limit)
  }
}
