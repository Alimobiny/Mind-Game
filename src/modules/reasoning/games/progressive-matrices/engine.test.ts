// @vitest-environment node
import { describe, expect, it } from 'vitest'
import type { PmAttr, PmCell, PmRuleFamily, ProgressiveMatricesTrial } from './engine'
import { configForDifficulty, progressiveMatricesDefinition as def } from './engine'

const SEED = 777

/** مقدار صفتی از سلول به اندیس ۰..۲ */
function attrValue(cell: PmCell, attr: PmAttr): number {
  if (attr === 'shape') return ['circle', 'square', 'triangle'].indexOf(cell.shape)
  if (attr === 'color') return ['red', 'blue', 'green'].indexOf(cell.color)
  return cell.count - 1
}

function setValues(cells: readonly PmCell[], attr: PmAttr): number[] {
  return cells.map((c) => attrValue(c, attr))
}

/** تحقق خانوادهٔ قاعده روی ۸ خانهٔ مرئی + پیش‌بینی خانهٔ ۹ (mini-solver) */
function checkFamily(
  visible: readonly PmCell[],
  attr: PmAttr,
  family: PmRuleFamily,
): { ok: boolean; predicted: number | null } {
  // خانه‌ها ۰..۷ مرئی‌اند؛ مقدار attr هر خانه
  const all = new Array<number>(9)
  for (let i = 0; i < 8; i += 1) all[i] = attrValue(visible[i] as PmCell, attr)
  const at = (r: number, c: number) => r * 3 + c
  switch (family) {
    case 'dist3': {
      for (let i = 0; i < 8; i += 1) {
        const r = Math.floor(i / 3)
        const c = i % 3
        if (all[i] !== (r + c) % 3) return { ok: false, predicted: null }
      }
      return { ok: true, predicted: (2 + 2) % 3 }
    }
    case 'progression':
    case 'positional': {
      // مقدار فقط تابع سطر است یا فقط تابع ستون — از زوج‌های مرئی تشخیص:
      const rowsConsistent = [0, 1].every((r) => all[at(r, 0)] === all[at(r, 1)])
      const colsConsistent = [0, 1].every((c) => all[at(0, c)] === all[at(1, c)])
      if (rowsConsistent && !colsConsistent) {
        // تابع سطر → خانهٔ ۹ = مقدار سطر ۲ (دو خانهٔ مرئی سطر باید هم‌ارزش باشند)
        const ok = all[at(2, 0)] === all[at(2, 1)]
        return { ok, predicted: all[at(2, 0)] }
      }
      if (colsConsistent && !rowsConsistent) {
        const ok = all[at(0, 2)] === all[at(1, 2)]
        return { ok, predicted: all[at(0, 2)] }
      }
      return { ok: false, predicted: null }
    }
    case 'logicalOp': {
      for (let r = 1; r < 3; r += 1) {
        for (let c = 1; c < 3; c += 1) {
          const i = at(r, c)
          if (i === 8) continue
          if (all[i] !== (all[at(r - 1, c)] + all[at(r, c - 1)]) % 3) return { ok: false, predicted: null }
        }
      }
      return { ok: true, predicted: (all[at(1, 2)] + all[at(2, 1)]) % 3 }
    }
  }
}

/** تعداد صفات متفاوت دو سلول */
function cellDiff(a: PmCell, b: PmCell): number {
  return (
    Number(a.shape !== b.shape) + Number(a.color !== b.color) + Number(a.count !== b.count)
  )
}

function generateSession(seed: number, difficulty: number): ProgressiveMatricesTrial[] {
  const config = configForDifficulty(difficulty)
  let state = def.createSession('t', config, seed)
  const trials: ProgressiveMatricesTrial[] = []
  for (let i = 0; i < config.totalTrials; i += 1) {
    const step = def.nextTrial(state)
    trials.push(step.trial)
    state = def.submitAnswer(step.state, step.trial.correctIndex, 1000)
  }
  return trials
}

