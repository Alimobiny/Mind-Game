import { describe, expect, it } from 'vitest'
import {
  PATTERN_COLORS,
  PATTERN_COUNTS,
  PATTERN_RULE_FAMILIES,
  PATTERN_SHAPES,
  configForDifficulty,
  patternCompletionDefinition as def,
  type PatternCell,
  type PatternCompletionConfig,
  type PatternCompletionTrial,
  type PatternRuleFamily,
} from './engine'

// seed ثابت — طوری انتخاب شده که در سطح ۵ هر ۴ خانواده قاعده دیده شوند
const SEED = 777

/** اجرای کامل یک جلسه و جمع‌آوری محرک‌ها با پاسخ همیشه درست */
function collectTrials(config: PatternCompletionConfig, seed: number): PatternCompletionTrial[] {
  let state = def.createSession('a', config, seed)
  const trials: PatternCompletionTrial[] = []
  for (let i = 0; i < config.totalTrials; i++) {
    const step = def.nextTrial(state)
    trials.push(step.trial)
    state = def.submitAnswer(step.state, step.trial.correctIndex, 500)
  }
  return trials
}

/** تعداد ویژگی‌های متفاوت دو خانه (شکل، رنگ، تعداد) */
function attributeDiff(a: PatternCell, b: PatternCell): number {
  return (a.shape !== b.shape ? 1 : 0) + (a.color !== b.color ? 1 : 0) + (a.count !== b.count ? 1 : 0)
}

/** کلید یکتا برای مقایسه متمایز بودن خانه‌ها */
function cellKey(cell: PatternCell): string {
  return `${cell.shape}|${cell.color}|${cell.count}`
}

function isValidCell(cell: unknown): cell is PatternCell {
  if (cell === null || typeof cell !== 'object') return false
  const c = cell as PatternCell
  return (
    PATTERN_SHAPES.includes(c.shape) &&
    PATTERN_COLORS.includes(c.color) &&
    PATTERN_COUNTS.includes(c.count)
  )
}

/**
 * خانه مورد انتظار خانه (۲,۲) طبق فرمول خانواده — فقط از روی ۸ خانه
 * نمایان ماتریس استخراج می‌شود؛ یعنی پاسخ از خود قاعده می‌آید، نه از answer.
 */
function expectedBottomRight(
  family: PatternRuleFamily,
  matrix: readonly (PatternCell | null)[],
): PatternCell {
  const at = (row: number, col: number): PatternCell => matrix[row * 3 + col] as PatternCell
  switch (family) {
    case 'count-progression':
      // تعداد (r+c)%3+1 → خانه (۲,۲) = ۲؛ شکل/رنگ ثابت از خانه (۰,۰)
      return { shape: at(0, 0).shape, color: at(0, 0).color, count: 2 }
    case 'color-progression':
      // رنگ (r+c)%4 → خانه (۲,۲) = رنگ[۰]؛ شکل/تعداد ثابت از خانه (۰,۰)
      return { shape: at(0, 0).shape, color: PATTERN_COLORS[(2 + 2) % 4], count: at(0, 0).count }
    case 'shape-per-row':
      // شکل ردیف آخر + تعداد ستون آخر؛ رنگ ثابت
      return { shape: at(2, 0).shape, color: at(0, 0).color, count: 3 }
    case 'rotation-like':
      // شکل (r+c)%3 → 'square'؛ رنگ ستون ۲ → 'green'؛ تعداد ثابت
      return { shape: PATTERN_SHAPES[(2 + 2) % 3], color: PATTERN_COLORS[2], count: at(0, 0).count }
  }
}

