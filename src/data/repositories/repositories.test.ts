import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { SessionRecord, TrialEventRecord } from '../../core/types'
import type { TrainingPlanRecord } from '../../core/program/types'
import { DB_NAME, STORES, deleteDatabase, openDatabase, requestToPromise } from '../database/db'
import {
  IdbExerciseSettingsRepository,
  IdbSessionRepository,
  IdbTrainingPlanRepository,
  IdbTrialEventRepository,
} from './indexeddb-repositories'
import type {
  ExerciseSettingsRepository,
  SessionRepository,
  TrainingPlanRepository,
  TrialEventRepository,
} from './types'

/**
 * تست قرارداری که هر دو پیاده‌سازی (IndexedDB با fake-indexeddb و
 * in-memory) باید پاس کنند — تضمین رفتار یکسان.
 */
function repositoryContract(
  name: string,
  make: () => Promise<{
    sessions: SessionRepository
    trials: TrialEventRepository
    settings: ExerciseSettingsRepository
    plans: TrainingPlanRepository
  }>,
) {
  describe(`قرارداد repository — ${name}`, () => {
    let sessions: SessionRepository
    let trials: TrialEventRepository
    let settings: ExerciseSettingsRepository
    let plans: TrainingPlanRepository

    beforeEach(async () => {
      ;({ sessions, trials, settings, plans } = await make())
    })

    it('جلسه ایجاد و خوانده می‌شود', async () => {
      const record = makeSession('s1', 1000)
      await sessions.create(record)
      const loaded = await sessions.get('s1')
      expect(loaded).toEqual(record)
      expect(await sessions.get('نا موجود')).toBeNull()
    })

    it('ایجاد جلسه تکراری خطا می‌دهد', async () => {
      await sessions.create(makeSession('s1', 1000))
      await expect(sessions.create(makeSession('s1', 2000))).rejects.toThrow()
    })

    it('به‌روزرسانی جلسه موجود مجاز و جلسه ناموجود خطا است', async () => {
      await sessions.create(makeSession('s1', 1000))
      await sessions.update({ ...makeSession('s1', 1000), status: 'completed' })
      expect((await sessions.get('s1'))?.status).toBe('completed')
      await expect(sessions.update(makeSession('sX', 1))).rejects.toThrow()
    })

    it('listByExercise به ترتیب قدیم→جدید است', async () => {
      await sessions.create(makeSession('b', 2000, { exerciseId: 'calc-20' }))
      await sessions.create(makeSession('a', 1000))
      await sessions.create(makeSession('c', 3000))
      const list = await sessions.listByExercise('number-sequence')
      expect(list.map((s) => s.id)).toEqual(['a', 'c'])
    })

    it('listRecent جدیدترین‌ها را می‌دهد و listByStatus فیلتر می‌کند', async () => {
      await sessions.create(makeSession('a', 1000, { status: 'completed' }))
      await sessions.create(makeSession('b', 2000))
      await sessions.create(makeSession('c', 3000, { status: 'aborted' }))
      const recent = await sessions.listRecent(2)
      expect(recent.map((s) => s.id)).toEqual(['c', 'b'])
      const inProgress = await sessions.listByStatus('in_progress')
      expect(inProgress.map((s) => s.id)).toEqual(['b'])
    })

    it('append رویداد و بازیابی مرتب بر اساس trialIndex', async () => {
      await trials.append(makeTrial('s1', 1))
      await trials.append(makeTrial('s1', 0))
      await trials.append(makeTrial('s2', 0))
      const list = await trials.listBySession('s1')
      expect(list.map((e) => e.trialIndex)).toEqual([0, 1])
      expect(await trials.countBySession('s1')).toBe(2)
      expect(await trials.countBySession('s2')).toBe(1)
    })

    it('append دوباره همان id داده تکراری نمی‌سازد (idempotent)', async () => {
      await trials.append(makeTrial('s1', 0, { given: 5 }))
      await trials.append(makeTrial('s1', 0, { given: 7 })) // بازنویسی
      expect(await trials.countBySession('s1')).toBe(1)
      expect((await trials.listBySession('s1'))[0]?.given).toBe(7)
    })

    it('appendMany خالی بدون خطاست', async () => {
      await expect(trials.appendMany([])).resolves.toBeUndefined()
    })

    it('settings ذخیره و خوانده می‌شود', async () => {
      expect(await settings.get('go-no-go')).toBeNull()
      await settings.put({ exerciseId: 'go-no-go', lastDifficulty: 3 })
      expect(await settings.get('go-no-go')).toEqual({ exerciseId: 'go-no-go', lastDifficulty: 3 })
    })

    it('برنامه روزانه با کلید تاریخ ذخیره و خوانده می‌شود', async () => {
      expect(await plans.getByDate('2026-11-11')).toBeNull()
      await plans.put(makePlan('2026-11-11', ['go-no-go']))
      const loaded = await plans.getByDate('2026-11-11')
      expect(loaded?.items.map((i) => i.exerciseId)).toEqual(['go-no-go'])
    })

    it('put دوباره همان تاریخ بازنویسی می‌کند، نه رکورد تکراری (idempotent)', async () => {
      await plans.put(makePlan('2026-11-11', ['go-no-go']))
      await plans.put(makePlan('2026-11-11', ['stroop']))
      const loaded = await plans.getByDate('2026-11-11')
      expect(loaded?.items.map((i) => i.exerciseId)).toEqual(['stroop'])
      const recent = await plans.listRecent(10)
      expect(recent.filter((p) => p.date === '2026-11-11')).toHaveLength(1)
    })

    it('listRecent برنامه‌ها را جدید → قدیم می‌دهد و محدود می‌کند', async () => {
      await plans.put(makePlan('2026-11-09', ['a']))
      await plans.put(makePlan('2026-11-11', ['b']))
      await plans.put(makePlan('2026-11-10', ['c']))
      const recent = await plans.listRecent(2)
      expect(recent.map((p) => p.date)).toEqual(['2026-11-11', '2026-11-10'])
    })
  })
}

