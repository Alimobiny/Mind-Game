// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { SessionRecord, SessionStatus } from '../types'
import { computeAdaptiveDifficulty, toLocalIsoDate } from './adaptive-difficulty'

/** ساخت جلسه مصنوعی — ساعت نیمروز برای مصونیت از DST */
function session(day: string, accuracy: number, difficulty = 1, status: SessionStatus = 'completed'): SessionRecord {
  return {
    id: `s-${day}-${accuracy}-${difficulty}-${Math.random().toString(36).slice(2, 6)}`,
    exerciseId: 'test-exercise',
    exerciseVersion: '1.0.0',
    contentVersion: '1',
    domain: 'working-memory',
    difficulty,
    seed: 1,
    status,
    startedAt: new Date(`${day}T12:00:00`).getTime(),
    endedAt: null,
    durationMs: null,
    trialCount: 10,
    summary:
      status === 'completed'
        ? {
            exerciseId: 'test-exercise',
            sessionId: 'x',
            exerciseVersion: '1.0.0',
            contentVersion: '1',
            domain: 'working-memory',
            difficulty,
            totalTrials: 10,
            correctTrials: Math.round((accuracy / 100) * 10),
            incorrectTrials: 10 - Math.round((accuracy / 100) * 10),
            accuracy,
            medianReactionTimeMs: 500,
            metrics: {},
          }
        : null,
  }
}

