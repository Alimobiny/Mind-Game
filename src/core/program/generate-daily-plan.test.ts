// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { COGNITIVE_DOMAINS } from '../types'
import type { CognitiveDomain } from '../types'
import type { SessionRecord, SessionStatus } from '../types'
import { createAppRegistry } from '../../modules'
import {
  DAILY_HARD_MAX_MINUTES,
  DAILY_TARGET_MINUTES,
  MAX_ITEMS_PER_DAY,
  generateDailyPlan,
} from './generate-daily-plan'
import { estimateExerciseMinutes } from './time-estimation'
import type { ProgramExerciseEntry, TrainingPlanRecord } from './types'

/**
 * تست‌های منطق خالص تولید برنامه روزانه — همه قطعی هستند چون seed
 * از خود تاریخ مشتق می‌شود.
 */

/** بازی آزمایشی با id ناشناخته → DEFAULT_TRIAL_SECONDS (۱۰ ثانیه/مرحله) */
function makeEntry(
  id: string,
  domain: CognitiveDomain,
  trials: number,
  levels: readonly number[] = [1, 2, 3, 4, 5],
): ProgramExerciseEntry {
  return { exerciseId: id, domain, plannedTrials: trials, difficultyLevels: levels }
}

/** کاتالوگ آزمایشی: هر ۷ حوزه، یک بازی در هر حوزه */
function syntheticCatalog(trials: number): ProgramExerciseEntry[] {
  return COGNITIVE_DOMAINS.map((domain, i) => makeEntry(`syn-${i}`, domain, trials))
}

/** کاتالوگ واقعی از Registry — همان ۱۲ بازی اپ */
function realCatalog(): ProgramExerciseEntry[] {
  return createAppRegistry()
    .list()
    .map((e) => ({
      exerciseId: e.meta.id,
      domain: e.meta.domain,
      plannedTrials: e.meta.plannedTrials ?? 0,
      difficultyLevels: e.meta.difficultyLevels,
    }))
}

function makeRecord(date: string, exerciseIds: readonly string[]): TrainingPlanRecord {
  return {
    date,
    generatedAt: 0,
    items: exerciseIds.map((exerciseId) => ({
      exerciseId,
      difficulty: 1,
      estimatedMinutes: 5,
    })),
  }
}

