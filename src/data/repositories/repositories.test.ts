import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { SessionRecord, TrialEventRecord } from '../../core/types'
import type { ProgramRunRecord, TrainingPlanRecord } from '../../core/program/types'
import { DB_NAME, STORES, deleteDatabase, openDatabase, requestToPromise } from '../database/db'
import {
  IdbExerciseSettingsRepository,
  IdbProgramRunRepository,
  IdbSessionRepository,
  IdbTrainingPlanRepository,
  IdbTrialEventRepository,
} from './indexeddb-repositories'
import type {
  ExerciseSettingsRepository,
  ProgramRunRepository,
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
    runs: ProgramRunRepository
  }>,
) {
  describe(`قرارداد repository — ${name}`, () => {
    let sessions: SessionRepository
    let trials: TrialEventRepository
    let settings: ExerciseSettingsRepository
    let plans: TrainingPlanRepository
    let runs: ProgramRunRepository

    beforeEach(async () => {
      ;({ sessions, trials, settings, plans, runs } = await make())
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

    it('اجرای برنامه ایجاد/خوانده/به‌روزرسانی می‌شود؛ تکراری و ناموجود خطا', async () => {
      expect(await runs.get('r1')).toBeNull()
      await runs.create(makeRun('r1', '2026-11-12', 1000))
      expect((await runs.get('r1'))?.status).toBe('in_progress')
      await expect(runs.create(makeRun('r1', '2026-11-12', 2000))).rejects.toThrow()
      await runs.update({ ...makeRun('r1', '2026-11-12', 1000), status: 'completed', endedAt: 5000, durationMs: 4000, sessionIds: ['s1'] })
      expect((await runs.get('r1'))?.status).toBe('completed')
      await expect(runs.update(makeRun('rX', '2026-11-12', 1))).rejects.toThrow()
    })

    it('listByDate اجراهای همان روز را قدیم → جدید می‌دهد؛ listAll همه را', async () => {
      await runs.create(makeRun('r2', '2026-11-12', 2000))
      await runs.create(makeRun('r1', '2026-11-12', 1000))
      await runs.create(makeRun('r0', '2026-11-11', 500))
      const today = await runs.listByDate('2026-11-12')
      expect(today.map((r) => r.id)).toEqual(['r1', 'r2'])
      expect((await runs.listAll()).map((r) => r.id)).toEqual(['r0', 'r1', 'r2'])
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

function makeRun(id: string, date: string, startedAt: number): ProgramRunRecord {
  return {
    id,
    date,
    startedAt,
    endedAt: null,
    durationMs: null,
    sessionIds: [],
    status: 'in_progress',
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
    runs: new IdbProgramRunRepository(db),
  }
})

// In-memory پیاده‌سازی مرجع است؛ import داینامیک برای استفاده از همان تست‌ها
repositoryContract('InMemory', async () => {
  const {
    InMemoryExerciseSettingsRepository,
    InMemoryProgramRunRepository,
    InMemorySessionRepository,
    InMemoryTrainingPlanRepository,
    InMemoryTrialEventRepository,
  } = await import('./in-memory-repositories')
  return {
    sessions: new InMemorySessionRepository(),
    trials: new InMemoryTrialEventRepository(),
    settings: new InMemoryExerciseSettingsRepository(),
    plans: new InMemoryTrainingPlanRepository(),
    runs: new InMemoryProgramRunRepository(),
  }
})

describe('openDatabase (migrations)', () => {
  afterEach(async () => {
    await deleteDatabase()
  })

  it('دیتابیس تازه با نسخه ۴ ساخته می‌شود و همه استورها و ایندکس‌ها وجود دارند', async () => {
    const db = await openDatabase()
    expect(db.name).toBe(DB_NAME)
    expect(db.version).toBe(4)
    for (const store of Object.values(STORES)) {
      expect(db.objectStoreNames.contains(store)).toBe(true)
    }
    expect(db.objectStoreNames.contains('by_session') === false).toBe(true)
    // ایندکس‌های کوئری — مبنای عملکرد نسخه ۴
    const tx = db.transaction(STORES.exerciseSessions, 'readonly')
    const indexNames = tx.objectStore(STORES.exerciseSessions).indexNames
    expect(indexNames.contains('by_exercise')).toBe(true)
    expect(indexNames.contains('by_started')).toBe(true)
    expect(indexNames.contains('by_status')).toBe(true)
    db.close()
  })

  it('ارتقا از نسخه ۱ به ۴: همه استورهای جدید ساخته می‌شوند و داده قبلی سالم می‌ماند', async () => {
    await openLegacyV1Database()
    const db = await openDatabase()
    expect(db.version).toBe(4)
    expect(db.objectStoreNames.contains(STORES.trainingPlans)).toBe(true)
    expect(db.objectStoreNames.contains(STORES.programRuns)).toBe(true)

    // داده‌های نسخه ۱ دست‌نخورده مانده‌اند
    const sessions = new IdbSessionRepository(db)
    expect(await sessions.get('legacy-1')).not.toBeNull()

    // استورهای جدید قابل نوشتن‌اند
    const plans = new IdbTrainingPlanRepository(db)
    await plans.put(makePlan('2026-11-11', ['go-no-go']))
    expect((await plans.getByDate('2026-11-11'))?.items).toHaveLength(1)
    const runs = new IdbProgramRunRepository(db)
    await runs.create(makeRun('r-legacy', '2026-11-11', 1000))
    expect((await runs.get('r-legacy'))?.status).toBe('in_progress')

    // ایندکس by_status برای کوئری بوت ساخته شده و کار می‌کند
    await sessions.create(makeSession('v4-s', 500, { status: 'in_progress' }))
    expect((await sessions.listByStatus('in_progress')).map((s) => s.id)).toContain('v4-s')

    const metaTx = db.transaction(STORES.schemaMeta, 'readonly')
    const meta = await requestToPromise(
      metaTx.objectStore(STORES.schemaMeta).get('schema_version') as IDBRequest<
        { key: string; value: number } | undefined
      >,
    )
    expect(meta?.value).toBe(4)
    db.close()
  })

  it('ارتقا از نسخه ۳ به ۴: فقط ایندکس by_status اضافه می‌شود و اجراها سالم می‌مانند', async () => {
    await openLegacyV3Database()
    const db = await openDatabase()
    expect(db.version).toBe(4)
    const tx = db.transaction(STORES.exerciseSessions, 'readonly')
    expect(tx.objectStore(STORES.exerciseSessions).indexNames.contains('by_status')).toBe(true)
    const runs = new IdbProgramRunRepository(db)
    expect((await runs.listByDate('2026-11-11')).map((r) => r.id)).toEqual(['r-v3'])
    db.close()
  })

  it('ارتقا از نسخه ۲ به ۳ (و ۴): program_runs ساخته می‌شود و طرح‌های موجود سالم می‌مانند', async () => {
    await openLegacyV2Database()
    const db = await openDatabase()
    expect(db.version).toBe(4)
    expect(db.objectStoreNames.contains(STORES.programRuns)).toBe(true)

    // طرح نسخه ۲ دست‌نخورده
    const plans = new IdbTrainingPlanRepository(db)
    expect((await plans.getByDate('2026-11-10'))?.items.map((i) => i.exerciseId)).toEqual([
      'stroop',
    ])

    // استور جدید از طریق ایندکس by_date هم کار می‌کند
    const runs = new IdbProgramRunRepository(db)
    await runs.create(makeRun('r-v3', '2026-11-10', 2000))
    expect((await runs.listByDate('2026-11-10')).map((r) => r.id)).toEqual(['r-v3'])
    db.close()
  })
})

/** ساخت دیتابیس ساختگی نسخه ۳ (بدون ایندکس by_status) با یک اجرای برنامه — شبیه‌سازی نصب موج ۷ */
function openLegacyV3Database(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 3)
    request.onupgradeneeded = () => {
      const db = request.result
      const sessions = db.createObjectStore(STORES.exerciseSessions, { keyPath: 'id' })
      sessions.createIndex('by_exercise', 'exerciseId', { unique: false })
      sessions.createIndex('by_started', 'startedAt', { unique: false })
      db.createObjectStore(STORES.trialEvents, { keyPath: 'id' })
      db.createObjectStore(STORES.exerciseSettings, { keyPath: 'exerciseId' })
      db.createObjectStore(STORES.userPreferences, { keyPath: 'key' })
      db.createObjectStore(STORES.schemaMeta, { keyPath: 'key' })
      db.createObjectStore(STORES.trainingPlans, { keyPath: 'date' })
      const runs = db.createObjectStore(STORES.programRuns, { keyPath: 'id' })
      runs.createIndex('by_date', 'date', { unique: false })
      request.transaction?.objectStore(STORES.schemaMeta).put({ key: 'schema_version', value: 3 })
    }
    request.onsuccess = () => {
      const db = request.result
      const tx = db.transaction(STORES.programRuns, 'readwrite')
      tx.objectStore(STORES.programRuns).put(makeRun('r-v3', '2026-11-11', 1000))
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => reject(tx.error ?? new Error('legacy v3 seed failed'))
    }
    request.onerror = () => reject(request.error ?? new Error('legacy v3 open failed'))
  })
}

/** ساخت دیتابیس ساختگی نسخه ۲ (بدون program_runs) با یک طرح — شبیه‌سازی نصب موج ۶ */
function openLegacyV2Database(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2)
    request.onupgradeneeded = () => {
      const db = request.result
      const sessions = db.createObjectStore(STORES.exerciseSessions, { keyPath: 'id' })
      sessions.createIndex('by_exercise', 'exerciseId', { unique: false })
      sessions.createIndex('by_started', 'startedAt', { unique: false })
      db.createObjectStore(STORES.trialEvents, { keyPath: 'id' })
      db.createObjectStore(STORES.exerciseSettings, { keyPath: 'exerciseId' })
      db.createObjectStore(STORES.userPreferences, { keyPath: 'key' })
      db.createObjectStore(STORES.schemaMeta, { keyPath: 'key' })
      db.createObjectStore(STORES.trainingPlans, { keyPath: 'date' })
      request.transaction?.objectStore(STORES.schemaMeta).put({ key: 'schema_version', value: 2 })
    }
    request.onsuccess = () => {
      const db = request.result
      const tx = db.transaction(STORES.trainingPlans, 'readwrite')
      tx.objectStore(STORES.trainingPlans).put(makePlan('2026-11-10', ['stroop']))
      tx.oncomplete = () => {
        db.close()
        resolve()
      }
      tx.onerror = () => reject(tx.error ?? new Error('legacy v2 seed failed'))
    }
    request.onerror = () => reject(request.error ?? new Error('legacy v2 open failed'))
  })
}

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
