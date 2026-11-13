// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  applyOperator,
  configForDifficulty,
  countSatisfyingOperators,
  missingOperatorDefinition as def,
  type MissingOperatorPuzzle,
} from './engine'

const SEED = 99
const TRIAL_SEEDS = [1, 7, 42, 99, 1234, 98765]

/** عملگرهایی از میان گزینه‌های معادله که آن را برقرار می‌کنند */
function satisfyingOperators(puzzle: MissingOperatorPuzzle) {
  return puzzle.choices.filter((op) => applyOperator(puzzle.a, puzzle.b, op) === puzzle.result)
}

/** اجرای کامل یک جلسه و بازگرداندن همه معادله‌ها */
function runSession(difficulty: number, seed: number): MissingOperatorPuzzle[] {
  const config = configForDifficulty(difficulty)
  let state = def.createSession('test-session', config, seed)
  const puzzles: MissingOperatorPuzzle[] = []
  for (let i = 0; i < config.totalTrials; i++) {
    const step = def.nextTrial(state)
    puzzles.push(step.trial.puzzle)
    // پاسخ همیشه درست — اینجا فقط تولید محرک مدنظر است
    state = def.submitAnswer(step.state, step.trial.puzzle.solution, 100 + i)
  }
  return puzzles
}

describe('عملگر گم‌شده — engine', () => {
  it('تنظیمات سطح‌های دشواری درست است', () => {
    const d1 = configForDifficulty(1)
    expect(d1.operators).toEqual(['+', '-'])
    expect(d1.choiceCount).toBe(2)
    expect(d1.responseWindowMs).toBeNull()

    const d2 = configForDifficulty(2)
    expect(d2.choiceCount).toBe(3)
    expect(d2.operators).toEqual(['+', '-'])
    expect(d2.responseWindowMs).toBeNull()

    const d3 = configForDifficulty(3)
    expect(d3.operators).toEqual(['+', '-', '×'])
    expect(d3.choiceCount).toBe(3)
    expect(d3.responseWindowMs).toBe(8000)

    const d4 = configForDifficulty(4)
    expect(d4.operators).toEqual(['+', '-', '×'])
    expect(d4.choiceCount).toBe(4)

    const d5 = configForDifficulty(5)
    expect(d5.operators).toEqual(['+', '-', '×', '÷'])
    expect(d5.choiceCount).toBe(4)
    expect(d5.responseWindowMs).toBe(5000)

    expect(() => configForDifficulty(0)).toThrow(RangeError)
    expect(() => configForDifficulty(6)).toThrow(RangeError)
  })

  it('تولید معادله‌ها با seed یکسان کاملاً قطعی است', () => {
    const first = runSession(5, SEED)
    const second = runSession(5, SEED)
    expect(first).toEqual(second)
    expect(first).toHaveLength(20)
    // برای اطمینان: یک seed دیگر باید دست‌کم برخی مراحل متفاوت باشد
    const other = runSession(5, SEED + 1)
    expect(other).not.toEqual(first)
  })

  it('هر معادله در همه سطح‌ها و seedهای مختلف دقیقاً یک عملگر درست از میان گزینه‌ها دارد', () => {
    for (const seed of TRIAL_SEEDS) {
      for (let difficulty = 1; difficulty <= 5; difficulty++) {
        const config = configForDifficulty(difficulty)
        for (const puzzle of runSession(difficulty, seed)) {
          expect(puzzle.choices).toHaveLength(config.choiceCount)
          // بدون تکرار در گزینه‌ها
          expect(new Set(puzzle.choices).size).toBe(config.choiceCount)
          // عملگر درست حتماً میان گزینه‌هاست و از مجموعه مجاز سطح است
          expect(puzzle.choices).toContain(puzzle.solution)
          expect(config.operators).toContain(puzzle.solution)
          // دقیقاً یک عملگر گزینه‌ها معادله را برقرار می‌کند
          expect(countSatisfyingOperators(puzzle)).toBe(1)
          expect(satisfyingOperators(puzzle)).toEqual([puzzle.solution])
        }
      }
    }
  })

  it('معادله با عملگر درستِ خودش برقرار و نتیجه صحیح است', () => {
    for (const puzzle of runSession(5, SEED)) {
      expect(applyOperator(puzzle.a, puzzle.b, puzzle.solution)).toBe(puzzle.result)
      expect(Number.isInteger(puzzle.result)).toBe(true)
    }
  })

  it('تفریق همیشه نتیجه نامنفی دارد', () => {
    const config = { ...configForDifficulty(4), operators: ['-'] as const }
    let state = def.createSession('a', config, SEED)
    for (let i = 0; i < config.totalTrials; i++) {
      const step = def.nextTrial(state)
      expect(step.trial.puzzle.solution).toBe('-')
      expect(step.trial.puzzle.a).toBeGreaterThanOrEqual(step.trial.puzzle.b)
      expect(step.trial.puzzle.result).toBeGreaterThanOrEqual(0)
      state = def.submitAnswer(step.state, '-', 50)
    }
  })

  it('تقسیم همیشه دقیق است (باقی‌مانده صفر)', () => {
    const config = { ...configForDifficulty(5), operators: ['÷'] as const }
    let state = def.createSession('a', config, SEED)
    for (let i = 0; i < config.totalTrials; i++) {
      const step = def.nextTrial(state)
      expect(step.trial.puzzle.solution).toBe('÷')
      expect(step.trial.puzzle.a % step.trial.puzzle.b).toBe(0)
      expect(step.trial.puzzle.a / step.trial.puzzle.b).toBe(step.trial.puzzle.result)
      state = def.submitAnswer(step.state, '÷', 50)
    }
  })

  it('عملوندها در دامنه تنظیمات سطح ۵ می‌مانند', () => {
    const config = configForDifficulty(5)
    const { addMax, mulMax } = config.operandRange
    for (const puzzle of runSession(5, SEED)) {
      if (puzzle.solution === '+' || puzzle.solution === '-') {
        expect(puzzle.a).toBeLessThanOrEqual(addMax)
        expect(puzzle.b).toBeLessThanOrEqual(addMax)
      } else if (puzzle.solution === '×') {
        expect(puzzle.a).toBeLessThanOrEqual(mulMax)
        expect(puzzle.b).toBeLessThanOrEqual(mulMax)
      } else {
        expect(puzzle.b).toBeLessThanOrEqual(mulMax)
        expect(puzzle.result).toBeLessThanOrEqual(mulMax)
        expect(puzzle.a).toBe(puzzle.b * puzzle.result)
      }
    }
  })

  it('پاسخ درست/غلط/null درست ثبت می‌شوند', () => {
    const config = configForDifficulty(4)
    const state = def.createSession('a', config, SEED)
    const { trial, state: s1 } = def.nextTrial(state)
    const solution = trial.puzzle.solution
    const wrongOp = trial.puzzle.choices.find((op) => op !== solution) ?? solution

    const right = def.submitAnswer(s1, solution, 700)
    expect(right.results[0]?.outcome).toBe('correct')
    expect(right.results[0]?.correct).toBe(true)
    expect(right.results[0]?.reactionTimeMs).toBe(700)
    expect(right.results[0]?.given).toBe(solution)
    expect(right.results[0]?.expected).toBe(solution)

    const wrong = def.submitAnswer(s1, wrongOp, 700)
    expect(wrong.results[0]?.outcome).toBe('incorrect')
    expect(wrong.results[0]?.correct).toBe(false)

    const none = def.submitAnswer(s1, null, 0)
    expect(none.results[0]?.outcome).toBe('omission')
    expect(none.results[0]?.correct).toBe(false)
    expect(none.results[0]?.reactionTimeMs).toBeNull()
  })

  it('مهلت پاسخ مرحله از config به trial منتقل می‌شود', () => {
    const timed = def.nextTrial(def.createSession('a', configForDifficulty(3), SEED)).trial
    expect(timed.responseWindowMs).toBe(8000)
    const untimed = def.nextTrial(def.createSession('a', configForDifficulty(1), SEED)).trial
    expect(untimed.responseWindowMs).toBeNull()
  })

  it('فراخوانی خارج از قرارداد خطا می‌دهد', () => {
    const config = configForDifficulty(1)
    let state = def.createSession('a', config, SEED)
    for (let i = 0; i < config.totalTrials; i++) {
      const step = def.nextTrial(state)
      state = def.submitAnswer(step.state, step.trial.puzzle.solution, 100)
    }
    expect(() => def.nextTrial(state)).toThrow('همه معادله‌ها تولید شده‌اند')
    expect(() => def.submitAnswer(state, '+', 100)).toThrow('معادله فعالی برای ثبت پاسخ وجود ندارد')
  })

  it('جلسه ۲۰ مرحله‌ای کامل و خلاصه سالم است', () => {
    const config = configForDifficulty(2)
    let state = def.createSession('a', config, SEED)
    for (let i = 0; i < config.totalTrials; i++) {
      const step = def.nextTrial(state)
      const answer = i % 4 === 3 ? (step.trial.puzzle.choices.find((op) => op !== step.trial.puzzle.solution) ?? null) : step.trial.puzzle.solution
      state = def.submitAnswer(step.state, answer, 1200)
      expect(def.isComplete(state)).toBe(i === config.totalTrials - 1)
    }
    const summary = def.getSummary(state)
    expect(summary.totalTrials).toBe(20)
    expect(summary.correctTrials).toBe(15)
    expect(summary.accuracy).toBe(75)
    expect(summary.medianReactionTimeMs).toBe(1200)
    expect(summary.metrics['meanReactionTimeMs']).toBe(1200)
    expect(summary.exerciseId).toBe('missing-operator')
    expect(summary.domain).toBe('processing-speed')
  })

  it('میانگین زمان پاسخ، بی‌پاسخی‌ها را حساب نمی‌کند', () => {
    const config = configForDifficulty(3)
    let state = def.createSession('a', config, SEED)
    const rts = [1000, 2000, 7000]
    for (let i = 0; i < config.totalTrials; i++) {
      const step = def.nextTrial(state)
      const rt = i < rts.length ? (rts[i] as number) : 500
      // مرحله آخر بی‌پاسخ (انقضای مهلت)
      const answer = i === config.totalTrials - 1 ? null : step.trial.puzzle.solution
      state = def.submitAnswer(step.state, answer, rt)
    }
    const summary = def.getSummary(state)
    const answeredRts = [...rts, ...Array(config.totalTrials - 1 - rts.length).fill(500)]
    const expectedMean = Math.round(answeredRts.reduce((s: number, v: number) => s + v, 0) / answeredRts.length)
    expect(summary.metrics['meanReactionTimeMs']).toBe(expectedMean)
    expect(summary.totalTrials).toBe(20)
    expect(summary.correctTrials).toBe(19)
  })
})