/** هفت روز متوالی از یک تاریخ شروع (هر ۷ روز هفته را می‌پوشاند) */
// شنبه‌آغاز: تضمین مستند چرخش («هر ۷ حوزه در هر هفته») از شنبه اعمال می‌شود؛
// پنجره‌ای که از وسط هفته شروع شود از دو چرخشِ مستقل عبور می‌کند.
const WEEK_START = '2026-11-07'
function weekDates(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${WEEK_START}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

/** تولید زنجیره‌ای هفته — هر روز، برنامه دیروز را برای فاصله‌گذاری می‌بیند */
function generateWeek(
  catalog: readonly ProgramExerciseEntry[],
): TrainingPlanRecord[] {
  const plans: TrainingPlanRecord[] = []
  for (const date of weekDates()) {
    plans.push(
      generateDailyPlan({
        date,
        catalog,
        recentPlans: plans.slice(-1),
        generatedAt: 0,
      }),
    )
  }
  return plans
}

describe('تولید برنامه روزانه — قطعیت', () => {
  it('همان تاریخ با همان ورودی‌ها، همان برنامه را می‌سازد', () => {
    const input = {
      date: '2026-11-11',
      catalog: realCatalog(),
      generatedAt: 1234,
    }
    const a = generateDailyPlan(input)
    const b = generateDailyPlan(input)
    expect(a).toEqual(b)
  })

  it('ترتیب ورودی کاتالوگ اثری روی خروجی ندارد (کانونی‌سازی)', () => {
    const catalog = realCatalog()
    const straight = generateDailyPlan({ date: '2026-11-11', catalog, generatedAt: 0 })
    const reversed = generateDailyPlan({ date: '2026-11-11', catalog: [...catalog].reverse(), generatedAt: 0 })
    expect(reversed.items).toEqual(straight.items)
  })

  it('دو روز متوالی بازیِ لنگر متفاوتی دارند (چرخش روزانه)', () => {
    const catalog = realCatalog()
    const day1 = generateDailyPlan({ date: '2026-11-11', catalog, generatedAt: 0 })
    const day2 = generateDailyPlan({ date: '2026-11-12', catalog, generatedAt: 0 })
    expect(day1.items[0]?.exerciseId).not.toBe(day2.items[0]?.exerciseId)
  })

  it('تاریخ با قالب غیر yyyy-mm-dd خطا می‌دهد', () => {
    expect(() => generateDailyPlan({ date: '2026-11-11T10:00', catalog: realCatalog() })).toThrow(
      RangeError,
    )
  })
})

describe('تولید برنامه روزانه — پوشش و فاصله‌گذاری', () => {
  it('در طول هفته هر ۷ حوزه دست‌کم یک‌بار پوشش داده می‌شود', () => {
    const catalog = realCatalog()
    const domainById = new Map(catalog.map((e) => [e.exerciseId, e.domain] as const))
    const week = generateWeek(catalog)
    const covered = new Set(week.flatMap((p) => p.items.map((i) => domainById.get(i.exerciseId))))
    expect(covered.size).toBe(COGNITIVE_DOMAINS.length)
  })

  it('بازی دیروز در همان حوزه تکرار نمی‌شود وقتی جایگزین وجود دارد', () => {
    // یک حوزه با دو بازی: game-a بزرگ‌تر (۵ دقیقه) و game-b (۳ دقیقه)
    const catalog = [
      makeEntry('game-a', 'working-memory', 21),
      makeEntry('game-b', 'working-memory', 9),
    ]
    const yesterday = makeRecord('2026-11-10', ['game-a'])
    const plan = generateDailyPlan({
      date: '2026-11-11',
      catalog,
      recentPlans: [yesterday],
      generatedAt: 0,
    })
    const ids = plan.items.map((i) => i.exerciseId)
    expect(ids).not.toContain('game-a')
    expect(ids).toContain('game-b')
  })

  it('بدون جایگزین، تکرار بازی روز قبل مجاز است (قاعده «وقتی جایگزین هست»)', () => {
    const catalog = [makeEntry('only-game', 'sensorimotor', 21)]
    const yesterday = makeRecord('2026-11-10', ['only-game'])
    const plan = generateDailyPlan({
      date: '2026-11-11',
      catalog,
      recentPlans: [yesterday],
      generatedAt: 0,
    })
    expect(plan.items.map((i) => i.exerciseId)).toContain('only-game')
  })

  it('در یک روز هیچ بازی دوبار انتخاب نمی‌شود', () => {
    for (const plan of generateWeek(realCatalog())) {
      const ids = plan.items.map((i) => i.exerciseId)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
})

describe('تولید برنامه روزانه — بودجه ۱۵ تا ۲۰ دقیقه', () => {
  it('با کاتالوگ واقعی: هر روز ۳ تا ۴ بازی با مجموع ۱۵ تا ۲۰ دقیقه', () => {
    for (const plan of generateWeek(realCatalog())) {
      const total = plan.items.reduce((sum, i) => sum + i.estimatedMinutes, 0)
      expect(plan.items.length).toBeGreaterThanOrEqual(3)
      expect(plan.items.length).toBeLessThanOrEqual(MAX_ITEMS_PER_DAY)
      expect(total).toBeGreaterThanOrEqual(DAILY_TARGET_MINUTES)
      expect(total).toBeLessThanOrEqual(DAILY_HARD_MAX_MINUTES)
    }
  })

  it('با بازی‌های ۵ دقیقه‌ای: در ۱۵ دقیقه متوقف می‌شود (۳ بازی، نه ۴)', () => {
    // ۲۱ مرحله × ۱۰ ثانیه + ۹۰ ثانیه سربار = دقیقاً ۵ دقیقه
    const catalog = syntheticCatalog(21)
    expect(estimateExerciseMinutes(catalog[0] as ProgramExerciseEntry)).toBe(5)
    const plan = generateDailyPlan({ date: '2026-11-11', catalog, generatedAt: 0 })
    expect(plan.items).toHaveLength(3)
    expect(plan.items.reduce((s, i) => s + i.estimatedMinutes, 0)).toBe(15)
  })

  it('با بازی‌های کوتاه: بهترین تلاش — ۴ بازی و مجموع زیر هدف، اما هرگز بالای سقف', () => {
    // ۹ مرحله → دقیقاً ۳ دقیقه؛ ۴×۳=۱۲ < ۱۵ اما سقف تعداد تمام است
    const catalog = syntheticCatalog(9)
    const plan = generateDailyPlan({ date: '2026-11-11', catalog, generatedAt: 0 })
    expect(plan.items).toHaveLength(MAX_ITEMS_PER_DAY)
    const total = plan.items.reduce((s, i) => s + i.estimatedMinutes, 0)
    expect(total).toBe(12)
    expect(total).toBeLessThanOrEqual(DAILY_HARD_MAX_MINUTES)
  })

  it('سقف سخت ۲۰ دقیقه بر تعداد آیتم‌ها مقدم است', () => {
    // یک بازی ۱۲ دقیقه‌ای + شش بازی ۵ دقیقه‌ای: هیچ ترکیب ۳تایی در سقف نمی‌گنجد
    const catalog = [
      makeEntry('huge', COGNITIVE_DOMAINS[0] as CognitiveDomain, 63),
      ...COGNITIVE_DOMAINS.slice(1).map((domain, i) => makeEntry(`mid-${i}`, domain, 21)),
    ]
    const plan = generateDailyPlan({ date: '2026-11-11', catalog, generatedAt: 0 })
    const total = plan.items.reduce((s, i) => s + i.estimatedMinutes, 0)
    expect(total).toBeLessThanOrEqual(DAILY_HARD_MAX_MINUTES)
    expect(plan.items).toHaveLength(2)
    expect(total).toBe(17)
  })

  it('تخمین دقیقه از plannedTrials و سربار جلسه محاسبه می‌شود (گرد به بالا)', () => {
    // ۲۰ مرحله × ۱۰ ثانیه + ۹۰ = ۲۹۰ ثانیه → ۵ دقیقه
    expect(estimateExerciseMinutes(makeEntry('x', 'reasoning', 20))).toBe(5)
    // بازی شناخته‌شده: ۴۰ محرک × ۲ ثانیه + ۹۰ = ۱۷۰ → ۳ دقیقه
    expect(
      estimateExerciseMinutes({ ...makeEntry('go-no-go', 'attention-control', 40) }),
    ).toBe(3)
  })
})

describe('تولید برنامه روزانه — سطح دشواری', () => {
  const catalog = [makeEntry('with-levels', 'reasoning', 21)]

  it('سطح از پیشنهاد دشواری تطبیقی گرفته می‌شود', () => {
    const plan = generateDailyPlan({
      date: '2026-11-11',
      catalog,
      difficultyByExercise: { 'with-levels': 3 },
      generatedAt: 0,
    })
    expect(plan.items[0]?.difficulty).toBe(3)
  })

  it('بدون تاریخچه، سطح پیش‌فرض (کف سطح‌های بازی) است', () => {
    const plan = generateDailyPlan({ date: '2026-11-11', catalog, generatedAt: 0 })
    expect(plan.items[0]?.difficulty).toBe(1)
  })

  it('پیشنهاد خارج از بازه سطح‌های بازی به نزدیک‌ترین سطح محدود می‌شود', () => {
    const high = generateDailyPlan({
      date: '2026-11-11',
      catalog,
      difficultyByExercise: { 'with-levels': 9 },
      generatedAt: 0,
    })
    expect(high.items[0]?.difficulty).toBe(5)
    const low = generateDailyPlan({
      date: '2026-11-11',
      catalog,
      difficultyByExercise: { 'with-levels': 0 },
      generatedAt: 0,
    })
    expect(low.items[0]?.difficulty).toBe(1)
  })
})

describe('استخراج وضعیت انجام‌شده از جلسات', () => {
  it('جلسه کامل‌شده همان روز آیتم را انجام‌شده می‌کند؛ ناتمام یا روز دیگر نه', async () => {
    const { deriveCompletedExerciseIds } = await import('./plan-status')
    const done = deriveCompletedExerciseIds(
      [
        makeSession('go-no-go', 'completed', '2026-11-11T10:00:00'),
        makeSession('go-no-go', 'aborted', '2026-11-11T12:00:00'),
        makeSession('stroop', 'completed', '2026-11-10T10:00:00'),
      ],
      '2026-11-11',
    )
    expect(done.has('go-no-go')).toBe(true)
    expect(done.has('stroop')).toBe(false)

    const onlyAborted = deriveCompletedExerciseIds(
      [makeSession('go-no-go', 'aborted', '2026-11-11T12:00:00')],
      '2026-11-11',
    )
    expect(onlyAborted.size).toBe(0)
  })
})

/** جلسه آزمایشی فقط با فیلدهای لازم برای استخراج وضعیت */
function makeSession(
  exerciseId: string,
  status: SessionStatus,
  startedAtIso: string,
): SessionRecord {
  return {
    id: `${exerciseId}-${startedAtIso}`,
    exerciseId,
    exerciseVersion: '1.0.0',
    contentVersion: '1',
    domain: 'attention-control',
    difficulty: 1,
    seed: 1,
    status,
    startedAt: new Date(startedAtIso).getTime(),
    endedAt: null,
    durationMs: null,
    trialCount: 0,
    summary: null,
  }
}
