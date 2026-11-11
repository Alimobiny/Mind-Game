import { describe, expect, it } from 'vitest'
import type { RecordedTrial } from '../types'
import { summarizeOutcomes } from '../scoring/scoring'
import { SessionTimer } from '../timer/session-timer'
import {
  InMemoryExerciseSettingsRepository,
  InMemorySessionRepository,
  InMemoryTrialEventRepository,
} from '../../data/repositories/in-memory-repositories'
import type { AnyExerciseDefinition } from '../registry/game-registry'
import { ExerciseSessionManager, abortStaleSessions } from './session-manager'

/**
 * بازی آزمایشی: ۳ مرحله؛ پاسخ درست هر مرحله همان trialIndex است.
 * کاملاً قطعی و مستقل از RNG.
 */
interface FakeState {
  sessionId: string
  difficulty: number
  nextTrialIndex: number
  currentTrial: { trialIndex: number; responseWindowMs: number | null } | null
  results: RecordedTrial[]
}

function fakeDefinition(): AnyExerciseDefinition {
  const TOTAL = 3
  return {
    id: 'fake-exercise',
    version: '1.0.0',
    contentVersion: '1',
    domain: 'working-memory',
    createSession(sessionId, config) {
      return {
        sessionId,
        difficulty: config.difficulty,
        nextTrialIndex: 0,
        currentTrial: null,
        results: [],
      } satisfies FakeState as never
    },
    nextTrial(state: never) {
      const s = state as unknown as FakeState
      if (s.nextTrialIndex >= TOTAL) throw new Error('همه مراحل تولید شده‌اند')
      const trial = { trialIndex: s.nextTrialIndex, responseWindowMs: s.nextTrialIndex === 1 ? 1000 : null }
      return {
        state: { ...s, nextTrialIndex: s.nextTrialIndex + 1, currentTrial: trial },
        trial,
      } as never
    },
    submitAnswer(state: never, answer: unknown, reactionTimeMs: number) {
      const s = state as unknown as FakeState
      const trial = s.currentTrial
      if (!trial) throw new Error('مرحله فعالی وجود ندارد')
      const expected = trial.trialIndex
      const given = answer as number | null
      const correct = given === expected
      const record: RecordedTrial = {
        trialIndex: trial.trialIndex,
        stimulus: { trialIndex: trial.trialIndex },
        expected,
        given,
        outcome: given === null ? 'omission' : correct ? 'correct' : 'incorrect',
        correct: given !== null && correct,
        reactionTimeMs: given === null ? null : reactionTimeMs,
      }
      return { ...s, currentTrial: null, results: [...s.results, record] } as never
    },
    isComplete(state: never) {
      return (state as unknown as FakeState).results.length >= TOTAL
    },
    getSummary(state: never) {
      const s = state as unknown as FakeState
      const totals = summarizeOutcomes(s.results)
      return {
        exerciseId: 'fake-exercise',
        sessionId: s.sessionId,
        exerciseVersion: '1.0.0',
        contentVersion: '1',
        domain: 'working-memory',
        difficulty: s.difficulty,
        ...totals,
        metrics: { customMetric: 42 },
      }
    },
  }
}

/** ساعت جعلی با tick دستی */
function fakeClock() {
  let now = 0
  return { tick: (ms: number) => (now += ms), clock: () => now }
}

async function createManager(overrides: { seed?: number } = {}) {
  const sessions = new InMemorySessionRepository()
  const trials = new InMemoryTrialEventRepository()
  const settings = new InMemoryExerciseSettingsRepository()
  const c = fakeClock()
  const manager = new ExerciseSessionManager({
    definition: fakeDefinition(),
    config: { difficulty: 2 },
    sessions,
    trialEvents: trials,
    settings,
    timer: new SessionTimer(c.clock),
    clock: c.clock,
    seed: overrides.seed ?? 123,
    wallClock: () => 1_700_000_000_000,
  })
  return { manager, sessions, trials, settings, clock: c }
}