describe('computeAdaptiveDifficulty — دشواری تطبیقی', () => {
  it('بدون جلسه: سطح ۱، رکورد صفر', () => {
    const result = computeAdaptiveDifficulty([], '2026-01-10')
    expect(result.recommendedLevel).toBe(1)
    expect(result.streakDays).toBe(0)
    expect(result.lastPlayedIsoDate).toBeNull()
    expect(result.todayQualified).toBe(false)
  })

  it('۳ روز متوالی موفق → سطح ۲ (قانون اصلی کاربر)', () => {
    const sessions = [
      session('2026-01-01', 85),
      session('2026-01-02', 90),
      session('2026-01-03', 80),
    ]
    const result = computeAdaptiveDifficulty(sessions, '2026-01-03')
    expect(result.recommendedLevel).toBe(2)
    expect(result.levelHistory).toEqual([
      { isoDate: '2026-01-03', from: 1, to: 2, reason: 'streak-3-days' },
    ])
    expect(result.totalSessions).toBe(3)
  })

  it('۲ روز موفق + روز جاافتاده → رکورد صفر، سطح ۱ باقی می‌ماند', () => {
    const sessions = [session('2026-01-01', 90), session('2026-01-02', 90), session('2026-01-05', 90)]
    const result = computeAdaptiveDifficulty(sessions, '2026-01-05')
    expect(result.recommendedLevel).toBe(1)
    expect(result.streakDays).toBe(1) // فقط ۵ ژانویه پس از شکست رکورد
  })

  it('روز ضعیف (بهترین دقت < ۵۰) → یک سطح کاهش و شکست رکورد', () => {
    const sessions = [
      session('2026-01-01', 85),
      session('2026-01-02', 90),
      session('2026-01-03', 80), // سطح → ۲
      session('2026-01-04', 40, 2), // روز ضعیف در سطح جدید → سطح ۱
    ]
    const result = computeAdaptiveDifficulty(sessions, '2026-01-04')
    expect(result.recommendedLevel).toBe(1)
    expect(result.levelHistory).toHaveLength(2)
    expect(result.levelHistory[1]).toEqual({
      isoDate: '2026-01-04',
      from: 2,
      to: 1,
      reason: 'weak-day',
    })
  })

  it('روز ضعیف در سطح ۱ → کف ۱ حفظ می‌شود (کاهش بیشتر نه)', () => {
    const result = computeAdaptiveDifficulty([session('2026-01-01', 10)], '2026-01-01')
    expect(result.recommendedLevel).toBe(1)
    expect(result.levelHistory).toHaveLength(0)
  })

  it('روز معمولی (دقت بین ۵۰ و ۸۰) → رکورد می‌شکند ولی سطح تغییر نمی‌کند', () => {
    const sessions = [session('2026-01-01', 85), session('2026-01-02', 90), session('2026-01-03', 65)]
    const result = computeAdaptiveDifficulty(sessions, '2026-01-03')
    expect(result.recommendedLevel).toBe(1)
    expect(result.streakDays).toBe(0)
  })

  it('سقف سطح ۵ رعایت می‌شود', () => {
    // ۱۲ روز متوالی موفق → ۴ بار افزایش (۱→۵) و در سقف می‌ماند
    const sessions: SessionRecord[] = []
    for (let i = 1; i <= 12; i++) {
      const day = `2026-01-${String(i).padStart(2, '0')}`
      // هر سطح ۳ روز؛ ترتیب سطح جلسه = سطح پیشنهادی همان لحظه
      const currentLevel = Math.min(1 + Math.floor((i - 1) / 3), 5)
      sessions.push(session(day, 90, currentLevel))
    }
    const result = computeAdaptiveDifficulty(sessions, '2026-01-12')
    expect(result.recommendedLevel).toBe(5)
    expect(result.levelHistory).toHaveLength(4)
    // روزهای ۱۳ تا ۱۵ موفق در سطح ۵ → دیگر افزایش نه
    for (let i = 13; i <= 15; i++) {
      sessions.push(session(`2026-01-${i}`, 95, 5))
    }
    const afterCap = computeAdaptiveDifficulty(sessions, '2026-01-15')
    expect(afterCap.recommendedLevel).toBe(5)
    expect(afterCap.levelHistory).toHaveLength(4)
  })

  it('جلسات با سطح دستی (غیر از سطح پیشنهادی لحظه‌ای) نادیده گرفته می‌شوند', () => {
    // دو روز موفق در سطح ۱ + یک روز فقط سطح ۳ (دستی) → سطح همچنان ۱ و رکورد بعد از روز دستی شکسته
    const sessions = [
      session('2026-01-01', 90),
      session('2026-01-02', 90),
      session('2026-01-03', 100, 3), // دستی
    ]
    const result = computeAdaptiveDifficulty(sessions, '2026-01-03')
    expect(result.recommendedLevel).toBe(1)
    expect(result.streakDays).toBe(0)
    expect(result.todayQualified).toBe(false)
  })

  it('چند جلسه در یک روز: بهترین دقت همان روز ملاک است', () => {
    const sessions = [
      session('2026-01-01', 85),
      session('2026-01-02', 60), // اول ضعیف‌تر
      session('2026-01-02', 90), // سپس موفق — بهترین ۹۰
      session('2026-01-03', 85),
    ]
    const result = computeAdaptiveDifficulty(sessions, '2026-01-03')
    expect(result.recommendedLevel).toBe(2)
  })

  it('جلسات in_progress و aborted در ارزیابی نیستند', () => {
    const sessions = [
      session('2026-01-01', 85),
      session('2026-01-01', 85, 1, 'aborted'),
      session('2026-01-02', 90),
      session('2026-01-02', 90, 1, 'in_progress'),
      session('2026-01-03', 80),
    ]
    const result = computeAdaptiveDifficulty(sessions, '2026-01-03')
    expect(result.totalSessions).toBe(3)
    expect(result.recommendedLevel).toBe(2)
  })

  it('رکورد با آخرین تمرین دیروز معتبر، با ۲ روز فاصله صفر می‌شود', () => {
    const twoDaysAgo = [session('2026-01-08', 85), session('2026-01-08', 85)]
    const resultOld = computeAdaptiveDifficulty(twoDaysAgo, '2026-01-10')
    expect(resultOld.streakDays).toBe(0) // فاصله ۲ روز → شکسته

    const yesterday = [session('2026-01-09', 85)]
    const resultYesterday = computeAdaptiveDifficulty(yesterday, '2026-01-10')
    expect(resultYesterday.streakDays).toBe(1) // دیروز → فرصت امروز باقی است
  })

  it('todayQualified فقط برای جلسه موفق در سطح نهایی امروز صادق است', () => {
    const today = '2026-01-05'
    const weakToday = computeAdaptiveDifficulty([session(today, 60)], today)
    expect(weakToday.todayQualified).toBe(false)
    const goodToday = computeAdaptiveDifficulty([session(today, 85)], today)
    expect(goodToday.todayQualified).toBe(true)
  })

  it('توالی کامل واقع‌گرایانه: صعود، افت، بازسازی', () => {
    const sessions: SessionRecord[] = [
      session('2026-02-01', 85),
      session('2026-02-02', 88),
      session('2026-02-03', 82), // → سطح ۲
      session('2026-02-04', 86, 2),
      session('2026-02-05', 84, 2),
      session('2026-02-06', 81, 2), // → سطح ۳
      session('2026-02-07', 30, 3), // روز ضعیف → سطح ۲
      session('2026-02-08', 55, 2), // روز معمولی
      session('2026-02-09', 80, 2),
      session('2026-02-10', 90, 2),
      session('2026-02-11', 84, 2), // → سطح ۳
    ]
    const result = computeAdaptiveDifficulty(sessions, '2026-02-11')
    expect(result.recommendedLevel).toBe(3)
    expect(result.levelHistory.map((c) => `${c.from}→${c.to}`)).toEqual(['1→2', '2→3', '3→2', '2→3'])
    expect(result.streakDays).toBe(0) // با ارتقا ریست شد
    // ارتقا در همین روز رخ داده؛ جلسه امروز در سطح قبلی (۲) بود نه سطح نهایی (۳)
    expect(result.todayQualified).toBe(false)
  })

  it('قطعی است: دو فراخوانی با ورودی یکسان نتیجه یکسان', () => {
    const sessions = [session('2026-01-01', 85), session('2026-01-02', 40)]
    expect(computeAdaptiveDifficulty(sessions, '2026-01-02')).toEqual(
      computeAdaptiveDifficulty(sessions, '2026-01-02'),
    )
  })

  it('toLocalIsoDate درست کار می‌کند', () => {
    expect(toLocalIsoDate(new Date('2026-03-05T09:30:00').getTime())).toBe('2026-03-05')
  })
})
