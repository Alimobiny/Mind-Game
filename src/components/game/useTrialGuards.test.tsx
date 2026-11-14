import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { ActiveGameContext } from './GameShell'
import { useTrialGuards } from './useTrialGuards'
import type { SubmitResult } from '../../core/session/session-manager'

/**
 * سه‌گاردِ قراردادی + re-arm مهلت — در سطح هوک با ctx ساختگی تست می‌شوند؛
 * رفتار یکپارچهٔ UI (رندر، مکث، بازنصب) در GameShell.test و e2e پوشش دارد.
 */

interface CtxHarness {
  ctx: ActiveGameContext
  submits: unknown[]
  advances: number
  respond: (answer: unknown) => SubmitResult
}

function makeCtx(): CtxHarness {
  const harness: CtxHarness = {
    submits: [],
    advances: 0,
    respond: () => ({ accepted: true, record: fakeRecord(), sessionCompleted: false }),
    ctx: null as unknown as ActiveGameContext,
  }
  harness.ctx = {
    trial: { trialIndex: 0, responseWindowMs: null },
    answeredTrials: 0,
    submit: (answer) => {
      harness.submits.push(answer)
      return Promise.resolve(harness.respond(answer))
    },
    advance: () => {
      harness.advances += 1
      return { trialIndex: 1, responseWindowMs: null }
    },
    lastOutcome: null,
    timeRemainingMs: () => null,
    trialElapsedMs: () => 0,
    trialPresentation: { get: () => undefined, set: () => undefined, wasInterrupted: () => false },
    pause: () => undefined,
    paused: false,
  }
  return harness
}

