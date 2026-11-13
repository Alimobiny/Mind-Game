// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  OSPAN_WORDS,
  operationSpanDefinition as def,
  configForDifficulty,
  setResponseWindowMs,
} from './engine'
import type { OperationSpanAnswer, OperationSpanState, OperationSpanTrial } from './engine'

/**
 * تست‌های دهانهٔ عملیاتی — قطعی؛ طرح جلسه یک‌جا از بذر نشست ساخته می‌شود.
 */

const SEED = 42

function fullSession(
  difficulty: number,
  answerOf: (t: OperationSpanTrial) => OperationSpanAnswer,
) {
  const config = configForDifficulty(difficulty)
  let state = def.createSession('s1', config, SEED)
  const trials: OperationSpanTrial[] = []
  for (let i = 0; i < state.plan.length; i++) {
    const next = def.nextTrial(state)
    state = next.state as OperationSpanState
    trials.push(next.trial)
    state = def.submitAnswer(state, answerOf(next.trial), 5000) as OperationSpanState
  }
  return { state, trials, config }
}

/** پاسخ کامل و بی‌نقص: همهٔ قضاوت‌ها درست + بازیابی کامل به ترتیب */
function perfectAnswer(t: OperationSpanTrial): OperationSpanAnswer {
  return {
    processingJudgments: t.set.items.map((item) => item.problem.isTrue),
    processingRtMs: t.set.items.map(() => 800),
    recalled: [...t.set.expectedRecall],
  }
}

describe('configForDifficulty — دهانهٔ عملیاتی', () => {
  it('نردبان دسته/عمل/زمان‌بندی + خطای بازه', () => {
    expect(configForDifficulty(1)).toMatchObject({
      setLengths: [3, 3, 3],
      mathOps: 2,
      reverseRecall: false,
    })
    expect(configForDifficulty(3)).toMatchObject({ setLengths: [4, 4, 5], mathOps: 3 })
    expect(configForDifficulty(5)).toMatchObject({ setLengths: [6, 6, 7], mathOps: 4, reverseRecall: true })
    expect(() => configForDifficulty(0)).toThrow(RangeError)
    expect(() => configForDifficulty(6)).toThrow(RangeError)
  })
})

describe('طرح جلسه', () => {
  it('ساختار هر دسته: زوج‌های محاسبه+واژه، گزینه‌های ۲N، ترتیب درست (وارونه در سطح ۵)', () => {
    const { state, config } = fullSession(3, () => null)
    expect(state.plan).toHaveLength(3)
    state.plan.forEach((set, i) => {
      expect(set.items).toHaveLength(config.setLengths[i] as number)
    })
    const d5 = fullSession(5, () => null).state
    for (const set of d5.plan) {
      expect(set.expectedRecall).toEqual([...set.items.map((i) => i.word)].reverse())
      expect(set.recallChoices).toHaveLength(set.items.length * 2)
    }
  })

  it('قطعی: بذر یکسان → طرح یکسان؛ واژه‌های هر دسته یکتا و از استخر', () => {
    const a = fullSession(2, () => null).state.plan
    const b = fullSession(2, () => null).state.plan
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
    for (const set of a) {
      const words = set.recallChoices
      expect(new Set(words).size).toBe(words.length)
      for (const w of words) expect(OSPAN_WORDS).toContain(w)
    }
  })

  it('معادله‌ها ساختار معتبر دارند و ۵۰-۵۰ درست/غلطند', () => {
    const { state } = fullSession(4, () => null)
    let trueCount = 0
    let total = 0
    for (const set of state.plan) {
      for (const item of set.items) {
        total += 1
        if (item.problem.isTrue) trueCount += 1
        const { a, op, b, trueResult, shownResult, isTrue } = item.problem
        const recomputed =
          op === '+' ? a + b : op === '−' ? a - b : op === '×' ? a * b : a / b
        expect(recomputed).toBe(trueResult)
        expect(isTrue).toBe(shownResult === trueResult)
        if (!isTrue) expect(shownResult).not.toBe(trueResult)
      }
    }
    // با بذر ثابت، تعادل تقریبی ۵۰-۵۰ در ~۵۲ معادله
    expect(trueCount).toBeGreaterThan(total * 0.3)
    expect(trueCount).toBeLessThan(total * 0.7)
  })

  it('سطح ۱ و ۲ فقط جمع/تفریق؛ سطح ۴ چهار عمل', () => {
    for (const difficulty of [1, 2] as const) {
      const { state } = fullSession(difficulty, () => null)
      for (const set of state.plan) {
        for (const item of set.items) {
          expect(['+', '−']).toContain(item.problem.op)
        }
      }
    }
    const d4 = fullSession(4, () => null).state
    const d5 = fullSession(5, () => null).state
    const ops = new Set(
      [...d4.plan, ...d5.plan].flatMap((s) => s.items.map((i) => i.problem.op)),
    )
    expect(ops.has('÷')).toBe(true)
    expect(ops.has('×')).toBe(true)
  })

  it('پنجرهٔ پاسخ هر دسته = مجموع پنجره‌های درون‌دسته + بازیابی', () => {
    const config = configForDifficulty(3)
    const setLength = config.setLengths[1] as number
    expect(setResponseWindowMs(config, setLength)).toBe(
      setLength * (config.processingWindowMs + config.feedbackMs + config.memoryDisplayMs) +
        config.recallWindowMs,
    )
    const { trials } = fullSession(3, () => null)
    for (const t of trials) {
      expect(t.responseWindowMs).toBe(
        setResponseWindowMs(configForDifficulty(3), t.set.items.length),
      )
    }
  })
})