function makeSession(
  id: string,
  startedAt: number,
  overrides: Partial<SessionRecord> = {},
): SessionRecord {
  return {
    id,
    exerciseId: 'number-sequence',
    exerciseVersion: '1.0.0',
    contentVersion: '1',
    domain: 'working-memory',
    difficulty: 1,
    seed: 42,
    status: 'in_progress',
    startedAt,
    endedAt: null,
    durationMs: null,
    trialCount: 0,
    summary: null,
    ...overrides,
  }
}

function makeTrial(sessionId: string, trialIndex: number, overrides: Partial<TrialEventRecord> = {}): TrialEventRecord {
  return {
    id: `${sessionId}:${trialIndex}`,
    sessionId,
    trialIndex,
    stimulus: { kind: 'digit', value: 7 },
    expected: 7,
    given: 7,
    outcome: 'correct',
    correct: true,
    reactionTimeMs: 250,
    difficulty: 1,
    exerciseVersion: '1.0.0',
    createdAt: Date.now(),
    ...overrides,
  }
}

function makePlan(date: string, exerciseIds: readonly string[]): TrainingPlanRecord {
  return {
    date,
    generatedAt: 1_700_000_000_000,
    items: exerciseIds.map((exerciseId) => ({
      exerciseId,
      difficulty: 1,
      estimatedMinutes: 4,
    })),
  }
}

repositoryContract('IndexedDB (fake-indexeddb)', async () => {
  // دیتابیس fake بین تست‌ها state نگه می‌دارد؛ برای ایزوله‌بودن هر تست از نو ساخته می‌شود
  await deleteDatabase()
  const db = await openDatabase()
  return {
    sessions: new IdbSessionRepository(db),
    trials: new IdbTrialEventRepository(db),
    settings: new IdbExerciseSettingsRepository(db),
    plans: new IdbTrainingPlanRepository(db),
  }
})

