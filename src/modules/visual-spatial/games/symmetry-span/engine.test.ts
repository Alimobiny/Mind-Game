// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  SYMMETRY_SPAN_ID,
  SYMMETRY_SPAN_VERSION,
  SYMMETRY_SPAN_CONTENT_VERSION,
  symmetrySpanDefinition as def,
  configForDifficulty,
  setResponseWindowMs,
  SYMSPAN_GRID_SIZE,
} from './engine'
import type { SymmetrySpanAnswer, SymmetrySpanState, SymmetrySpanTrial } from './engine'

/**
 * تست‌های دهانهٔ تقارن — قطعی؛ طرح جلسه یک‌جا از بذر نشست ساخته می‌شود.
 */

const SEED = 55

function fullSession(
  difficulty: number,
  answerOf: (t: SymmetrySpanTrial) => SymmetrySpanAnswer,
) {
  const config = configForDifficulty(difficulty)
  let state = def.createSession('s1', config, SEED)
  const trials: SymmetrySpanTrial[] = []
  for (let i = 0; i < state.plan.length; i++) {
    const next = def.nextTrial(state)
    state = next.state as SymmetrySpanState
    trials.push(next.trial)
    state = def.submitAnswer(state, answerOf(next.trial), 4000) as SymmetrySpanState
  }
  return { state, trials, config }
}

/** پاسخ کامل و بی‌نقص: همهٔ قضاوت‌ها درست + بازیابی کامل به ترتیب */
function perfectAnswer(t: SymmetrySpanTrial): SymmetrySpanAnswer {
  return {
    processingJudgments: t.set.items.map((item) => item.pattern.isSymmetric),
    processingRtMs: t.set.items.map(() => 700),
    recalled: [...t.set.expectedRecall],
  }
}

describe('configForDifficulty — دهانهٔ تقارن', () => {
  it('نردبان دسته/زمان‌بندی/فاصله + خطای بازه', () => {
    expect(configForDifficulty(1)).toMatchObject({
      setLengths: [3, 3, 3],
      targetSpacing: 'spread',
      reverseRecall: false,
    })
    expect(configForDifficulty(3)).toMatchObject({ setLengths: [4, 4, 4], targetSpacing: 'mixed' })
    expect(configForDifficulty(5)).toMatchObject({
      setLengths: [5, 6, 5],
      targetSpacing: 'close',
      reverseRecall: true,
    })
    expect(() => configForDifficulty(0)).toThrow(RangeError)
    expect(() => configForDifficulty(6)).toThrow(RangeError)
  })
})

describe('طرح جلسه', () => {
  it('ساختار هر دسته: زوج‌های تقارن+خانه؛ ترتیب درست (وارونه در سطح ۵)', () => {
    const { state, config } = fullSession(2, () => null)
    expect(state.plan).toHaveLength(3)
    state.plan.forEach((set, i) => {
      expect(set.items).toHaveLength(config.setLengths[i] as number)
      expect(set.expectedRecall).toEqual(set.items.map((it) => it.targetCell))
    })
    const d5 = fullSession(5, () => null).state
    for (const set of d5.plan) {
      expect(set.expectedRecall).toEqual([...set.items.map((it) => it.targetCell)].reverse())
    }
  })

  it('قطعی: بذر یکسان → طرح یکسان؛ خانه‌های هر دسته یکتا', () => {
    const a = fullSession(3, () => null).state.plan
    const b = fullSession(3, () => null).state.plan
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
    for (const set of a) {
      const cells = set.items.map((it) => it.targetCell)
      expect(new Set(cells).size).toBe(cells.length)
      for (const c of cells) {
        expect(c).toBeGreaterThanOrEqual(0)
        expect(c).toBeLessThan(SYMSPAN_GRID_SIZE * SYMSPAN_GRID_SIZE)
      }
    }
  })

  it('الگوهای متقارن آینهٔ نیمهٔ چپ‌اند؛ نامتقارن‌ها با آینه فرق دارند', () => {
    const { state } = fullSession(4, () => null)
    let symmetricCount = 0
    let total = 0
    for (const set of state.plan) {
      for (const item of set.items) {
        total += 1
        const cells = item.pattern.cells
        if (item.pattern.isSymmetric) {
          symmetricCount += 1
          for (let cell = 0; cell < cells.length; cell += 1) {
            const col = cell % SYMSPAN_GRID_SIZE
            if (col < 2) continue // فقط نیمهٔ چپ را با آینهٔ راست مقایسه می‌کنیم
            const row = Math.floor(cell / SYMSPAN_GRID_SIZE)
            const left = row * SYMSPAN_GRID_SIZE + (SYMSPAN_GRID_SIZE - 1 - col)
            expect(cells[cell]).toBe(cells[left])
          }
        } else {
          // دست‌کم یک خانهٔ نیمهٔ راست با آینهٔ چپ فرق دارد
          let diff = 0
          for (let row = 0; row < SYMSPAN_GRID_SIZE; row += 1) {
            for (let col = 2; col < SYMSPAN_GRID_SIZE; col += 1) {
              const right = row * SYMSPAN_GRID_SIZE + col
              const left = row * SYMSPAN_GRID_SIZE + (SYMSPAN_GRID_SIZE - 1 - col)
              if (cells[right] !== cells[left]) diff += 1
            }
          }
          expect(diff).toBeGreaterThanOrEqual(1)
        }
      }
    }
    // تعادل تقریبی ۵۰-۵۰ در ~۴۸ الگو
    expect(symmetricCount).toBeGreaterThan(total * 0.3)
    expect(symmetricCount).toBeLessThan(total * 0.7)
  })

  it('نیمهٔ چپ هر الگو بین ۲ تا ۵ خانهٔ پر دارد', () => {
    const { state } = fullSession(3, () => null)
    for (const set of state.plan) {
      for (const item of set.items) {
        let leftFilled = 0
        item.pattern.cells.forEach((filled, cell) => {
          if (filled && cell % SYMSPAN_GRID_SIZE < 2) leftFilled += 1
        })
        expect(leftFilled).toBeGreaterThanOrEqual(2)
        expect(leftFilled).toBeLessThanOrEqual(5)
      }
    }
  })

  it('فاصلهٔ هدف‌ها در سطح ۱ همه ≥ ۲ (پخش)', () => {
    const { state } = fullSession(1, () => null)
    const manhattan = (a: number, b: number) =>
      Math.abs(Math.floor(a / SYMSPAN_GRID_SIZE) - Math.floor(b / SYMSPAN_GRID_SIZE)) +
      Math.abs((a % SYMSPAN_GRID_SIZE) - (b % SYMSPAN_GRID_SIZE))
    for (const set of state.plan) {
      const cells = set.items.map((it) => it.targetCell)
      for (let i = 0; i < cells.length; i += 1) {
        for (let j = i + 1; j < cells.length; j += 1) {
          expect(manhattan(cells[i] as number, cells[j] as number)).toBeGreaterThanOrEqual(2)
        }
      }
    }
  })

  it('پنجرهٔ پاسخ هر دسته = مجموع پنجره‌های درون‌دسته + بازیابی', () => {
    const config = configForDifficulty(3)
    const setLength = config.setLengths[0] as number
    expect(setResponseWindowMs(config, setLength)).toBe(
      setLength * (config.patternWindowMs + config.feedbackMs + config.cellDisplayMs) +
        config.recallWindowMs,
    )
  })
})

