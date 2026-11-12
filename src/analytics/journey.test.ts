import { describe, expect, it } from 'vitest'
import type { CognitiveDomain, SessionRecord } from '../core/types'
import { computeAdaptiveDifficulty } from '../core/difficulty/adaptive-difficulty'
import {
  buildHeatmapWeeks,
  computeJourneyMilestones,
  computeJourneyStreak,
  groupSessionsByDay,
  heatLevel,
} from './journey'

/**
 * تست‌های «سیر پیشرفت» — همه قطعی با تاریخ‌های ثابت.
 * مهر زمانی از ظهرِ محلیِ همان روز تقویمی ساخته می‌شود تا
 * toLocalIsoDate (مبنای روز-محور) پایدار بماند.
 */

function ts(iso: string): number {
  return new Date(`${iso}T12:00:00`).getTime()
}

let seq = 0
function session(options: {
  day: string
  exerciseId?: string
  domain?: CognitiveDomain
  status?: SessionRecord['status']
  durationMs?: number
  accuracy?: number
}): SessionRecord {
  seq += 1
  const domain = options.domain ?? 'working-memory'
  const status = options.status ?? 'completed'
  const total = 20
  const accuracy = options.accuracy ?? 80
  return {
    id: `s-${seq}`,
    exerciseId: options.exerciseId ?? 'n-back',
    exerciseVersion: '1.0.0',
    contentVersion: '1',
    domain,
    difficulty: 1,
    seed: seq,
    status,
    startedAt: ts(options.day),
    endedAt: ts(options.day) + (options.durationMs ?? 60_000),
    durationMs: options.durationMs ?? 60_000,
    trialCount: status === 'completed' ? total : 3,
    summary:
      status === 'completed'
        ? {
            exerciseId: options.exerciseId ?? 'n-back',
            sessionId: `s-${seq}`,
            exerciseVersion: '1.0.0',
            contentVersion: '1',
            domain,
            difficulty: 1,
            totalTrials: total,
            correctTrials: Math.round((total * accuracy) / 100),
            incorrectTrials: total - Math.round((total * accuracy) / 100),
            accuracy,
            medianReactionTimeMs: 900,
            metrics: {},
          }
        : null,
  }
}

describe('groupSessionsByDay', () => {
  it('جلسات همان روز ادغام و مرتب صعودی می‌شوند؛ ناتمام جدا شمرده می‌شود', () => {
    const days = groupSessionsByDay([
      session({ day: '2026-11-12' }),
      session({ day: '2026-11-12', domain: 'reasoning' }),
      session({ day: '2026-11-11', status: 'aborted', durationMs: 0 }),
      session({ day: '2026-11-10' }),
    ])
    expect(days.map((d) => d.isoDate)).toEqual(['2026-11-10', '2026-11-11', '2026-11-12'])
    expect(days[2]?.completedSessions).toBe(2)
    expect(days[2]?.abortedSessions).toBe(0)
    expect(days[2]?.domains).toEqual(['working-memory', 'reasoning'])
    expect(days[1]?.abortedSessions).toBe(1)
    expect(days[1]?.completedSessions).toBe(0)
  })
})

describe('computeJourneyStreak', () => {
  it('روزهای پیاپی تا امروز + بهترین رکورد', () => {
    const streak = computeJourneyStreak(
      groupSessionsByDay([
        session({ day: '2026-11-10' }),
        session({ day: '2026-11-11' }),
        session({ day: '2026-11-12' }),
      ]),
      '2026-11-12',
    )
    expect(streak).toEqual({ currentDays: 3, bestDays: 3, totalActiveDays: 3 })
  })

  it('امروزِ خالی رکورد را نمی‌شکند (فرصت امروز) و از دیروز ادامه می‌دهد', () => {
    const streak = computeJourneyStreak(
      groupSessionsByDay([session({ day: '2026-11-10' }), session({ day: '2026-11-11' })]),
      '2026-11-12',
    )
    expect(streak.currentDays).toBe(2)
  })

  it('شکست رکورد با روز خالی میانی؛ بهترین جدا از جاری', () => {
    const streak = computeJourneyStreak(
      groupSessionsByDay([
        session({ day: '2026-11-04' }),
        session({ day: '2026-11-05' }),
        session({ day: '2026-11-06' }),
        session({ day: '2026-11-09' }),
        session({ day: '2026-11-10' }),
        session({ day: '2026-11-11' }),
        session({ day: '2026-11-12' }),
      ]),
      '2026-11-12',
    )
    expect(streak.currentDays).toBe(4)
    expect(streak.bestDays).toBe(4)
    expect(streak.totalActiveDays).toBe(7)
  })

  it('فقط جلسهٔ کامل روز را «فعال» می‌کند — ناتمام رکورد نمی‌سازد', () => {
    const streak = computeJourneyStreak(
      groupSessionsByDay([session({ day: '2026-11-12', status: 'aborted', durationMs: 0 })]),
      '2026-11-12',
    )
    expect(streak).toEqual({ currentDays: 0, bestDays: 0, totalActiveDays: 0 })
  })
})

