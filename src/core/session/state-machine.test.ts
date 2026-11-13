// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { canDispatch, dispatch, dispatchAll, initialMachineState, isTerminal } from './state-machine'
import type { SessionEvent } from './state-machine'

describe('Session State Machine', () => {
  it('حالت اولیه IDLE است', () => {
    expect(initialMachineState().phase).toBe('IDLE')
  })

  it('مسیر خوش‌بخیت کامل اجرا می‌شود: IDLE→READY→COUNTDOWN→ACTIVE→COMPLETED', () => {
    const final = dispatchAll(initialMachineState(), [
      'PREPARE',
      'BEGIN_COUNTDOWN',
      'START_ACTIVE',
      'COMPLETE',
    ])
    expect(final.phase).toBe('COMPLETED')
    expect(isTerminal(final.phase)).toBe(true)
  })

  it('PAUSE/RESUME بین ACTIVE رفت‌وبرگشت می‌کند و شمارنده pause را زیاد می‌کند', () => {
    const active = dispatchAll(initialMachineState(), ['PREPARE', 'BEGIN_COUNTDOWN', 'START_ACTIVE'])
    const paused = dispatch(active, 'PAUSE')
    expect(paused.phase).toBe('PAUSED')
    expect(paused.phaseBeforePause).toBe('ACTIVE')
    expect(paused.pauseCount).toBe(1)
    const resumed = dispatch(paused, 'RESUME')
    expect(resumed.phase).toBe('ACTIVE')
    expect(resumed.phaseBeforePause).toBeNull()
  })

  it('PAUSE در COUNTDOWN، پس از RESUME به COUNTDOWN برمی‌گردد', () => {
    const countdown = dispatchAll(initialMachineState(), ['PREPARE', 'BEGIN_COUNTDOWN'])
    const paused = dispatch(countdown, 'PAUSE')
    expect(paused.phase).toBe('PAUSED')
    expect(dispatch(paused, 'RESUME').phase).toBe('COUNTDOWN')
  })

  it('ABORT از هر فاز اجرایی مجاز است', () => {
    const paths: readonly (readonly SessionEvent[])[] = [
      ['PREPARE'],
      ['PREPARE', 'BEGIN_COUNTDOWN'],
      ['PREPARE', 'BEGIN_COUNTDOWN', 'START_ACTIVE'],
    ]
    for (const events of paths) {
      const state = dispatchAll(initialMachineState(), events)
      expect(dispatch(state, 'ABORT').phase).toBe('ABORTED')
    }
    const paused = dispatchAll(initialMachineState(), ['PREPARE', 'BEGIN_COUNTDOWN', 'START_ACTIVE', 'PAUSE'])
    expect(dispatch(paused, 'ABORT').phase).toBe('ABORTED')
  })

  it('RESET فقط از حالت پایانی به IDLE برمی‌گرداند', () => {
    const completed = dispatchAll(initialMachineState(), ['PREPARE', 'BEGIN_COUNTDOWN', 'START_ACTIVE', 'COMPLETE'])
    expect(dispatch(completed, 'RESET').phase).toBe('IDLE')
    const active = dispatchAll(initialMachineState(), ['PREPARE', 'BEGIN_COUNTDOWN', 'START_ACTIVE'])
    expect(() => dispatch(active, 'RESET')).toThrow()
  })

  it('رویدادهای نامعتبر خطا می‌دهند (نه نادیده گرفته می‌شوند)', () => {
    const idle = initialMachineState()
    expect(() => dispatch(idle, 'START_ACTIVE')).toThrow()
    expect(() => dispatch(idle, 'PAUSE')).toThrow()
    expect(() => dispatch(idle, 'COMPLETE')).toThrow()
    expect(() => dispatch(idle, 'RESUME')).toThrow()

    const ready = dispatch(idle, 'PREPARE')
    expect(() => dispatch(ready, 'START_ACTIVE')).toThrow()
    expect(() => dispatch(ready, 'COMPLETE')).toThrow()

    const active = dispatchAll(ready, ['BEGIN_COUNTDOWN', 'START_ACTIVE'])
    expect(() => dispatch(active, 'PREPARE')).toThrow()
    expect(() => dispatch(active, 'BEGIN_COUNTDOWN')).toThrow()

    // PAUSE تکراری مجاز نیست
    const paused = dispatch(active, 'PAUSE')
    expect(() => dispatch(paused, 'PAUSE')).toThrow()
  })

  it('COMPLETE فقط از ACTIVE مجاز است', () => {
    const ready = dispatch(initialMachineState(), 'PREPARE')
    expect(canDispatch(ready, 'COMPLETE')).toBe(false)
    const active = dispatchAll(ready, ['BEGIN_COUNTDOWN', 'START_ACTIVE'])
    expect(canDispatch(active, 'COMPLETE')).toBe(true)
  })

  it('پس از حالت پایانی هیچ رویداد اجرایی مجاز نیست جز RESET', () => {
    const completed = dispatchAll(initialMachineState(), [
      'PREPARE',
      'BEGIN_COUNTDOWN',
      'START_ACTIVE',
      'COMPLETE',
    ])
    for (const event of ['PREPARE', 'BEGIN_COUNTDOWN', 'START_ACTIVE', 'PAUSE', 'RESUME', 'COMPLETE', 'ABORT'] as const) {
      expect(canDispatch(completed, event)).toBe(false)
    }
    expect(canDispatch(completed, 'RESET')).toBe(true)
  })
})
