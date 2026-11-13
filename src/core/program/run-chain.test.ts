// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { SessionRecord } from '../types'
import type { ProgramRunRecord, TrainingPlanItem } from './types'
import {
  finalizeRun,
  findInProgressRun,
  nextPendingItem,
  startRun,
  summarizeRun,
  withSession,
} from './run-chain'

/** تست‌های منطق خالص اجرای زنجیره‌ای برنامهٔ روزانه. */

function item(exerciseId: string, difficulty = 2): TrainingPlanItem {
  return { exerciseId, difficulty, estimatedMinutes: 5 }
}

function makeSession(
  id: string,
  overrides: Partial<SessionRecord> = {},
): SessionRecord {
  return {
    id,
    exerciseId: 'n-back',
    exerciseVersion: '1.0.0',
    contentVersion: '1',
    domain: 'working-memory',
    difficulty: 2,
    seed: 7,
    status: 'completed',
    startedAt: 1000,
    endedAt: 6000,
    durationMs: 5000,
    trialCount: 10,
    summary: {
      exerciseId: 'n-back',
      sessionId: id,
      exerciseVersion: '1.0.0',
      contentVersion: '1',
      domain: 'working-memory',
      difficulty: 2,
      totalTrials: 10,
      correctTrials: 8,
      incorrectTrials: 2,
      accuracy: 80,
      medianReactionTimeMs: 500,
      metrics: {},
    },
    ...overrides,
  }
}

describe('nextPendingItem', () => {
  const items = [item('a'), item('b'), item('c')]

  it('نخستین آیتم انجام‌نشده به ترتیب طرح', () => {
    expect(nextPendingItem(items, new Set(['a']))?.exerciseId).toBe('b')
    expect(nextPendingItem(items, new Set())?.exerciseId).toBe('a')
  })

  it('همه انجام‌شده → null؛ لیست خالی → null', () => {
    expect(nextPendingItem(items, new Set(['a', 'b', 'c']))).toBeNull()
    expect(nextPendingItem([], new Set())).toBeNull()
  })
})

describe('چرخهٔ عمر رکورد اجرا', () => {
  it('startRun اجرای در_حال_اجرا با id یکتای زمان‌محور می‌سازد', () => {
    const run = startRun('2026-11-12', 1000)
    expect(run).toMatchObject({
      id: '2026-11-12-1000',
      date: '2026-11-12',
      startedAt: 1000,
      status: 'in_progress',
      endedAt: null,
      durationMs: null,
    })
    expect(run.sessionIds).toEqual([])
  })

  it('withSession ضمیمه می‌کند و id تکراری را نمی‌پذیرد', () => {
    let run = startRun('2026-11-12', 1000)
    run = withSession(run, 's1')
    run = withSession(run, 's1')
    run = withSession(run, 's2')
    expect(run.sessionIds).toEqual(['s1', 's2'])
  })

  it('finalizeRun مدت دیواری را محاسبه و یک‌بار نهایی می‌کند (idempotent)', () => {
    let run = startRun('2026-11-12', 1000)
    run = withSession(run, 's1')
    run = finalizeRun(run, 'completed', 190_000)
    expect(run.status).toBe('completed')
    expect(run.endedAt).toBe(190_000)
    expect(run.durationMs).toBe(189_000)
    // نهایی‌کردن دوباره همان اجرا دیگر تغییری نمی‌کند
    expect(finalizeRun(run, 'aborted', 300_000)).toEqual(run)
  })

  it('findInProgressRun آخرین اجرای باز را می‌دهد', () => {
    const runs: ProgramRunRecord[] = [
      finalizeRun(startRun('2026-11-12', 1000), 'completed', 2000),
      startRun('2026-11-12', 5000),
      finalizeRun(startRun('2026-11-12', 9000), 'aborted', 9500),
    ]
    expect(findInProgressRun(runs)?.startedAt).toBe(5000)
    expect(findInProgressRun([runs[0] as ProgramRunRecord])).toBeNull()
    expect(findInProgressRun([])).toBeNull()
  })
})

describe('summarizeRun', () => {
  const run: ProgramRunRecord = {
    ...finalizeRun(withSession(withSession(startRun('2026-11-12', 1000), 's1'), 's2'), 'completed', 300_000),
  }

  it('جلسات زنجیره را جدا می‌کند: کامل/قطع، زمان فعال، میانگین دقت', () => {
    const sessions = [
      makeSession('s1'), // completed دقت ۸۰
      makeSession('s2', {
        status: 'aborted',
        durationMs: 1200,
        endedAt: null,
        summary: null,
      }),
      makeSession('other'), // خارج از زنجیره — نادیده
    ]
    const summary = summarizeRun(run, sessions)
    expect(summary.completedSessions).toBe(1)
    expect(summary.abortedSessions).toBe(1)
    expect(summary.wallDurationMs).toBe(299_000)
    expect(summary.activeMs).toBe(6200)
    expect(summary.meanAccuracy).toBe(80)
  })

  it('میانگین دقت روی جلسات خلاصه‌دار؛ بدون هیچ‌کدام null', () => {
    const sessions = [
      makeSession('s1', { summary: { ...makeSession('s1').summary!, accuracy: 70 } }),
      makeSession('s2', { summary: { ...makeSession('s2').summary!, accuracy: 90 } }),
    ]
    expect(summarizeRun(run, sessions).meanAccuracy).toBe(80)
    const noSummary = [
      makeSession('s1', { summary: null }),
      makeSession('s2', { summary: null }),
    ]
    expect(summarizeRun(run, noSummary).meanAccuracy).toBeNull()
  })

  it('جلسهٔ ناموجود در فهرست (حذف‌شده) تحلیل را نمی‌شکند', () => {
    const summary = summarizeRun(run, [makeSession('s1')])
    expect(summary.completedSessions).toBe(1)
    expect(summary.abortedSessions).toBe(0)
  })

  it('اجرای در_حال_اجرا مدت دیواری null دارد ولی تحلیل جلساتش کار می‌کند', () => {
    const inProgress = withSession(startRun('2026-11-12', 1000), 's1')
    const summary = summarizeRun(inProgress, [makeSession('s1')])
    expect(summary.wallDurationMs).toBeNull()
    expect(summary.completedSessions).toBe(1)
  })
})
