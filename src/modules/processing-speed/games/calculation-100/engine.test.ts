import { describe, expect, it } from 'vitest'
import {
  calculation100Definition as def,
  configForDifficulty,
  type ArithmeticQuestion,
  type Calculation100Config,
} from './engine'

const SEED = 99

function computedAnswer(q: ArithmeticQuestion): number {
  switch (q.operator) {
    case '+':
      return q.a + q.b
    case '-':
      return q.a - q.b
    case '×':
      return q.a * q.b
    case '÷':
      return q.a / q.b
  }
}

function expectOperandsInRange(q: ArithmeticQuestion, config: Calculation100Config): void {
  const { addMax, mulMax } = config.operandRange
  switch (q.operator) {
    case '+':
    case '-':
      expect(q.a).toBeGreaterThanOrEqual(1)
      expect(q.a).toBeLessThanOrEqual(addMax)
      expect(q.b).toBeGreaterThanOrEqual(1)
      expect(q.b).toBeLessThanOrEqual(addMax)
      break
    case '×':
      expect(q.a).toBeGreaterThanOrEqual(2)
      expect(q.a).toBeLessThanOrEqual(mulMax)
      expect(q.b).toBeGreaterThanOrEqual(2)
      expect(q.b).toBeLessThanOrEqual(mulMax)
      break
    case '÷':
      expect(q.b).toBeGreaterThanOrEqual(2)
      expect(q.b).toBeLessThanOrEqual(mulMax)
      expect(q.a).toBeLessThanOrEqual(mulMax * mulMax)
      break
  }
}