/** بررسی ریاضیات هر خانواده قاعده روی ۸ خانه نمایان ماتریس */
function verifyFamilyInvariants(family: PatternRuleFamily, matrix: readonly (PatternCell | null)[]) {
  const at = (row: number, col: number): PatternCell => matrix[row * 3 + col] as PatternCell
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      if (row === 2 && col === 2) continue // خانه خالی
      switch (family) {
        case 'count-progression':
          expect(at(row, col).shape).toBe(at(0, 0).shape)
          expect(at(row, col).color).toBe(at(0, 0).color)
          expect(at(row, col).count).toBe(((row + col) % 3) + 1)
          break
        case 'color-progression':
          expect(at(row, col).shape).toBe(at(0, 0).shape)
          expect(at(row, col).count).toBe(at(0, 0).count)
          expect(at(row, col).color).toBe(PATTERN_COLORS[(row + col) % 4])
          break
        case 'shape-per-row':
          expect(at(row, col).color).toBe(at(0, 0).color)
          expect(at(row, col).shape).toBe(at(row, 0).shape) // شکل ثابت در ردیف
          expect(at(row, col).count).toBe(col + 1) // ۱،۲،۳ در طول ردیف
          break
        case 'rotation-like':
          expect(at(row, col).count).toBe(at(0, 0).count)
          expect(at(row, col).shape).toBe(PATTERN_SHAPES[(row + col) % 3])
          expect(at(row, col).color).toBe(PATTERN_COLORS[col]) // رنگ فقط تابع ستون
          break
      }
    }
  }
  if (family === 'shape-per-row') {
    // سه ردیف باید سه شکل متمایز داشته باشند
    const rowShapes = new Set([at(0, 0).shape, at(1, 0).shape, at(2, 0).shape])
    expect(rowShapes.size).toBe(3)
  }
}

