// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { ChangeDetectionTrial } from './engine'
import { CD_PALETTE, configForDifficulty, changeDetectionDefinition as def } from './engine'

const SEED = 3030

describe('Change Detection — engine', () => {
  it('دشواری بالاتر آرایهٔ بزرگ‌تر و فاصلهٔ خالی طولانی‌تری می‌دهد', () => {
    const l1 = configForDifficulty(1)
    const l5 = configForDifficulty(5)
    expect(l1.arraySize).toBe(2)
    expect(l5.arraySize).toBe(8)
    expect(l1.blankMs).toBeLessThan(l5.blankMs)
    expect(l1.displayMs).toBe(500)
    expect(l1.totalTrials).toBe(16)
    expect(() => configForDifficulty(0)).toThrow(RangeError)
    expect(CD_PALETTE.length).toBeGreaterThanOrEqual(8 + 2)
  })

  it('تولید مرحله قطعی است؛ ساختار آرایه سالم (خانه/رنگ یکتا، تغییر بی‌ابهام)', () => {
    const config = configForDifficulty(3)
    const s1 = def.createSession('a', config, SEED)
    const s2 = def.createSession('b', config, SEED)
    expect(def.nextTrial(s1).trial).toEqual(def.nextTrial(s2).trial)

    const trial = def.nextTrial(s1).trial
    expect(trial.positions.length).toBe(config.arraySize)
    expect(new Set(trial.positions).size).toBe(config.arraySize)
    expect(new Set(trial.colors).size).toBe(config.arraySize)
    expect(trial.positions).toEqual([...trial.positions].sort((a, b) => a - b))
    if (trial.changed) {
      expect(trial.changedIndex).not.toBeNull()
      expect(trial.testColor).not.toBeNull()
      // رنگ جدید جزو رنگ‌های نمونه نیست — تغییر بی‌ابهام است
      expect(trial.colors).not.toContain(trial.testColor)
    } else {
      expect(trial.changedIndex).toBeNull()
      expect(trial.testColor).toBeNull()
    }
    expect(trial.responseWindowMs).toBeNull()
  })

  it('توزیع مراحل تغییر/بدون‌تغییر در جلسه متعادل است (~۵۰/۵۰)', () => {
    const config = configForDifficulty(2)
    let state = def.createSession('a', config, SEED)
    let changed = 0
    for (let i = 0; i < config.totalTrials; i += 1) {
      const step = def.nextTrial(state)
      if (step.trial.changed) changed += 1
      state = def.submitAnswer(step.state, 'unchanged', 900)
    }
    expect(changed).toBeGreaterThan(4)
    expect(changed).toBeLessThan(12)
  })

  it('دوداوری درست/غلط/بی‌پاسخ درست ارزیابی می‌شود', () => {
    const state = def.createSession('a', configForDifficulty(1), SEED)
    const base: Omit<ChangeDetectionTrial, 'changed' | 'changedIndex' | 'testColor'> = {
      trialIndex: 0,
      positions: [2, 4, 6],
      colors: ['sky', 'rose', 'amber'],
      displayMs: 500,
      blankMs: 900,
      responseWindowMs: null,
    }
    const changedTrial: ChangeDetectionTrial = {
      ...base,
      changed: true,
      changedIndex: 1,
      testColor: 'emerald',
    }
    const unchangedTrial: ChangeDetectionTrial = {
      ...base,
      changed: false,
      changedIndex: null,
      testColor: null,
    }

    const hit = def.submitAnswer({ ...state, currentTrial: changedTrial }, 'changed', 700)
    expect(hit.results[0]?.outcome).toBe('correct')
    const miss = def.submitAnswer({ ...state, currentTrial: changedTrial }, 'unchanged', 700)
    expect(miss.results[0]?.outcome).toBe('incorrect')
    const fa = def.submitAnswer({ ...state, currentTrial: unchangedTrial }, 'changed', 700)
    expect(fa.results[0]?.outcome).toBe('incorrect')
    const cr = def.submitAnswer({ ...state, currentTrial: unchangedTrial }, 'unchanged', 700)
    expect(cr.results[0]?.outcome).toBe('correct')
    const omit = def.submitAnswer({ ...state, currentTrial: changedTrial }, null, 0)
    expect(omit.results[0]?.outcome).toBe('omission')
    expect(omit.results[0]?.reactionTimeMs).toBeNull()
  })

  it('summary نرخ‌ها و k تصحیح حدس را درست می‌سازد', () => {
    const config = configForDifficulty(3) // آرایهٔ ۴تایی
    let state = def.createSession('a', config, SEED)
    for (let i = 0; i < config.totalTrials; i += 1) {
      const step = def.nextTrial(state)
      // پاسخ همیشه درست
      state = def.submitAnswer(step.state, step.trial.changed ? 'changed' : 'unchanged', 800)
    }
    const summary = def.getSummary(state)
    expect(summary.totalTrials).toBe(16)
    expect(summary.metrics['hitRate']).toBe(100)
    expect(summary.metrics['falseAlarmRate']).toBe(0)
    // همه‌درست → k = اندازهٔ آرایهٔ میانگین = ۴
    expect(summary.metrics['kEstimate']).toBe(4)
    expect(summary.metrics['meanArraySize']).toBe(4)
    expect(() => def.nextTrial(state)).toThrow()
  })

  it('جلسهٔ همیشه‌«تغییر کرد» → زنگ‌خطر ۱۰۰٪ و k منفی/صفر (تصحیح حدس فعال)', () => {
    const config = configForDifficulty(2) // آرایهٔ ۳تایی
    let state = def.createSession('a', config, SEED)
    for (let i = 0; i < config.totalTrials; i += 1) {
      const step = def.nextTrial(state)
      state = def.submitAnswer(step.state, 'changed', 800)
    }
    const summary = def.getSummary(state)
    expect(summary.metrics['hitRate']).toBe(100)
    expect(summary.metrics['falseAlarmRate']).toBe(100)
    expect(summary.metrics['kEstimate']).toBe(0)
  })
})