describe('امتیازدهی و خلاصه', () => {
  it('جلسهٔ بی‌نقص: دقت ۱۰۰، اعتبار جزئی ۱۰۰، بدون پرچم بی‌اعتباری', () => {
    const { state } = fullSession(3, perfectAnswer)
    expect(def.isComplete(state)).toBe(true)
    const summary = def.getSummary(state)
    expect(summary.accuracy).toBe(100)
    expect(summary.metrics).toMatchObject({
      setsCompleted: 3,
      partialCreditUnitScore: 100,
      mathAccuracy: 100,
      recallInOrderRate: 100,
      orderErrors: 0,
      intrusionErrors: 0,
      invalidSessionFlag: 0,
    })
  })

  it('جابه‌جایی ترتیب در بازیابی → خطای ترتیب، نه تجاوز؛ دسته کامل نیست', () => {
    const { state } = fullSession(1, (t) => {
      const recalled = [...t.set.expectedRecall]
      const first = recalled[0] as string
      const second = recalled[1] as string
      recalled[0] = second
      recalled[1] = first
      return {
        processingJudgments: t.set.items.map((i) => i.problem.isTrue),
        processingRtMs: t.set.items.map(() => 800),
        recalled,
      }
    })
    const summary = def.getSummary(state)
    expect(summary.accuracy).toBe(0)
    expect(summary.metrics.orderErrors).toBeGreaterThanOrEqual(2)
    expect(summary.metrics.intrusionErrors).toBe(0)
    expect(summary.metrics.recallInOrderRate).toBeLessThan(100)
  })

  it('انتخاب واژهٔ حواس‌پرتی → خطای تجاوز', () => {
    const { state } = fullSession(1, (t) => {
      const expected = [...t.set.expectedRecall]
      const distractor = t.set.recallChoices.find((w) => !expected.includes(w)) as string
      return {
        processingJudgments: t.set.items.map((i) => i.problem.isTrue),
        processingRtMs: t.set.items.map(() => 800),
        recalled: [distractor, ...expected.slice(1)],
      }
    })
    const summary = def.getSummary(state)
    expect(summary.metrics.intrusionErrors).toBeGreaterThanOrEqual(1)
  })

  it('دقت محاسبه زیر ۸۵٪ → پرچم بی‌اعتبار جلسه', () => {
    const { state } = fullSession(3, (t) => ({
      // همهٔ قضاوت‌ها غلط → دقت محاسبه ۰
      processingJudgments: t.set.items.map((i) => !i.problem.isTrue),
      processingRtMs: t.set.items.map(() => 800),
      recalled: [...t.set.expectedRecall],
    }))
    const summary = def.getSummary(state)
    expect(summary.metrics.mathAccuracy).toBe(0)
    expect(summary.metrics.invalidSessionFlag).toBe(1)
    expect(summary.metrics.partialCreditUnitScore).toBe(100)
  })

  it('انقضای مهلت کل دسته (پاسخ null) → omission برای همان دسته', () => {
    const { state } = fullSession(1, () => null)
    expect(state.results.every((r) => r.outcome === 'omission' && !r.correct)).toBe(true)
    const summary = def.getSummary(state)
    expect(summary.metrics.setsCompleted).toBe(3)
    expect(summary.metrics.mathAccuracy).toBe(0)
    expect(summary.metrics.invalidSessionFlag).toBe(1)
  })

  it('پاسخ ناقص (بازیابی کوتاه‌تر از دسته) → دسته کامل محسوب نمی‌شود', () => {
    const { state } = fullSession(1, (t) => ({
      processingJudgments: t.set.items.map((i) => i.problem.isTrue),
      processingRtMs: t.set.items.map(() => 800),
      recalled: t.set.expectedRecall.slice(0, 1),
    }))
    const summary = def.getSummary(state)
    expect(summary.metrics.recallInOrderRate).toBe(0)
    expect(summary.metrics.partialCreditUnitScore).toBeLessThan(100)
  })
})

describe('قرارداد هسته', () => {
  it('nextTrial پس از پایان جلسه خطا می‌دهد؛ بدون مرحله فعال، submit خطا می‌دهد', () => {
    const config = configForDifficulty(1)
    let state = def.createSession('s1', config, SEED)
    for (let i = 0; i < state.plan.length; i++) {
      const next = def.nextTrial(state)
      state = def.submitAnswer(next.state, perfectAnswer(next.trial), 1000) as OperationSpanState
    }
    expect(def.isComplete(state)).toBe(true)
    expect(() => def.nextTrial(state)).toThrow()
    const fresh = def.createSession('s2', config, SEED)
    expect(() => def.submitAnswer(fresh, null, 100)).toThrow()
  })
})
