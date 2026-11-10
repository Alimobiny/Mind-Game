import { describe, expect, it } from 'vitest'
import {
  configForDifficulty,
  WORD_BANK_FA,
  wordMemoryDefinition as def,
} from './engine'

const SEED = 2024

describe('Word Memory — engine', () => {
  it('configForDifficulty تعداد واژه و زمان نمایش را بر اساس دشواری تنظیم می‌کند', () => {
    expect(configForDifficulty(1).studyWordCount).toBe(4)
    expect(configForDifficulty(3).studyWordCount).toBe(6)
    expect(configForDifficulty(5).studyWordCount).toBe(8)
    expect(configForDifficulty(1).displayMsPerWord).toBe(1100)
    expect(configForDifficulty(3).displayMsPerWord).toBe(900)
    expect(configForDifficulty(5).displayMsPerWord).toBe(700)
    expect(configForDifficulty(2).gapMs).toBe(300)
    expect(configForDifficulty(4).totalTrials).toBe(6)
    expect(() => configForDifficulty(0)).toThrow(RangeError)
    expect(() => configForDifficulty(6)).toThrow(RangeError)
  })

  it('بانک واژه‌ها بدون تکرار و خالی نیست', () => {
    expect(WORD_BANK_FA.length).toBeGreaterThanOrEqual(60)
    expect(new Set(WORD_BANK_FA).size).toBe(WORD_BANK_FA.length)
    expect(WORD_BANK_FA.every((w) => w.length > 0)).toBe(true)
  })

  it('تولید مرحله قطعی است: seed و trialIndex یکسان → واژه‌ها و گزینه‌های یکسان', () => {
    const s1 = def.createSession('a', configForDifficulty(3), SEED)
    const s2 = def.createSession('b', configForDifficulty(3), SEED)
    const t1 = def.nextTrial(s1).trial
    const t2 = def.nextTrial(s2).trial
    expect(t1.studyWords).toEqual(t2.studyWords)
    expect(t1.recallOptions).toEqual(t2.recallOptions)
    expect(t1.trialIndex).toBe(0)
    expect(t1.responseWindowMs).toBeNull()
  })

  it('گزینه‌های بازخوانی ۲N واژه متمایز شامل همه واژه‌های مطالعه است و بین مراحل تنوع دارد', () => {
    const config = configForDifficulty(5)
    const state = def.createSession('a', config, SEED)
    const bank = new Set(WORD_BANK_FA)
    const seen = new Set<string>()
    let current = state
    for (let i = 0; i < config.totalTrials; i++) {
      const step = def.nextTrial(current)
      const { studyWords, recallOptions } = step.trial
      expect(recallOptions).toHaveLength(2 * config.studyWordCount)
      expect(new Set(recallOptions).size).toBe(recallOptions.length)
      expect(studyWords.every((w) => recallOptions.includes(w))).toBe(true)
      expect(recallOptions.every((w) => bank.has(w))).toBe(true)
      seen.add(studyWords.join(','))
      current = def.submitAnswer(step.state, studyWords, 800)
    }
    // مجموعه واژه‌های مراحل مختلف تنوع دارد
    expect(seen.size).toBeGreaterThan(1)
  })

  it('انتخاب کامل واژه‌های مطالعه → correct حتی با ترتیب متفاوت', () => {
    const state = def.createSession('a', configForDifficulty(2), SEED)
    const { trial } = def.nextTrial(state)
    // ترتیب معکوس: ترتیب انتخاب نباید اهمیت داشته باشد
    const reversed = [...trial.studyWords].reverse()
    const result = def.submitAnswer({ ...state, currentTrial: trial }, reversed, 1200)
    expect(result.results[0]?.outcome).toBe('correct')
    expect(result.results[0]?.correct).toBe(true)
    expect(result.results[0]?.expected).toEqual([...trial.studyWords].sort())
    expect(result.results[0]?.reactionTimeMs).toBe(1200)
  })

  it('جای‌گذاری یک واژه با واژه جدید → incorrect با متریک‌های hits و falseAlarms', () => {
    const config = configForDifficulty(1) // N = 4
    const state = def.createSession('a', config, SEED)
    const { trial } = def.nextTrial(state)
    const studySet = new Set(trial.studyWords)
    const distractor = trial.recallOptions.find((w) => !studySet.has(w)) as string
    const swapped = [...trial.studyWords.slice(0, 3), distractor]
    const result = def.submitAnswer({ ...state, currentTrial: trial }, swapped, 900)
    expect(result.results[0]?.outcome).toBe('incorrect')
    expect(result.results[0]?.correct).toBe(false)

    const summary = def.getSummary(result)
    expect(summary.metrics['hits']).toBe(3)
    expect(summary.metrics['falseAlarms']).toBe(1)
    expect(summary.metrics['missedWords']).toBe(1)
    expect(summary.metrics['meanRecallRate']).toBe(75)
  })

  it('پاسخ null به‌عنوان omission ثبت می‌شود', () => {
    const state = def.createSession('a', configForDifficulty(1), SEED)
    const { trial } = def.nextTrial(state)
    const result = def.submitAnswer({ ...state, currentTrial: trial }, null, 0)
    expect(result.results[0]?.outcome).toBe('omission')
    expect(result.results[0]?.reactionTimeMs).toBeNull()
  })

  it('جلسه بعد از ۶ مرحله کامل می‌شود و summary متریک‌ها را درست تجمیع می‌کند', () => {
    const config = configForDifficulty(3) // N = 6
    let state = def.createSession('a', config, SEED)
    for (let i = 0; i < config.totalTrials; i++) {
      const step = def.nextTrial(state)
      state = def.submitAnswer(step.state, step.trial.studyWords, 1500)
    }
    expect(def.isComplete(state)).toBe(true)
    const summary = def.getSummary(state)
    expect(summary.totalTrials).toBe(6)
    expect(summary.correctTrials).toBe(6)
    expect(summary.accuracy).toBe(100)
    expect(summary.exerciseId).toBe('word-memory')
    expect(summary.exerciseVersion).toBe('1.0.0')
    expect(summary.contentVersion).toBe('1')
    expect(summary.domain).toBe('verbal-auditory')
    expect(summary.metrics['hits']).toBe(6 * 6)
    expect(summary.metrics['falseAlarms']).toBe(0)
    expect(summary.metrics['missedWords']).toBe(0)
    expect(summary.metrics['meanRecallRate']).toBe(100)
  })

  it('nextTrial بیش از حد مجاز خطا می‌دهد', () => {
    const config = configForDifficulty(1)
    let state = def.createSession('a', config, SEED)
    for (let i = 0; i < config.totalTrials; i++) {
      const step = def.nextTrial(state)
      state = def.submitAnswer(step.state, step.trial.studyWords, 500)
    }
    expect(() => def.nextTrial(state)).toThrow()
  })
})