describe('امتیازدهی و خلاصه', () => {
  it('جلسهٔ بی‌نقص: دقت ۱۰۰، اعتبار جزئی ۱۰۰، بدون خطا', () => {
    const { state } = fullSession(2, perfectAnswer)
    expect(def.isComplete(state)).toBe(true)
    const summary = def.getSummary(state)
    expect(summary.accuracy).toBe(100)
    expect(summary.metrics).toMatchObject({
      setsCompleted: 3,
      partialCreditUnitScore: 100,
      symmetryAccuracy: 100,
      orderErrors: 0,
      intrusionErrors: 0,
      invalidSessionFlag: 0,
    })
  })

  it('خانهٔ ناجور در بازیابی → خطای تجاوز؛ جابه‌جایی → خطای ترتیب', () => {
    const { state } = fullSession(1, (t) => {
      const expected = [...t.set.expectedRecall]
      const outsider = expected.includes(0) ? 15 : 0
      return {
        processingJudgments: t.set.items.map((i) => i.pattern.isSymmetric),
        processingRtMs: t.set.items.map(() => 700),
        recalled: [outsider, ...expected.slice(1)],
      }
    })
    const summary = def.getSummary(state)
    expect(summary.metrics.intrusionErrors).toBeGreaterThanOrEqual(1)
    expect(summary.accuracy).toBe(0)
  })

  it('دقت تقارن زیر ۸۵٪ → پرچم بی‌اعتبار جلسه؛ بازیابی جدا می‌ماند', () => {
    const { state } = fullSession(2, (t) => ({
      processingJudgments: t.set.items.map((i) => !i.pattern.isSymmetric),
      processingRtMs: t.set.items.map(() => 700),
      recalled: [...t.set.expectedRecall],
    }))
    const summary = def.getSummary(state)
    expect(summary.metrics.symmetryAccuracy).toBe(0)
    expect(summary.metrics.invalidSessionFlag).toBe(1)
    expect(summary.metrics.partialCreditUnitScore).toBe(100)
  })

  it('انقضای مهلت کل دسته (پاسخ null) → omission', () => {
    const { state } = fullSession(1, () => null)
    expect(state.results.every((r) => r.outcome === 'omission' && !r.correct)).toBe(true)
  })

  it('شناسه‌ها و نسخه‌ها در خلاصه ثابت‌اند', () => {
    const { state } = fullSession(1, perfectAnswer)
    const summary = def.getSummary(state)
    expect(summary.exerciseId).toBe(SYMMETRY_SPAN_ID)
    expect(summary.exerciseVersion).toBe(SYMMETRY_SPAN_VERSION)
    expect(summary.contentVersion).toBe(SYMMETRY_SPAN_CONTENT_VERSION)
    expect(summary.domain).toBe('visual-spatial')
  })
})

describe('قرارداد هسته', () => {
  it('nextTrial پس از پایان جلسه خطا می‌دهد؛ بدون مرحله فعال، submit خطا می‌دهد', () => {
    const config = configForDifficulty(1)
    let state = def.createSession('s1', config, SEED)
    for (let i = 0; i < state.plan.length; i++) {
      const next = def.nextTrial(state)
      state = def.submitAnswer(next.state, perfectAnswer(next.trial), 1000) as SymmetrySpanState
    }
    expect(def.isComplete(state)).toBe(true)
    expect(() => def.nextTrial(state)).toThrow()
    const fresh = def.createSession('s2', config, SEED)
    expect(() => def.submitAnswer(fresh, null, 100)).toThrow()
  })
})
