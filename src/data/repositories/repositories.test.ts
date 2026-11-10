import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { SessionRecord, TrialEventRecord } from '../../core/types'
import { DB_NAME, deleteDatabase, openDatabase } from '../database/db'
import {
  IdbExerciseSettingsRepository,
  IdbSessionRepository,
  IdbTrialEventRepository,
} from './indexeddb-repositories'
import type {
  ExerciseSettingsRepository,
  SessionRepository,
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
  }>,
) {
  describe(`قرارداد repository — ${name}`, () => {
    let sessions: SessionRepository
    let trials: TrialEventRepository
    let settings: ExerciseSettingsRepository

    beforeEach(async () => {
      ;({ sessions, trials, settings } = await make())
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

repositoryContract('IndexedDB (fake-indexeddb)', async () => {
  // دیتابیس fake بین تست‌ها state نگه می‌دارد؛ برای ایزوله‌بودن هر تست از نو ساخته می‌شود
  await deleteDatabase()
  const db = await openDatabase()
  return {
    sessions: new IdbSessionRepository(db),
    trials: new IdbTrialEventRepository(db),
    settings: new IdbExerciseSettingsRepository(db),
  }
})

// In-memory پیاده‌سازی مرجع است؛ import داینامیک برای استفاده از همان تست‌ها
repositoryContract('InMemory', async () => {
  const { InMemoryExerciseSettingsRepository, InMemorySessionRepository, InMemoryTrialEventRepository } =
    await import('./in-memory-repositories')
  return {
    sessions: new InMemorySessionRepository(),
    trials: new InMemoryTrialEventRepository(),
    settings: new InMemoryExerciseSettingsRepository(),
  }
})

describe('openDatabase (migrations)', () => {
  afterEach(async () => {
    await deleteDatabase()
  })

  it('دیتابیس با نسخه ۱ ساخته می‌شود و استورها وجود دارند', async () => {
    const db = await openDatabase()
    expect(db.name).toBe(DB_NAME)
    expect(db.version).toBe(1)
    for (const store of [
      'exercise_sessions',
      'trial_events',
      'exercise_settings',
      'user_preferences',
      'schema_meta',
    ]) {
      expect(db.objectStoreNames.contains(store)).toBe(true)
    }
    expect(db.objectStoreNames.contains('by_session') === false).toBe(true)
    db.close()
  })
})