// In-memory پیاده‌سازی مرجع است؛ import داینامیک برای استفاده از همان تست‌ها
repositoryContract('InMemory', async () => {
  const {
    InMemoryExerciseSettingsRepository,
    InMemorySessionRepository,
    InMemoryTrainingPlanRepository,
    InMemoryTrialEventRepository,
  } = await import('./in-memory-repositories')
  return {
    sessions: new InMemorySessionRepository(),
    trials: new InMemoryTrialEventRepository(),
    settings: new InMemoryExerciseSettingsRepository(),
    plans: new InMemoryTrainingPlanRepository(),
  }
})

describe('openDatabase (migrations)', () => {
  afterEach(async () => {
    await deleteDatabase()
  })

  it('دیتابیس تازه با نسخه ۲ ساخته می‌شود و همه استورها وجود دارند', async () => {
    const db = await openDatabase()
    expect(db.name).toBe(DB_NAME)
    expect(db.version).toBe(2)
    for (const store of Object.values(STORES)) {
      expect(db.objectStoreNames.contains(store)).toBe(true)
    }
    expect(db.objectStoreNames.contains('by_session') === false).toBe(true)
    db.close()
  })

  it('ارتقا از نسخه ۱ به ۲: training_plans ساخته می‌شود و داده قبلی سالم می‌ماند', async () => {
    await openLegacyV1Database()
    const db = await openDatabase()
    expect(db.version).toBe(2)
    expect(db.objectStoreNames.contains(STORES.trainingPlans)).toBe(true)

    // داده‌های نسخه ۱ دست‌نخورده مانده‌اند
    const sessions = new IdbSessionRepository(db)
    expect(await sessions.get('legacy-1')).not.toBeNull()

    // استور جدید قابل نوشتن است و schema_meta به‌روز شده است
    const plans = new IdbTrainingPlanRepository(db)
    await plans.put(makePlan('2026-11-11', ['go-no-go']))
    expect((await plans.getByDate('2026-11-11'))?.items).toHaveLength(1)

    const metaTx = db.transaction(STORES.schemaMeta, 'readonly')
    const meta = await requestToPromise(
      metaTx.objectStore(STORES.schemaMeta).get('schema_version') as IDBRequest<
        { key: string; value: number } | undefined
      >,
    )
    expect(meta?.value).toBe(2)
    db.close()
  })
})

/** ساخت دیتابیس ساختگی نسخه ۱ (بدون training_plans) با یک جلسه — شبیه‌سازی نصب قدیمی */
function openLegacyV1Database(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      const sessions = db.createObjectStore(STORES.exerciseSessions, { keyPath: 'id' })
      sessions.createIndex('by_exercise', 'exerciseId', { unique: false })
      sessions.createIndex('by_started', 'startedAt', { unique: false })
      db.createObjectStore(STORES.trialEvents, { keyPath: 'id' })
      db.createObjectStore(STORES.exerciseSettings, { keyPath: 'exerciseId' })
      db.createObjectStore(STORES.userPreferences, { keyPath: 'key' })
      db.createObjectStore(STORES.schemaMeta, { keyPath: 'key' })
      request.transaction?.objectStore(STORES.schemaMeta).put({ key: 'schema_version', value: 1 })
    }
    request.onsuccess = () => {
      const db = request.result
      const tx = db.transaction(STORES.exerciseSessions, 'readwrite')
      tx.objectStore(STORES.exerciseSessions).put(
        makeSession('legacy-1', 1000, { status: 'completed' }),
      )
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => reject(tx.error ?? new Error('legacy seed failed'))
    }
    request.onerror = () => reject(request.error ?? new Error('legacy open failed'))
  })
}
