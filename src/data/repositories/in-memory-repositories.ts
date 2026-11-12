import type { SessionRecord, SessionStatus, TrialEventRecord } from '../../core/types'
import type { ProgramRunRecord, TrainingPlanRecord } from '../../core/program/types'
import type {
  ExerciseSettingsRecord,
  ExerciseSettingsRepository,
  ProgramRunRepository,
  SessionRepository,
  TrainingPlanRepository,
  TrialEventRepository,
} from './types'

/**
 * پیاده‌سازی in-memory همان قراردادها — برای تست‌ها و به‌عنوان
 * مرجع رفتاری پیاده‌سازی IndexedDB.
 */

export class InMemorySessionRepository implements SessionRepository {
  private readonly sessions = new Map<string, SessionRecord>()

  async create(record: SessionRecord): Promise<void> {
    if (this.sessions.has(record.id)) {
      throw new Error(`جلسه ${record.id} از قبل وجود دارد`)
    }
    this.sessions.set(record.id, record)
  }

  async update(record: SessionRecord): Promise<void> {
    if (!this.sessions.has(record.id)) {
      throw new Error(`جلسه ${record.id} برای به‌روزرسانی وجود ندارد`)
    }
    this.sessions.set(record.id, record)
  }

  async get(id: string): Promise<SessionRecord | null> {
    return this.sessions.get(id) ?? null
  }

  async listByExercise(exerciseId: string): Promise<SessionRecord[]> {
    return [...this.sessions.values()]
      .filter((s) => s.exerciseId === exerciseId)
      .sort((a, b) => a.startedAt - b.startedAt)
  }

  async listRecent(limit: number): Promise<SessionRecord[]> {
    return [...this.sessions.values()]
      .sort((a, b) => b.startedAt - a.startedAt)
      .slice(0, limit)
  }

  async listByStatus(status: SessionStatus): Promise<SessionRecord[]> {
    return [...this.sessions.values()].filter((s) => s.status === status)
  }
}

export class InMemoryTrialEventRepository implements TrialEventRepository {
  private readonly events = new Map<string, TrialEventRecord>()

  async append(event: TrialEventRecord): Promise<void> {
    // upsert بر اساس id یکتا — ثبت دوباره همان رویداد تکراری نمی‌سازد
    this.events.set(event.id, event)
  }

  async appendMany(events: readonly TrialEventRecord[]): Promise<void> {
    for (const event of events) {
      this.events.set(event.id, event)
    }
  }

  async listBySession(sessionId: string): Promise<TrialEventRecord[]> {
    return [...this.events.values()]
      .filter((e) => e.sessionId === sessionId)
      .sort((a, b) => a.trialIndex - b.trialIndex)
  }

  async countBySession(sessionId: string): Promise<number> {
    return [...this.events.values()].filter((e) => e.sessionId === sessionId).length
  }

  async listAll(): Promise<TrialEventRecord[]> {
    return [...this.events.values()].sort((a, b) =>
      a.sessionId === b.sessionId ? a.trialIndex - b.trialIndex : a.sessionId < b.sessionId ? -1 : 1,
    )
  }
}

export class InMemoryExerciseSettingsRepository implements ExerciseSettingsRepository {
  private readonly settings = new Map<string, ExerciseSettingsRecord>()

  async get(exerciseId: string): Promise<ExerciseSettingsRecord | null> {
    return this.settings.get(exerciseId) ?? null
  }

  async put(record: ExerciseSettingsRecord): Promise<void> {
    this.settings.set(record.exerciseId, record)
  }
}

export class InMemoryTrainingPlanRepository implements TrainingPlanRepository {
  // کلید = تاریخ؛ upsert روی همان تاریخ — مانند پیاده‌سازی IndexedDB
  private readonly plans = new Map<string, TrainingPlanRecord>()

  async getByDate(date: string): Promise<TrainingPlanRecord | null> {
    return this.plans.get(date) ?? null
  }

  async put(record: TrainingPlanRecord): Promise<void> {
    this.plans.set(record.date, record)
  }

  async listRecent(limit: number): Promise<TrainingPlanRecord[]> {
    return [...this.plans.values()]
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
      .slice(0, limit)
  }
}

export class InMemoryProgramRunRepository implements ProgramRunRepository {
  private readonly runs = new Map<string, ProgramRunRecord>()

  async create(record: ProgramRunRecord): Promise<void> {
    if (this.runs.has(record.id)) {
      throw new Error(`اجرای ${record.id} از قبل وجود دارد`)
    }
    this.runs.set(record.id, record)
  }

  async update(record: ProgramRunRecord): Promise<void> {
    if (!this.runs.has(record.id)) {
      throw new Error(`اجرای ${record.id} برای به‌روزرسانی وجود ندارد`)
    }
    this.runs.set(record.id, record)
  }

  async get(id: string): Promise<ProgramRunRecord | null> {
    return this.runs.get(id) ?? null
  }

  async listByDate(date: string): Promise<ProgramRunRecord[]> {
    return [...this.runs.values()]
      .filter((r) => r.date === date)
      .sort((a, b) => a.startedAt - b.startedAt)
  }

  async listAll(): Promise<ProgramRunRecord[]> {
    return [...this.runs.values()].sort((a, b) => a.startedAt - b.startedAt)
  }
}