describe('Calculation × 100 — engine', () => {
  it('عملیات و دامنه‌های هر سطح دشواری درست تنظیم می‌شود', () => {
    for (let level = 1; level <= 5; level++) {
      expect(configForDifficulty(level).totalTrials).toBe(100)
      expect(configForDifficulty(level).difficulty).toBe(level)
    }
    expect(configForDifficulty(1).operators).toEqual(['+', '-'])
    expect(configForDifficulty(2).operandRange.addMax).toBe(20)
    expect(configForDifficulty(3).operators).toEqual(['+', '-', '×'])
    expect(configForDifficulty(4).operandRange).toEqual({ addMax: 50, mulMax: 12 })
    expect(configForDifficulty(5).operators).toEqual(['+', '-', '×', '÷'])
    expect(() => configForDifficulty(0)).toThrow(RangeError)
    expect(() => configForDifficulty(6)).toThrow(RangeError)
  })

  it('هر ۱۰۰ سؤال با seed یکسان قطعی است؛ پاسخ، دامنه و بی‌مهلتی درست است', () => {
    const config = configForDifficulty(5)
    let a = def.createSession('a', config, SEED)
    let b = def.createSession('b', config, SEED)
    for (let i = 0; i < config.totalTrials; i++) {
      const sa = def.nextTrial(a)
      const sb = def.nextTrial(b)
      expect(sa.trial.question).toEqual(sb.trial.question)
      expect(sa.trial.responseWindowMs).toBeNull()
      const q = sa.trial.question
      expect(computedAnswer(q)).toBe(q.answer)
      expect(Number.isInteger(q.answer)).toBe(true)
      // پاسخ همیشه نامنفی و حداکثر ۳ رقمی است (سقف ورودی UI)
      expect(q.answer).toBeGreaterThanOrEqual(0)
      expect(q.answer).toBeLessThanOrEqual(198)
      expectOperandsInRange(q, config)
      a = def.submitAnswer(sa.state, q.answer, 100)
      b = def.submitAnswer(sb.state, q.answer, 100)
    }
  })

  it('تفریق همیشه نتیجه نامنفی دارد', () => {
    const config = { ...configForDifficulty(2), operators: ['-'] as const }
    let current = def.createSession('a', config, SEED)
    for (let i = 0; i < config.totalTrials; i++) {
      const step = def.nextTrial(current)
      expect(step.trial.question.a).toBeGreaterThanOrEqual(step.trial.question.b)
      current = def.submitAnswer(step.state, step.trial.question.answer, 50)
    }
  })

  it('تقسیم همیشه دقیق است (باقی‌مانده صفر)', () => {
    const config = { ...configForDifficulty(5), operators: ['÷'] as const }
    let current = def.createSession('a', config, SEED)
    for (let i = 0; i < config.totalTrials; i++) {
      const step = def.nextTrial(current)
      expect(step.trial.question.a % step.trial.question.b).toBe(0)
      current = def.submitAnswer(step.state, step.trial.question.answer, 50)
    }
  })

  it('هیچ دو سؤال پشت‌سرهمی عین هم نیستند', () => {
    for (let level = 1; level <= 5; level++) {
      const config = configForDifficulty(level)
      let current = def.createSession('a', config, SEED + level)
      let prev: ArithmeticQuestion | null = null
      for (let i = 0; i < config.totalTrials; i++) {
        const step = def.nextTrial(current)
        const q = step.trial.question
        if (prev !== null) {
          const identical = q.a === prev.a && q.b === prev.b && q.operator === prev.operator
          expect(identical, `سطح ${level} مرحله ${i}`).toBe(false)
        }
        prev = q
        current = def.submitAnswer(step.state, q.answer, 50)
      }
    }
  })

  it('پاسخ درست/غلط/null درست ثبت می‌شوند', () => {
    const state = def.createSession('a', configForDifficulty(1), SEED)
    const { trial, state: s1 } = def.nextTrial(state)
    const right = def.submitAnswer(s1, trial.question.answer, 700)
    expect(right.results[0]?.outcome).toBe('correct')
    expect(right.results[0]?.reactionTimeMs).toBe(700)
    const wrong = def.submitAnswer(s1, trial.question.answer + 1, 650)
    expect(wrong.results[0]?.outcome).toBe('incorrect')
    expect(wrong.results[0]?.correct).toBe(false)
    expect(wrong.results[0]?.reactionTimeMs).toBe(650)
    const none = def.submitAnswer(s1, null, 0)
    expect(none.results[0]?.outcome).toBe('omission')
    expect(none.results[0]?.reactionTimeMs).toBeNull()
  })

  it('جلسه ۱۰۰ سؤالی کامل و خلاصهٔ درست می‌دهد', () => {
    const config = configForDifficulty(2)
    let state = def.createSession('a', config, SEED)
    for (let i = 0; i < config.totalTrials; i++) {
      const step = def.nextTrial(state)
      // هر چهارمین پاسخ عمداً غلط → ۷۵ درست از ۱۰۰
      state = def.submitAnswer(step.state, i % 4 === 3 ? -1 : step.trial.question.answer, 3000)
      if (i === config.totalTrials - 2) expect(def.isComplete(state)).toBe(false)
    }
    expect(def.isComplete(state)).toBe(true)
    const summary = def.getSummary(state)
    expect(summary.exerciseId).toBe('calculation-100')
    expect(summary.totalTrials).toBe(100)
    expect(summary.correctTrials).toBe(75)
    expect(summary.accuracy).toBe(75)
    expect(summary.medianReactionTimeMs).toBe(3000)
    // زمان پاسخ ۳ ثانیه × ۱۰۰ → ۵ دقیقه → ۷۵ پاسخ درست در ۵ دقیقه = ۱۵
    expect(summary.metrics['correctPerMinute']).toBe(15)
    expect(summary.metrics['meanReactionTimeMs']).toBe(3000)
    expect(summary.metrics['totalAnswerTimeMs']).toBe(300000)
  })

  it('بعد از ۱۰۰ سؤال، تولید مرحله جدید خطا می‌دهد', () => {
    const config = configForDifficulty(1)
    let state = def.createSession('a', config, SEED)
    for (let i = 0; i < config.totalTrials; i++) {
      const step = def.nextTrial(state)
      state = def.submitAnswer(step.state, step.trial.question.answer, 100)
    }
    expect(() => def.nextTrial(state)).toThrow('همه سؤال‌ها تولید شده‌اند')
  })
})
