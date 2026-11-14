import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { scheduleCadence } from './presentation-resume'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('scheduleCadence — زمان‌بندی پلکانی با ادامهٔ پس از مکث', () => {
  const twoItems = (onShow: ReturnType<typeof vi.fn>, onHide: ReturnType<typeof vi.fn>) => [
    { startAt: 0, displayMs: 500, onShow: () => onShow(0), onHide: () => onHide(0) },
    { startAt: 800, displayMs: 500, onShow: () => onShow(1), onHide: () => onHide(1) },
  ]

  it('حالت تازه: هر آیتم در جای خودش و onDone در پایان', () => {
    const onShow = vi.fn()
    const onHide = vi.fn()
    const onDone = vi.fn()
    const timers = scheduleCadence(twoItems(onShow, onHide), 1300, onDone)
    expect(timers.length).toBe(5)

    vi.advanceTimersByTime(799)
    expect(onShow).toHaveBeenCalledWith(0)
    expect(onHide).toHaveBeenCalledWith(0)
    expect(onShow).not.toHaveBeenCalledWith(1)
    vi.advanceTimersByTime(1)
    expect(onShow).toHaveBeenCalledWith(1)
    vi.advanceTimersByTime(500)
    expect(onHide).toHaveBeenCalledWith(1)
    expect(onDone).toHaveBeenCalledOnce()
  })

  it('ادامه از میان نمایشِ آیتم اول: فوری روشن، بدون بازپخش آیتم گذشته', () => {
    const onShow = vi.fn()
    const onHide = vi.fn()
    const onDone = vi.fn()
    // ۳۰۰ms درون نمایش آیتم اول (۰..۵۰۰)
    scheduleCadence(twoItems(onShow, onHide), 1300, onDone, 300)

    // آیتم اول همین حالا (همگام) روشن — دوباره از ۰ نمایش نمی‌گیرد
    expect(onShow).toHaveBeenCalledWith(0)
    vi.advanceTimersByTime(200) // پایان ماندهٔ آیتم اول
    expect(onHide).toHaveBeenCalledWith(0)
    vi.advanceTimersByTime(300) // شروع آیتم دوم
    expect(onShow).toHaveBeenCalledWith(1)
    expect(onShow).toHaveBeenCalledTimes(2) // فقط آیتم اول (فوری) و دوم
  })

  it('ادامه از فاصلهٔ بین آیتم‌ها: آیتم گذشته هرگز دوباره نشان داده نمی‌شود', () => {
    const onShow = vi.fn()
    const onHide = vi.fn()
    const onDone = vi.fn()
    // ۶۰۰ms: آیتم اول (۰..۵۰۰) تمام شده
    scheduleCadence(twoItems(onShow, onHide), 1300, onDone, 600)
    expect(onShow).not.toHaveBeenCalled()
    vi.advanceTimersByTime(200) // شروع آیتم دوم در ۸۰۰
    expect(onShow).toHaveBeenCalledWith(1)
    vi.advanceTimersByTime(500)
    expect(onDone).toHaveBeenCalledOnce()
  })

  it('ارائهٔ تمام‌شده: بدون هیچ تایمری مستقیماً onDone (مکث در فاز پاسخ)', () => {
    const onShow = vi.fn()
    const onDone = vi.fn()
    const timers = scheduleCadence(twoItems(onShow, vi.fn()), 1300, onDone, 5000)
    expect(timers.length).toBe(0)
    expect(onShow).not.toHaveBeenCalled()
    expect(onDone).toHaveBeenCalledOnce()
  })
})
