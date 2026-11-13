// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { configForDifficulty, calculation20Definition as def } from './engine'

const SEED = 99

describe('Calculation × 20 — engine', () => {
  it('عملیات هر سطح دشواری درست تنظیم می‌شود', () => {
    expect(configForDifficulty(1).operators).toEqual(['+', '-'])
    expect(configForDifficulty(2).operandRange.addMax).toBe(20)
    expect(configForDifficulty(3).operators).toEqual(['×'])
    expect(configForDifficulty(4).operators).toEqual(['+', '-', '×'])
    expect(configForDifficulty(5).operators).toEqual(['+', '-', '×', '÷'])
    expect(() => configForDifficulty(9)).toThrow(RangeError)
  })

  it('سؤالات تولیدشده قطعی و پاسخ‌شان همیشه درست است', () => {
    const config = configForDifficulty(5)
    const s1 = def.createSession('a', config, SEED)
    const s2 = def.createSession('b', config, SEED)
    for (let i = 0; i < 20; i++) {
      let a = s1
      let b = s2
      for (let j = 0; j < i; j++) {
        const sa = def.nextTrial(a)
        a = def.submitAnswer(sa.state, sa.trial.question.answer, 100)
        const sb = def.nextTrial(b)
        b = def.submitAnswer(sb.state, sb.trial.question.answer, 100)
      }
      const t1 = def.nextTrial(a).trial
      const t2 = def.nextTrial(b).trial
      expect(t1.question).toEqual(t2.question)
      const q = t1.question
      const computed =
        q.operator === '+'
          ? q.a + q.b
          : q.operator === '-'
            ? q.a - q.b
            : q.operator === '×'
              ? q.a * q.b
              : q.a / q.b
      expect(computed).toBe(q.answer)
      expect(Number.isInteger(q.answer)).toBe(true)
      expect(t1.responseWindowMs).toBeNull()
    }
  })

  it('تفریق همیشه نتیجه نامنفی دارد', () => {
    const config = { ...configForDifficulty(2), operators: ['-'] as const }
    const state = def.createSession('a', config, SEED)
    let current = state
    for (let i = 0; i < config.totalTrials; i++) {
      const step = def.nextTrial(current)
      expect(step.trial.question.a).toBeGreaterThanOrEqual(step.trial.question.b)
      current = def.submitAnswer(step.state, step.trial.question.answer, 50)
    }
  })

  it('تقسیم همیشه دقیق است (باقی‌مانده صفر)', () => {
    const config = { ...configForDifficulty(5), operators: ['÷'] as const }
    const state = def.createSession('a', config, SEED)
    let current = state
    for (let i = 0; i < config.totalTrials; i++) {
      const step = def.nextTrial(current)
      expect(step.trial.question.a % step.trial.question.b).toBe(0)
      current = def.submitAnswer(step.state, step.trial.question.answer, 50)
    }
  })

  it('پاسخ درست/غلط/null درست ثبت می‌شوند', () => {
    const state = def.createSession('a', configForDifficulty(1), SEED)
    const { trial, state: s1 } = def.nextTrial(state)
    const right = def.submitAnswer(s1, trial.question.answer, 700)
    expect(right.results[0]?.outcome).toBe('correct')
    const wrong = def.submitAnswer(s1, trial.question.answer + 1, 700)
    expect(wrong.results[0]?.outcome).toBe('incorrect')
    expect(wrong.results[0]?.correct).toBe(false)
    const none = def.submitAnswer(s1, null, 0)
    expect(none.results[0]?.outcome).toBe('omission')
  })

  it('جلسه ۲۰ سؤالی کامل و QPM مثبت است', () => {
    const config = configForDifficulty(2)
    let state = def.createSession('a', config, SEED)
    for (let i = 0; i < config.totalTrials; i++) {
      const step = def.nextTrial(state)
      state = def.submitAnswer(step.state, i % 4 === 3 ? -1 : step.trial.question.answer, 3000)
    }
    expect(def.isComplete(state)).toBe(true)
    const summary = def.getSummary(state)
    expect(summary.totalTrials).toBe(20)
    expect(summary.correctTrials).toBe(15)
    expect(summary.accuracy).toBe(75)
    expect(summary.metrics['questionsPerMinute']).toBeGreaterThan(0)
    // زمان پاسخ ۳ ثانیه × ۲۰ → ۱ دقیقه → ۲۰ سؤال در دقیقه
    expect(summary.metrics['questionsPerMinute']).toBe(20)
  })
})
