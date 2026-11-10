import { describe, expect, it, vi } from 'vitest'
import type { SessionRecord, TrialEventRecord } from '../core/types'
import { toTrialEventRecord } from '../core/types'
import {
  InMemorySessionRepository,
  InMemoryTrialEventRepository,
} from './repositories/in-memory-repositories'
import { createBackup, downloadBackupFile, restoreBackup, validateBackup } from './export-import'

function makeSession(id: string, overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    id,
    exerciseId: 'number-sequence',
    exerciseVersion: '1.0.0',
    contentVersion: '1',
    domain: 'working-memory',
    difficulty: 2,
    seed: 7,
    status: 'completed',
    startedAt: 1_700_000_000_000,
    endedAt: 1_700_000_180_000,
    durationMs: 180_000,
    trialCount: 2,
    summary: null,
    ...overrides,
  }
}

function makeTrial(sessionId: string, trialIndex: number): TrialEventRecord {
  return toTrialEventRecord(
    sessionId,
    2,
    '1.0.0',
    {
      trialIndex,
      stimulus: { digits: [1, 2] },
      expected: [1, 2],
      given: [1, 2],
      outcome: 'correct',
      correct: true,
      reactionTimeMs: 900,
    },
    1_700_000_001_000,
  )
}

describe('Export/Import', () => {
  it('چرخه کامل: ساخت پشتیبان → پاک‌سازی → بازیابی → داده یکسان', async () => {
    const sessions = new InMemorySessionRepository()
    const trials = new InMemoryTrialEventRepository()
    await sessions.create(makeSession('s1'))
    await sessions.create(makeSession('s2', { exerciseId: 'stroop', status: 'aborted' }))
    await trials.appendMany([makeTrial('s1', 0), makeTrial('s1', 1)])

    const backup = await createBackup(sessions, trials)
    expect(backup.app).toBe('cognitive-training-lab')
    expect(backup.schemaVersion).toBe(1)
    expect(backup.sessions).toHaveLength(2)
    expect(backup.trialEvents).toHaveLength(2)
    expect(backup.exportedAt).toBeTruthy()

    // شبیه‌سازی دستگاه جدید: دیتابیس خالی
    const freshSessions = new InMemorySessionRepository()
    const freshTrials = new InMemoryTrialEventRepository()
    const validated = validateBackup(JSON.parse(JSON.stringify(backup)))
    const result = await restoreBackup(validated, freshSessions, freshTrials)
    expect(result).toEqual({ sessionsImported: 2, trialEventsImported: 2 })
    expect(await freshSessions.get('s1')).toEqual(makeSession('s1'))
    expect((await freshTrials.listBySession('s1')).map((e) => e.trialIndex)).toEqual([0, 1])
  })

  it('بازیابی دوباره همان فایل، داده تکراری نمی‌سازد (idempotent)', async () => {
    const sessions = new InMemorySessionRepository()
    const trials = new InMemoryTrialEventRepository()
    await sessions.create(makeSession('s1'))
    await trials.append(makeTrial('s1', 0))

    const backup = await createBackup(sessions, trials)
    await restoreBackup(backup, sessions, trials)
    await restoreBackup(backup, sessions, trials)

    expect((await sessions.listRecent(100)).length).toBe(1)
    expect(await trials.countBySession('s1')).toBe(1)
  })

  it('بازیابی روی دستگاه دارای داده: فقط رکوردهای جدید اضافه می‌شوند', async () => {
    const local = new InMemorySessionRepository()
    const localTrials = new InMemoryTrialEventRepository()
    await local.create(makeSession('local-only'))
    await localTrials.append(makeTrial('local-only', 0))

    // پشتیبان دستگاه دیگر که یک جلسه مشترک (با نتیجه جدیدتر) دارد
    const other = new InMemorySessionRepository()
    const otherTrials = new InMemoryTrialEventRepository()
    await other.create(makeSession('shared', { status: 'in_progress' }))
    const backup = await createBackup(other, otherTrials)

    await restoreBackup(backup, local, localTrials)
    const all = await local.listRecent(100)
    expect(all).toHaveLength(2) // local-only + shared
    expect((await local.get('shared'))?.status).toBe('in_progress')
  })

  it('validateBackup ساختارهای خراب را با پیام فارسی رد می‌کند', () => {
    expect(() => validateBackup(null)).toThrow()
    expect(() => validateBackup('سلام')).toThrow()
    expect(() => validateBackup({ app: 'wrong-app' })).toThrow(/متعلق/)
    expect(() =>
      validateBackup({ app: 'cognitive-training-lab', schemaVersion: 99, sessions: [], trialEvents: [] }),
    ).toThrow(/نسخه ساختار/)
    expect(() =>
      validateBackup({ app: 'cognitive-training-lab', schemaVersion: 1, sessions: 'x', trialEvents: [] }),
    ).toThrow(/ناقص/)
    expect(() =>
      validateBackup({
        app: 'cognitive-training-lab',
        schemaVersion: 1,
        sessions: [{ noId: true }],
        trialEvents: [],
      }),
    ).toThrow(/جلسه نامعتبر/)
  })

  it('validateBackup فایل سالم را عبور می‌دهد', () => {
    const ok = validateBackup({
      app: 'cognitive-training-lab',
      schemaVersion: 1,
      exportedAt: '2026-11-10T00:00:00Z',
      sessions: [makeSession('s1')],
      trialEvents: [makeTrial('s1', 0)],
    })
    expect(ok.sessions).toHaveLength(1)
  })

  it('downloadBackupFile تابعی DOM-محور است و در محیط jsdom بدون خطا کار می‌کند', () => {
    // jsdom از URL.createObjectURL پشتیبانی نمی‌کند — mock می‌شود
    const createObjectURL = vi.fn(() => 'blob:mock')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL })
    try {
      expect(() =>
        downloadBackupFile({
          app: 'cognitive-training-lab',
          schemaVersion: 1,
          exportedAt: '2026-11-10T00:00:00Z',
          sessions: [],
          trialEvents: [],
        }),
      ).not.toThrow()
      expect(createObjectURL).toHaveBeenCalled()
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