describe('computeJourneyMilestones', () => {
  const name = (id: string) => `بازی ${id}`
  const adaptiveOf = (sessions: readonly SessionRecord[], today: string) => ({
    'n-back': computeAdaptiveDifficulty(sessions, today),
  })

  it('بدون جلسه: همه قفل با پیشرفت صفر', () => {
    const milestones = computeJourneyMilestones([], {}, name, 0, [])
    expect(milestones.find((m) => m.id === 'first-session')?.achievedIsoDate).toBeNull()
    expect(milestones.find((m) => m.id === 'domain-coverage')?.progress).toEqual({
      current: 0,
      goal: 7,
    })
  })

  it('آستانهٔ ۱۰ جلسه در روز جلسهٔ دهم باز می‌شود؛ پوشش حوزه‌ها فقط با هر ۷ حوزه', () => {
    const domains: CognitiveDomain[] = [
      'working-memory',
      'attention-control',
      'processing-speed',
      'verbal-auditory',
      'visual-spatial',
      'reasoning',
      'sensorimotor',
    ]
    const sessions = domains.flatMap((domain, i) =>
      Array.from({ length: i < 2 ? 2 : 1 }, () =>
        session({ day: `2026-11-0${(i % 9) + 1}`, domain, exerciseId: `ex-${i}` }),
      ),
    )
    // ۹ جلسه — آستانهٔ ۱۰ هنوز قفل
    const ten = computeJourneyMilestones(sessions, {}, name, 0, groupSessionsByDay(sessions))
    expect(ten.find((m) => m.id === 'session-count-10')?.achievedIsoDate).toBeNull()

    const withTen = [...sessions, session({ day: '2026-11-12', domain: 'sensorimotor' })]
    const done = computeJourneyMilestones(
      withTen,
      {},
      name,
      0,
      groupSessionsByDay(withTen),
    )
    expect(done.find((m) => m.id === 'session-count-10')?.achievedIsoDate).toBe('2026-11-12')
    expect(done.find((m) => m.id === 'domain-coverage')?.achievedIsoDate).not.toBeNull()
  })

  it('نشان رکورد روزها در روزی که دنباله به آستانه می‌رسد باز می‌شود', () => {
    const sessions = [
      session({ day: '2026-11-08' }),
      session({ day: '2026-11-09' }),
      session({ day: '2026-11-10' }),
    ]
    const milestones = computeJourneyMilestones(
      sessions,
      {},
      name,
      3,
      groupSessionsByDay(sessions),
    )
    expect(milestones.find((m) => m.id === 'streak-days-3')?.achievedIsoDate).toBe('2026-11-10')
    expect(milestones.find((m) => m.id === 'streak-days-7')?.achievedIsoDate).toBeNull()
  })

  it('ارتقاهای سطح از levelHistory دشواری تطبیقی استخراج می‌شوند', () => {
    // سه روز موفق پیاپی در سطح ۱ → ارتقا به ۲ در روز سوم
    const sessions = [
      session({ day: '2026-11-08', accuracy: 90, exerciseId: 'n-back' }),
      session({ day: '2026-11-09', accuracy: 90, exerciseId: 'n-back' }),
      session({ day: '2026-11-10', accuracy: 90, exerciseId: 'n-back' }),
    ]
    const milestones = computeJourneyMilestones(
      sessions,
      adaptiveOf(sessions, '2026-11-10'),
      name,
      3,
      groupSessionsByDay(sessions),
    )
    const levelUps = milestones.filter((m) => m.kind === 'level-up')
    expect(levelUps).toHaveLength(1)
    expect(levelUps[0]?.levelUp).toEqual({ exerciseName: 'بازی n-back', from: 1, to: 2 })
    expect(levelUps[0]?.achievedIsoDate).toBe('2026-11-10')
  })
})

describe('buildHeatmapWeeks / heatLevel', () => {
  it('نگاشت تعداد جلسه به سطح شدت', () => {
    expect(heatLevel(0)).toBe(0)
    expect(heatLevel(1)).toBe(1)
    expect(heatLevel(3)).toBe(2)
    expect(heatLevel(4)).toBe(3)
  })

  it('۱۲ ستون هفته؛ ستون آخر تا امروز؛ ستون‌ها از شنبه محلی', () => {
    const days = groupSessionsByDay([
      session({ day: '2026-11-12' }),
      session({ day: '2026-11-12' }),
    ])
    const weeks = buildHeatmapWeeks(days, '2026-11-12')
    expect(weeks).toHaveLength(12)
    const last = weeks[weeks.length - 1]
    expect(last?.at(-1)?.isoDate).toBe('2026-11-12')
    expect(last?.at(-1)?.level).toBe(2)
    // ستون‌های خالی سطح صفر دارند
    expect(weeks[0]?.every((c) => c.level === 0)).toBe(true)
    // همهٔ سلول‌ها ۷تایی هستند به‌جز ستون آخر
    expect(weeks.slice(0, -1).every((w) => w.length === 7)).toBe(true)
    expect((last?.length ?? 0) <= 7).toBe(true)
  })
})