describe('ExerciseSessionManager — integration با بازی آزمایشی', () => {
  it('چرخه کامل: start → countdown → active → پاسخ‌ها → completed + ذخیره‌سازی', async () => {
    const { manager, sessions, trials } = await createManager()
    await manager.start()
    manager.beginCountdown()
    manager.beginActive()

    // سه پاسخ درست — بین پاسخ‌ها باید مرحله بعد صریحاً تولید شود
    const r0 = await manager.submitAnswer(0)
    manager.advanceTrial()
    const r1 = await manager.submitAnswer(1)
    manager.advanceTrial()
    const r2 = await manager.submitAnswer(2)

    expect(r0.accepted).toBe(true)
    expect(r1.accepted).toBe(true)
    expect(r2.accepted && r2.sessionCompleted).toBe(true)

    const snapshot = manager.getSnapshot()
    expect(snapshot.machine.phase).toBe('COMPLETED')
    expect(snapshot.summary?.totalTrials).toBe(3)
    expect(snapshot.summary?.accuracy).toBe(100)
    expect(snapshot.summary?.metrics['customMetric']).toBe(42)
    expect(snapshot.answeredTrials).toBe(3)

    // رکورد جلسه در repository
    const stored = await sessions.get(snapshot.sessionId as string)
    expect(stored?.status).toBe('completed')
    expect(stored?.summary?.accuracy).toBe(100)
    expect(stored?.trialCount).toBe(3)
    expect(stored?.difficulty).toBe(2)
    expect(stored?.seed).toBe(123)
    expect(stored?.durationMs).not.toBeNull()

    // رویدادهای خام
    const events = await trials.listBySession(snapshot.sessionId as string)
    expect(events).toHaveLength(3)
    expect(events.map((e) => e.trialIndex)).toEqual([0, 1, 2])
    expect(events[0]?.expected).toBe(0)
    expect(events[0]?.outcome).toBe('correct')
  })

  it('submitAnswer تکراری برای همان مرحله رد می‌شود (duplicate prevention)', async () => {
    const { manager, trials } = await createManager()
    await manager.start()
    manager.beginCountdown()
    manager.beginActive()

    const first = await manager.submitAnswer(0)
    expect(first.accepted).toBe(true)
    const duplicate = await manager.submitAnswer(0)
    expect(duplicate).toEqual({ accepted: false, reason: 'already_answered' })

    // فقط یک رویداد ثبت شده
    const events = await trials.listBySession(manager.getSnapshot().sessionId as string)
    expect(events).toHaveLength(1)
  })

  it('پاسخ قبل از ACTIVE و بدون مرحله فعال رد می‌شود', async () => {
    const { manager } = await createManager()
    await manager.start()
    manager.beginCountdown()
    // هنوز ACTIVE نیست
    const early = await manager.submitAnswer(0)
    expect(early).toEqual({ accepted: false, reason: 'wrong_phase' })

    manager.beginActive()
    // پاسخ وقتی stage فعال است مجاز است؛ اما advanceTrial بدون پاسخ خطا می‌دهد
    expect(() => manager.advanceTrial()).toThrow()

    const ok = await manager.submitAnswer(5) // غلط ولی ثبت می‌شود
    expect(ok.accepted).toBe(true)
  })

  it('پاسخ null به‌عنوان omission ثبت می‌شود (انقضای مهلت)', async () => {
    const { manager, trials } = await createManager()
    await manager.start()
    manager.beginCountdown()
    manager.beginActive()

    const result = await manager.submitAnswer(null)
    expect(result.accepted).toBe(true)
    if (result.accepted) {
      expect(result.record.outcome).toBe('omission')
      expect(result.record.correct).toBe(false)
      expect(result.record.reactionTimeMs).toBeNull()
    }
    const events = await trials.listBySession(manager.getSnapshot().sessionId as string)
    expect(events[0]?.outcome).toBe('omission')
  })

  it('زمان پاسخ بر اساس ساعت تایمر (بدون pause) محاسبه می‌شود', async () => {
    const { manager, clock } = await createManager()
    await manager.start()
    manager.beginCountdown()
    manager.beginActive()

    clock.tick(250)
    const result = await manager.submitAnswer(0)
    expect(result.accepted && result.record.reactionTimeMs).toBe(250)
  })

  it('pause زمان را متوقف و resume ادامه می‌دهد؛ پاسخ در PAUSED رد می‌شود', async () => {
    const { manager, clock } = await createManager()
    await manager.start()
    manager.beginCountdown()
    manager.beginActive()

    clock.tick(100)
    manager.pause()
    clock.tick(5000) // tab مخفی
    expect(manager.getSnapshot().machine.phase).toBe('PAUSED')

    const duringPause = await manager.submitAnswer(0)
    expect(duringPause).toEqual({ accepted: false, reason: 'wrong_phase' })

    manager.resume()
    clock.tick(150)
    const result = await manager.submitAnswer(0)
    // RT = 100 + 150؛ زمان مخفی‌بودن حساب نمی‌شود
    expect(result.accepted && result.record.reactionTimeMs).toBe(250)
  })

  it('abort جلسه را با وضعیت aborted ذخیره می‌کند', async () => {
    const { manager, sessions } = await createManager()
    await manager.start()
    manager.beginCountdown()
    manager.beginActive()
    await manager.submitAnswer(0)
    await manager.abort()

    const snapshot = manager.getSnapshot()
    expect(snapshot.machine.phase).toBe('ABORTED')
    const stored = await sessions.get(snapshot.sessionId as string)
    expect(stored?.status).toBe('aborted')
    expect(stored?.trialCount).toBe(1)
    expect(stored?.summary).toBeNull()
  })

  it('abort: فاز تا پایان ثبت در DB در حالت اجرا می‌ماند (رندر ABORTED پیش از commit نمی‌شود)', async () => {
    const { manager } = await createManager()
    await manager.start()
    manager.beginCountdown()
    manager.beginActive()

    const pending = manager.abort()
    // پیش از تکمیل persistFinal فاز هنوز ACTIVE است — re-renderِ همان کلیک
    // نباید صفحهٔ ABORTED را زودتر از commit دیتابیس بکشد
    expect(manager.getSnapshot().machine.phase).toBe('ACTIVE')

    await pending
    expect(manager.getSnapshot().machine.phase).toBe('ABORTED')
  })

  it('timeRemainingMs برای مرحله دارای مهلت و بدون مهلت درست کار می‌کند', async () => {
    const { manager, clock } = await createManager()
    await manager.start()
    manager.beginCountdown()
    manager.beginActive()

    // مرحله ۰: بدون مهلت
    expect(manager.timeRemainingMs()).toBeNull()

    await manager.submitAnswer(0)
    manager.advanceTrial()
    // مرحله ۱: مهلت 1000ms
    expect(manager.timeRemainingMs()).toBe(1000)
    clock.tick(600)
    expect(manager.timeRemainingMs()).toBe(400)
  })

  it('settings آخرین دشواری را ذخیره می‌کند', async () => {
    const { manager, settings } = await createManager()
    await manager.start()
    expect(await settings.get('fake-exercise')).toEqual({
      exerciseId: 'fake-exercise',
      lastDifficulty: 2,
    })
  })

  it('start دوباره پس از شروع خطا می‌دهد', async () => {
    const { manager } = await createManager()
    await manager.start()
    await expect(manager.start()).rejects.toThrow()
  })

  it('snapshot با subscribe اعلان تغییر می‌گیرد', async () => {
    const { manager } = await createManager()
    let notified = 0
    manager.subscribe(() => notified++)
    await manager.start()
    manager.beginCountdown()
    expect(notified).toBe(2)
  })
})

describe('abortStaleSessions', () => {
  it('جلسات in_progress باقی‌مانده را aborted می‌کند', async () => {
    const sessions = new InMemorySessionRepository()
    await sessions.create({
      id: 'old-1',
      exerciseId: 'fake-exercise',
      exerciseVersion: '1.0.0',
      contentVersion: '1',
      domain: 'working-memory',
      difficulty: 1,
      seed: 1,
      status: 'in_progress',
      startedAt: 100,
      endedAt: null,
      durationMs: null,
      trialCount: 0,
      summary: null,
    })

    const count = await abortStaleSessions(sessions)
    expect(count).toBe(1)
    expect((await sessions.get('old-1'))?.status).toBe('aborted')
    expect(await abortStaleSessions(sessions)).toBe(0)
  })
})