describe('Pattern Completion — engine', () => {
  it('تنظیمات دشواری ۱ تا ۵ درست ساخته می‌شود و خارج بازه خطا می‌دهد', () => {
    expect(configForDifficulty(1)).toEqual({
      difficulty: 1,
      totalTrials: 12,
      allowedFamilies: ['count-progression'],
      distractorAttributeDiffs: 1,
    })
    expect(configForDifficulty(2).allowedFamilies).toEqual([
      'count-progression',
      'color-progression',
    ])
    expect(configForDifficulty(3).allowedFamilies).toEqual(PATTERN_RULE_FAMILIES.slice(0, 3))
    // سطح ۴ و ۵ → هر چهار خانواده + حواس‌پرتی‌های دوترفتی (سخت‌تر)
    expect(configForDifficulty(4).allowedFamilies).toEqual(PATTERN_RULE_FAMILIES)
    expect(configForDifficulty(4).distractorAttributeDiffs).toBe(2)
    expect(configForDifficulty(5)).toEqual({
      difficulty: 5,
      totalTrials: 12,
      allowedFamilies: PATTERN_RULE_FAMILIES,
      distractorAttributeDiffs: 2,
    })
    // همه سطوح: ۱۲ مرحله و بازی غیرزمانی (پنجره پاسخ در مرحله ذخیره می‌شود)
    for (const difficulty of [1, 2, 3, 4, 5]) {
      expect(configForDifficulty(difficulty).totalTrials).toBe(12)
    }
    expect(() => configForDifficulty(0)).toThrow(RangeError)
    expect(() => configForDifficulty(6)).toThrow(RangeError)
  })

  it('تولید مرحله با seed یکسان قطعی است و seed متفاوت دنباله را عوض می‌کند', () => {
    const config = configForDifficulty(3)
    const runA = collectTrials(config, SEED)
    const runB = collectTrials(config, SEED)
    // کل مرحله (ماتریس، گزینه‌ها، جای پاسخ) باید مو‌به‌مو یکی باشد
    expect(runB).toEqual(runA)
    const runC = collectTrials(config, SEED + 1)
    expect(runC).not.toEqual(runA)
  })

  it('نامتغیرهای ساختاری در کل جلسه سطح ۵ برقرار است (ماتریس، گزینه‌ها، پاسخ یکتا)', () => {
    const config = configForDifficulty(5)
    const trials = collectTrials(config, SEED)
    expect(trials).toHaveLength(12)
    for (const trial of trials) {
      expect(trial.responseWindowMs).toBeNull()
      // ماتریس: دقیقاً ۹ خانه و null فقط در نمایه ۸
      expect(trial.matrix).toHaveLength(9)
      trial.matrix.forEach((cell, i) => {
        if (i === 8) expect(cell).toBeNull()
        else expect(isValidCell(cell)).toBe(true)
      })
      // گزینه‌ها: ۴ گزینه متمایز که پاسخ را شامل می‌شوند
      expect(trial.options).toHaveLength(4)
      expect(new Set(trial.options.map(cellKey)).size).toBe(4)
      expect(trial.correctIndex).toBeGreaterThanOrEqual(0)
      expect(trial.correctIndex).toBeLessThanOrEqual(3)
      // پاسخ موتور باید با ریاضیات خود قاعده (از روی خانه‌های نمایان) بخواند
      verifyFamilyInvariants(trial.family, trial.matrix)
      const expected = expectedBottomRight(trial.family, trial.matrix)
      expect(trial.answer).toEqual(expected)
      expect(trial.options[trial.correctIndex]).toEqual(expected)
      // سطح ۵: هر حواس‌پرتی دقیقاً در ۲ ویژگی با پاسخ فرق دارد
      for (const option of trial.options) {
        if (attributeDiff(option, trial.answer) === 0) continue
        expect(attributeDiff(option, trial.answer)).toBe(config.distractorAttributeDiffs)
      }
    }
    // در سطح ۵ هر چهار خانواده باید دیده شوند (تنوع قاعده)
    expect(new Set(trials.map((t) => t.family)).size).toBe(PATTERN_RULE_FAMILIES.length)
  })

  it('در سطح ۱ هر حواس‌پرتی دقیقاً در ۱ ویژگی با پاسخ فرق دارد', () => {
    const config = configForDifficulty(1)
    const trials = collectTrials(config, SEED)
    expect(trials).toHaveLength(12)
    for (const trial of trials) {
      for (const option of trial.options) {
        const diff = attributeDiff(option, trial.answer)
        // فقط خود پاسخ صفر است؛ بقیه دقیقاً ۱ ویژگی متفاوت
        if (diff !== 0) expect(diff).toBe(1)
      }
      expect(new Set(trial.options.map(cellKey)).size).toBe(4)
    }
  })

  it('ریاضیات خانواده ۱ (پیشرفت تعداد) روی پازل دست‌ساز سطح ۱ بررسی می‌شود', () => {
    const trials = collectTrials(configForDifficulty(1), SEED)
    for (const trial of trials) {
      expect(trial.family).toBe('count-progression')
      // شکل و رنگ در کل پازل ثابت است
      const shape = (trial.matrix[0] as PatternCell).shape
      const color = (trial.matrix[0] as PatternCell).color
      for (let i = 0; i < 8; i++) {
        const cell = trial.matrix[i] as PatternCell
        expect(cell.shape).toBe(shape)
        expect(cell.color).toBe(color)
      }
      // ردیف r از r+1 شروع و در هر گام +۱ (چرخشی در ۱..۳):
      // ردیف ۰ → ۱،۲،۳ — ردیف ۱ → ۲،۳،۱ — ردیف ۲ → ۳،۱،۲
      const expectedCounts = [
        [1, 2, 3],
        [2, 3, 1],
        [3, 1, 2],
      ]
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const cell = trial.matrix[row * 3 + col]
          if (cell !== null) expect(cell.count).toBe(expectedCounts[row][col])
        }
      }
      // خانه (۲,۲): (۲+۲)%۳+۱ = ۲ — پاسخ همان خانه با تعداد ۲ است
      expect(trial.answer).toEqual({ shape, color, count: 2 })
      expect(trial.options[trial.correctIndex]).toEqual({ shape, color, count: 2 })
    }
  })

  it('هر سه نوع نتیجه (درست/غلط/بی‌پاسخی) با محرک دست‌ساز درست ارزیابی می‌شود', () => {
    // پازل خانواده «شکلِ هر ردیف»: دایره/مربع/مثلث، تعداد ۱..۳، همه قرمز
    const base = (shape: PatternCell['shape'], count: PatternCell['count']): PatternCell => ({
      shape,
      color: 'red',
      count,
    })
    const handMatrix: readonly (PatternCell | null)[] = [
      base('circle', 1),
      base('circle', 2),
      base('circle', 3),
      base('square', 1),
      base('square', 2),
      base('square', 3),
      base('triangle', 1),
      base('triangle', 2),
      null,
    ]
    const answer = base('triangle', 3)
    const trial: PatternCompletionTrial = {
      trialIndex: 0,
      family: 'shape-per-row',
      matrix: handMatrix,
      answer,
      options: [base('triangle', 2), answer, base('square', 3), { ...answer, color: 'blue' }],
      correctIndex: 1,
      responseWindowMs: null,
    }

    const session = def.createSession('a', configForDifficulty(3), SEED)

    const hit = def.submitAnswer({ ...session, currentTrial: trial }, 1, 420)
    expect(hit.results[0]?.outcome).toBe('correct')
    expect(hit.results[0]?.correct).toBe(true)
    expect(hit.results[0]?.reactionTimeMs).toBe(420)
    expect(hit.results[0]?.expected).toBe(1)
    expect(hit.results[0]?.given).toBe(1)
    expect(hit.results[0]?.stimulus).toEqual({ matrix: handMatrix, family: 'shape-per-row' })

    const wrong = def.submitAnswer({ ...session, currentTrial: trial }, 0, 300)
    expect(wrong.results[0]?.outcome).toBe('incorrect')
    expect(wrong.results[0]?.correct).toBe(false)
    expect(wrong.results[0]?.given).toBe(0)

    const miss = def.submitAnswer({ ...session, currentTrial: trial }, null, 0)
    expect(miss.results[0]?.outcome).toBe('omission')
    expect(miss.results[0]?.correct).toBe(false)
    expect(miss.results[0]?.given).toBeNull()
    expect(miss.results[0]?.reactionTimeMs).toBeNull()
  })

  it('ثبت پاسخ بدون محرک فعال خطا می‌دهد', () => {
    const state = def.createSession('a', configForDifficulty(1), SEED)
    expect(() => def.submitAnswer(state, 0, 100)).toThrow()
  })

  it('جلسه کامل ۱۲ مرحله‌ای با همه پاسخ‌های درست با متریک‌ها جمع می‌شود', () => {
    const config = configForDifficulty(5)
    let state = def.createSession('a', config, SEED)
    for (let i = 0; i < config.totalTrials; i++) {
      const step = def.nextTrial(state)
      state = def.submitAnswer(step.state, step.trial.correctIndex, 700)
    }
    expect(def.isComplete(state)).toBe(true)
    const summary = def.getSummary(state)
    expect(summary.exerciseId).toBe('pattern-completion')
    expect(summary.domain).toBe('reasoning')
    expect(summary.totalTrials).toBe(12)
    expect(summary.correctTrials).toBe(12)
    expect(summary.accuracy).toBe(100)
    expect(summary.medianReactionTimeMs).toBe(700)
    // امتیاز وزن‌دار: ۱۲ پاسخ درست × سطح ۵
    expect(summary.metrics['difficultyWeightedScore']).toBe(60)
    // در سطح ۵ هر چهار خانواده دیده شده است
    expect(summary.metrics['ruleFamilyVariety']).toBe(4)
  })

  it('امتیاز وزن‌دار و تنوع خانواده با نتایج مخلوط درست محاسبه می‌شود', () => {
    const config = configForDifficulty(3)
    let state = def.createSession('a', config, SEED)
    const familiesSeen = new Set<PatternRuleFamily>()
    let correctCount = 0
    for (let i = 0; i < config.totalTrials; i++) {
      const step = def.nextTrial(state)
      familiesSeen.add(step.trial.family)
      // مراحل زوج درست، مراحل فرد غلط
      const answer = i % 2 === 0 ? step.trial.correctIndex : (step.trial.correctIndex + 1) % 4
      state = def.submitAnswer(step.state, answer, 500)
      if (i % 2 === 0) correctCount++
    }
    const summary = def.getSummary(state)
    expect(summary.correctTrials).toBe(correctCount)
    expect(summary.accuracy).toBe(50)
    // ۶ پاسخ درست × سطح ۳
    expect(summary.metrics['difficultyWeightedScore']).toBe(18)
    expect(summary.metrics['ruleFamilyVariety']).toBe(familiesSeen.size)
    expect(summary.metrics['ruleFamilyVariety']).toBeGreaterThanOrEqual(1)
    expect(summary.metrics['ruleFamilyVariety']).toBeLessThanOrEqual(3)
  })

  it('nextTrial پس از اتمام ۱۲ مرحله خطا می‌دهد', () => {
    const config = configForDifficulty(1)
    let state = def.createSession('a', config, SEED)
    for (let i = 0; i < config.totalTrials; i++) {
      const step = def.nextTrial(state)
      state = def.submitAnswer(step.state, null, 0)
    }
    expect(() => def.nextTrial(state)).toThrow()
  })
})
