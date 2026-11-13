// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { SessionTimer } from './session-timer'

/** ساعت جعلی که با دستور tick جلو می‌رود */
function fakeClock() {
  let now = 0
  return {
    tick: (ms: number) => {
      now += ms
    },
    clock: () => now,
  }
}

describe('SessionTimer', () => {
  it('زمان سپری‌شده را بدون pause درست می‌سنجد', () => {
    const c = fakeClock()
    const timer = new SessionTimer(c.clock)
    timer.start()
    c.tick(1000)
    expect(timer.elapsedMs()).toBe(1000)
    c.tick(500)
    expect(timer.elapsedMs()).toBe(1500)
  })

  it('زمان PAUSE را از elapsed حذف می‌کند', () => {
    const c = fakeClock()
    const timer = new SessionTimer(c.clock)
    timer.start()
    c.tick(2000)
    timer.pause()
    c.tick(60_000) // یک دقیقه tab مخفی
    expect(timer.elapsedMs()).toBe(2000)
    timer.resume()
    c.tick(3000)
    expect(timer.elapsedMs()).toBe(5000)
  })

  it('چرخه‌های متعدد pause/resume درست جمع می‌شوند', () => {
    const c = fakeClock()
    const timer = new SessionTimer(c.clock)
    timer.start()
    c.tick(100)
    timer.pause()
    c.tick(999)
    timer.resume()
    c.tick(200)
    timer.pause()
    c.tick(999)
    timer.resume()
    c.tick(300)
    expect(timer.elapsedMs()).toBe(600)
  })

  it('now همان elapsed است (برای محاسبه RT)', () => {
    const c = fakeClock()
    const timer = new SessionTimer(c.clock)
    timer.start()
    c.tick(120)
    const shownAt = timer.now()
    c.tick(80)
    const answeredAt = timer.now()
    expect(answeredAt - shownAt).toBe(80)
  })

  it('stop زمان کل فعال را برمی‌گرداند و قفل می‌کند', () => {
    const c = fakeClock()
    const timer = new SessionTimer(c.clock)
    timer.start()
    c.tick(700)
    timer.pause()
    c.tick(50_000)
    timer.resume()
    c.tick(300)
    expect(timer.stop()).toBe(1000)
    c.tick(10_000)
    expect(timer.elapsedMs()).toBe(1000) // پس از stop ثابت می‌ماند
  })

  it('فراخوانی‌های نامعتبر خطا می‌دهند', () => {
    const c = fakeClock()
    const timer = new SessionTimer(c.clock)
    expect(() => timer.pause()).toThrow()
    expect(() => timer.stop()).toThrow()
    timer.start()
    expect(() => timer.start()).toThrow()
    expect(() => timer.resume()).toThrow()
    timer.pause()
    expect(() => timer.pause()).toThrow()
    timer.resume()
    timer.stop()
    expect(() => timer.start()).toThrow()
  })

  it('بدون start، elapsed صفر است', () => {
    const c = fakeClock()
    const timer = new SessionTimer(c.clock)
    c.tick(5000)
    expect(timer.elapsedMs()).toBe(0)
  })
})