function fakeRecord() {
  return {
    trialIndex: 0,
    stimulus: null,
    expected: null,
    given: null,
    outcome: 'omission' as const,
    correct: false,
    reactionTimeMs: null,
  }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('useTrialGuards — قفل پاسخ و advance امن', () => {
  it('submitOnce: ثبت، بازخورد و advance امن؛ دوبارهٔ هم‌زمان رد می‌شود', async () => {
    const h = makeCtx()
    const { result } = renderHook(() => useTrialGuards(h.ctx, 0))

    const accepted = vi.fn()
    let p1: Promise<void> | null = null
    await act(async () => {
      p1 = result.current.submitOnce('a', { onAccepted: accepted })
      // صدا زدن دوباره پیش از تکمیل اولی — قفل همین حالا بسته است
      result.current.submitOnce('b')
      await p1
    })

    expect(h.submits).toEqual(['a'])
    expect(accepted).toHaveBeenCalledOnce()
    expect(h.advances).toBe(1)
  })

  it('پاسخ ردشده (persist_failed) قفل را باز می‌کند — تلاش مجدد ممکن است', async () => {
    const h = makeCtx()
    h.respond = () => ({ accepted: false, reason: 'persist_failed' })
    const { result } = renderHook(() => useTrialGuards(h.ctx, 0))

    await act(async () => {
      await result.current.submitOnce('x')
    })
    expect(result.current.isSubmitted()).toBe(false)

    h.respond = () => ({ accepted: true, record: fakeRecord(), sessionCompleted: false })
    await act(async () => {
      await result.current.submitOnce('y')
    })
    expect(h.submits).toEqual(['x', 'y'])
    expect(h.advances).toBe(1)
  })

  it('sessionCompleted: advance زده نمی‌شود؛ autoAdvance:false هم advance نمی‌زند', async () => {
    const h = makeCtx()
    h.respond = () => ({ accepted: true, record: fakeRecord(), sessionCompleted: true })
    const { result } = renderHook(() => useTrialGuards(h.ctx, 0))
    await act(async () => {
      await result.current.submitOnce('last')
    })
    expect(h.advances).toBe(0)

    const h2 = makeCtx()
    const { result: r2 } = renderHook(() => useTrialGuards(h2.ctx, 0))
    await act(async () => {
      await r2.current.submitOnce('delayed', { autoAdvance: false })
    })
    expect(h2.advances).toBe(0)
  })

  it('advance پرتاب‌کننده خطا نمی‌سازد (جلسهٔ هم‌زمان قطع/تکمیل شده)', async () => {
    const h = makeCtx()
    h.ctx.advance = () => {
      throw new Error('advanceTrial در فاز COMPLETED مجاز نیست')
    }
    const { result } = renderHook(() => useTrialGuards(h.ctx, 0))
    await act(async () => {
      await result.current.submitOnce('a')
    })
    expect(h.submits).toEqual(['a'])
  })
})

describe('useTrialGuards — تایمرهای ردیابی‌شده', () => {
  it('تایمرهای ردیابی‌شده در تغییر مرحله و unmount پاک می‌شوند', async () => {
    const h = makeCtx()
    const fired: number[] = []
    const { result, rerender, unmount } = renderHook(({ idx }: { idx: number } = { idx: 0 }) =>
      useTrialGuards(h.ctx, idx),
    )

    result.current.setTrackedTimeout(() => fired.push(1), 1000)
    // تغییر مرحله — افکت پیش از تایمرهای تازهٔ بازی پاک می‌کند
    rerender({ idx: 1 })
    result.current.setTrackedTimeout(() => fired.push(2), 1000)
    unmount()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(fired).toEqual([])
  })
})

describe('useTrialGuards — مهلت پاسخ و re-arm پس از rollback', () => {
  it('انقضای مهلت: پاسخِ خواسته‌شده ثبت و advance می‌زند', async () => {
    const h = makeCtx()
    const { result } = renderHook(() => useTrialGuards(h.ctx, 0))

    result.current.armDeadline(() => null, 2500)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500)
    })
    expect(h.submits).toEqual([null])
    expect(h.advances).toBe(1)
  })

  it('پاسخ کاربر پیش از انقضا، مهلت را بی‌اثر می‌کند', async () => {
    const h = makeCtx()
    const { result } = renderHook(() => useTrialGuards(h.ctx, 0))

    result.current.armDeadline(() => null, 2500)
    await act(async () => {
      await result.current.submitOnce('user')
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500)
    })
    expect(h.submits).toEqual(['user'])
    expect(h.advances).toBe(1)
  })

  it('rollback ذخیره در انقضا: قفل باز + مسلح‌شدن دوباره با پنجرهٔ کوتاه', async () => {
    const h = makeCtx()
    let failures = 1
    h.respond = () => {
      if (failures > 0) {
        failures -= 1
        return { accepted: false, reason: 'persist_failed' }
      }
      return { accepted: true, record: fakeRecord(), sessionCompleted: false }
    }
    const { result } = renderHook(() => useTrialGuards(h.ctx, 0))

    result.current.armDeadline(() => null, 1000)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    // رد شد — قفل باز و هنوز ثبت نهایی نشده
    expect(h.submits).toEqual([null])
    expect(result.current.isSubmitted()).toBe(false)

    // پنجرهٔ تلاش مجدد (۳ث) — این‌بار پذیرفته می‌شود
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000)
    })
    expect(h.submits).toEqual([null, null])
    expect(h.advances).toBe(1)
  })

  it('سقف تلاش: پس از دو re-arm، حلقهٔ بی‌نهایت روی خطای پایدار ساخته نمی‌شود', async () => {
    const h = makeCtx()
    h.respond = () => ({ accepted: false, reason: 'persist_failed' })
    const { result } = renderHook(() => useTrialGuards(h.ctx, 0))

    result.current.armDeadline(() => null, 100)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100 + 2 * 3000 + 1000)
    })
    // انقضای اول + ۲ تلاش مجدد = ۳ ثبت؛ بعد از آن قفل باز می‌ماند بدون تایمر
    expect(h.submits.length).toBe(3)
    expect(result.current.isSubmitted()).toBe(false)
  })

  it('ردِ غیر از persist_failed (already_answered) re-arm نمی‌شود', async () => {
    const h = makeCtx()
    h.respond = () => ({ accepted: false, reason: 'already_answered' })
    const { result } = renderHook(() => useTrialGuards(h.ctx, 0))

    result.current.armDeadline(() => null, 100)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100 + 4000)
    })
    expect(h.submits.length).toBe(1)
  })
})