describe('Progressive Matrices — مولد قاعده‌محور', () => {
  it('دشواری ۱..۵ پذیرفته و بیرون از بازه خطا می‌دهد', () => {
    expect(configForDifficulty(1).totalTrials).toBe(12)
    expect(configForDifficulty(5).optionCount).toBe(4)
    expect(() => configForDifficulty(6)).toThrow(RangeError)
  })

  it('تولید قطعی است — همان بذر، همان مرحله', () => {
    const config = configForDifficulty(4)
    const t1 = def.nextTrial(def.createSession('a', config, SEED)).trial
    const t2 = def.nextTrial(def.createSession('b', config, SEED)).trial
    expect(t1).toEqual(t2)
  })

  it('ناوردای mini-solver: هر ماتریس قواعد خودش را برآورده می‌کند و پاسخ یکتاست', () => {
    for (const difficulty of [1, 2, 3, 4, 5]) {
      for (const seed of [11, 22, 33, 44]) {
        for (const trial of generateSession(seed, difficulty)) {
          const visible = trial.matrix.slice(0, 8) as PmCell[]
          for (const attr of ['shape', 'color', 'count'] as const) {
            const family = trial.rules[attr]
            if (family === null) {
              // صفت ثابت — هر ۸ خانهٔ مرئی هم‌ارزش‌اند
              const vals = setValues(visible, attr)
              expect(new Set(vals).size, `d${difficulty} seed${seed} trial${trial.trialIndex} ${attr} constant`).toBe(1)
              expect(attrValue(trial.answer, attr)).toBe(vals[0])
              continue
            }
            const { ok, predicted } = checkFamily(visible, attr, family)
            expect(ok, `d${difficulty} seed${seed} trial${trial.trialIndex} ${attr}=${family}`).toBe(true)
            expect(predicted, `d${difficulty} ${attr}=${family} predicted`).toBe(attrValue(trial.answer, attr))
          }
          // پاسخ یکتاست: دقیقاً یک گزینه همهٔ قواعد را برآورده می‌کند
          const satisfies = (opt: PmCell): boolean => {
            for (const attr of ['shape', 'color', 'count'] as const) {
              const family = trial.rules[attr]
              if (family === null) {
                if (attrValue(opt, attr) !== attrValue(visible[0] as PmCell, attr)) return false
              } else {
                const { predicted } = checkFamily(visible, attr, family)
                if (predicted === null || attrValue(opt, attr) !== predicted) return false
              }
            }
            return true
          }
          const winners = trial.options.filter(satisfies)
          expect(winners, `unique winner d${difficulty} seed${seed}`).toHaveLength(1)
          expect(winners[0]).toBe(trial.answer)
          expect(trial.options[trial.correctIndex]).toBe(trial.answer)
          // گزینه‌ها متمایزند
          const keys = new Set(trial.options.map((o) => `${o.shape}|${o.color}|${o.count}`))
          expect(keys.size).toBe(trial.options.length)
        }
      }
    }
  })

  it('حواس‌پرتی‌ها اصولی‌اند: در d4/d5 فقط ۱-تفاوت؛ همیشه ≤۲ تفاوت', () => {
    for (const difficulty of [1, 2, 3]) {
      for (const trial of generateSession(55, difficulty)) {
        for (const opt of trial.options) {
          if (opt !== trial.answer) {
            expect(cellDiff(opt, trial.answer)).toBeLessThanOrEqual(2)
          }
        }
      }
    }
    for (const difficulty of [4, 5]) {
      for (const trial of generateSession(55, difficulty)) {
        for (const opt of trial.options) {
          if (opt !== trial.answer) {
            expect(cellDiff(opt, trial.answer)).toBe(1)
          }
        }
      }
    }
  })

  it('قید دشواری روی قواعد: تعداد غیرثابت‌ها و گیت عمل منطقی', () => {
    const expectedActive = [1, 2, 2, 3, 3]
    for (let difficulty = 1; difficulty <= 5; difficulty += 1) {
      for (const trial of generateSession(66, difficulty)) {
        expect(trial.nonConstantRules).toBe(expectedActive[difficulty - 1])
        const families = [trial.rules.shape, trial.rules.color, trial.rules.count].filter(Boolean)
        if (difficulty === 1) {
          expect(families).not.toContain('logicalOp')
          expect(families).not.toContain('positional')
        }
        if (difficulty === 3 || difficulty === 5) {
          expect(families).toContain('logicalOp')
        }
      }
    }
  })

  it('پاسخ درست/غلط/بی‌پاسخ درست ارزیابی و متریک‌های وزنی ساخته می‌شود', () => {
    const config = configForDifficulty(4)
    let state = def.createSession('a', config, SEED)
    for (let i = 0; i < config.totalTrials; i += 1) {
      const step = def.nextTrial(state)
      // پاسخ درست
      state = def.submitAnswer(step.state, step.trial.correctIndex, 1200)
    }
    expect(def.isComplete(state)).toBe(true)
    const perfect = def.getSummary(state)
    expect(perfect.accuracy).toBe(100)
    expect(perfect.metrics['difficultyWeightedScore']).toBe(100)
    expect(perfect.metrics['maxSimultaneousRules']).toBe(3)
    expect(perfect.metrics['meanRtMs']).toBe(1200)
    // در d۴ همهٔ مراحل ۳ قاعده‌ای‌اند → هر سه خانوادهٔ رخ‌داده کلید دارند
    for (const key of ['accuracyDist3', 'accuracyProgression', 'accuracyLogicalOp', 'accuracyPositional']) {
      if (perfect.metrics[key] !== undefined) {
        expect(perfect.metrics[key]).toBe(100)
      }
    }
    expect(() => def.nextTrial(state)).toThrow()
  })

  it('omission و گزینهٔ غلط ثبت می‌شوند؛ کلیدهای خانوادهٔ رخ‌نداده منتشر نمی‌شوند', () => {
    const config = configForDifficulty(1) // فقط dist3/progression — بدون logicalOp/positional
    let state = def.createSession('a', config, 999)
    for (let i = 0; i < config.totalTrials; i += 1) {
      const step = def.nextTrial(state)
      const wrong = (step.trial.correctIndex + 1) % step.trial.options.length
      state = def.submitAnswer(step.state, i % 2 === 0 ? wrong : null, 900)
    }
    const summary = def.getSummary(state)
    expect(summary.accuracy).toBe(0)
    expect(summary.metrics['accuracyLogicalOp']).toBeUndefined()
    expect(summary.metrics['accuracyPositional']).toBeUndefined()
  })
})
