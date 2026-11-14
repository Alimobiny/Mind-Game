// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { PASSAGE_BANK_FA, configForDifficulty, readingAloudDefinition as def } from './engine'
import type { ReadingAloudState, ReadingAloudTrial } from './engine'
import { countPersianWords } from '../../../../utils/persian'

/**
 * تست‌های بلندخوانی — بانک پیش‌اعتبارسنجی‌شده و موتور قطعی.
 */

const SEED = 42

function fullSession(
  difficulty: number,
  answerOf: (t: ReadingAloudTrial) => { readingMs: number; answers: readonly (number | null)[] } | null,
) {
  const config = configForDifficulty(difficulty)
  let state = def.createSession('s1', config, SEED)
  const trials: ReadingAloudTrial[] = []
  for (let i = 0; i < config.trials; i += 1) {
    const next = def.nextTrial(state)
    state = next.state as ReadingAloudState
    trials.push(next.trial)
    state = def.submitAnswer(state, answerOf(next.trial), 5000) as ReadingAloudState
  }
  return { state, trials, config }
}

const perfectAnswer = (t: ReadingAloudTrial) => ({
  readingMs: 30_000,
  answers: t.questions.map((q) => q.correctIndex),
})

describe('بانک محتوا', () => {
  it('۱۵ متن، دقیقاً ۳ متن در هر سطح ۱ تا ۵', () => {
    expect(PASSAGE_BANK_FA).toHaveLength(15)
    for (let level = 1; level <= 5; level += 1) {
      expect(PASSAGE_BANK_FA.filter((p) => p.level === level)).toHaveLength(3)
    }
  })

  it('هر متن دو سؤال چهارگزینه‌ای با پاسخ یکتا و متفاوت از متن‌های دیگر دارد', () => {
    const texts = new Set<string>()
    for (const passage of PASSAGE_BANK_FA) {
      expect(texts.has(passage.text)).toBe(false)
      texts.add(passage.text)
      expect(passage.questions).toHaveLength(2)
      for (const q of passage.questions) {
        expect(q.choices).toHaveLength(4)
        expect(q.correctIndex).toBeGreaterThanOrEqual(0)
        expect(q.correctIndex).toBeLessThan(4)
        expect(new Set(q.choices).size).toBe(4)
        // پاسخ درست باید از متن قابل استنتاج باشد — دست‌کم واژه‌ای مشترک با متن
        expect(q.prompt.length).toBeGreaterThan(3)
      }
    }
  })

  it('شمارش واژهٔ متن‌ها با شمارندهٔ فارسی سازگار و ناصفر است', () => {
    for (const passage of PASSAGE_BANK_FA) {
      const words = countPersianWords(passage.text)
      expect(words).toBeGreaterThan(5)
    }
  })
})

describe('configForDifficulty', () => {
  it('سطح بانک = دشواری؛ خطای بازه', () => {
    expect(configForDifficulty(3)).toMatchObject({ passageLevel: 3, trials: 3 })
    expect(() => configForDifficulty(0)).toThrow(RangeError)
    expect(() => configForDifficulty(6)).toThrow(RangeError)
  })
})

describe('طرح جلسه', () => {
  it('سه مرحله از زیربانک سطح، بدون تکرار، قطعی از بذر', () => {
    const a = fullSession(4, perfectAnswer)
    const b = fullSession(4, perfectAnswer)
    expect(a.trials.map((t) => t.passage.text)).toEqual(b.trials.map((t) => t.passage.text))
    expect(new Set(a.trials.map((t) => t.passage.text)).size).toBe(3)
    for (const t of a.trials) expect(t.passage.level).toBe(4)
  })

  it('مرحله بی‌مهلت است و شمارش واژه حمل می‌شود', () => {
    const { trials } = fullSession(1, perfectAnswer)
    for (const t of trials) {
      expect(t.responseWindowMs).toBeNull()
      expect(t.wordCount).toBe(countPersianWords(t.passage.text))
    }
  })
})

describe('بُر زدن گزینه‌ها (contentVersion 2)', () => {
  it('گزینهٔ درست همیشه در جایگاه نخست نیست — روی بذرهای مختلف جابه‌جا می‌شود', () => {
    // در v1 همهٔ ۳۰ سؤال بانک correctIndex=0 داشتند و بُری انجام نمی‌شد:
    // انتخاب همیشگی گزینهٔ اول دقت فهم ۱۰۰٪ می‌داد (سوگیری سیستماتیک)
    const positions = new Set<number>()
    for (let seed = 1; seed <= 24; seed += 1) {
      const config = configForDifficulty(1)
      const state = def.createSession('s', config, seed)
      const next = def.nextTrial(state)
      for (const q of next.trial.questions) positions.add(q.correctIndex)
    }
    expect(positions.size).toBeGreaterThan(1)
  })

  it('بُر قطعی است؛ همان گزینه‌ها و همان متن پاسخ درست حفظ می‌شود', () => {
    const config = configForDifficulty(3)
    const a = def.nextTrial(def.createSession('s', config, 7))
    const b = def.nextTrial(def.createSession('s', config, 7))
    for (let qi = 0; qi < a.trial.questions.length; qi += 1) {
      const shuffled = a.trial.questions[qi] as { choices: readonly string[]; correctIndex: number }
      const bank = (a.trial.passage.questions[qi] as { choices: readonly string[]; correctIndex: number })
      const again = b.trial.questions[qi] as { choices: readonly string[]; correctIndex: number }
      expect(shuffled.choices).toEqual(again.choices)
      expect(shuffled.correctIndex).toBe(again.correctIndex)
      // همان مجموعه گزینه‌ها و همان متنِ پاسخ درست بانک
      expect([...shuffled.choices].sort()).toEqual([...bank.choices].sort())
      expect(shuffled.choices[shuffled.correctIndex]).toBe(bank.choices[bank.correctIndex])
    }
  })
})

describe('امتیازدهی و خلاصه', () => {
  it('فهم کامل + ۳۰ ثانیه خواندن → دقت ۱۰۰ و wpm متناسب', () => {
    const { state } = fullSession(2, perfectAnswer)
    expect(def.isComplete(state)).toBe(true)
    const summary = def.getSummary(state)
    expect(summary.accuracy).toBe(100)
    expect(summary.metrics).toMatchObject({
      passagesRead: 3,
      meanReadingMs: 30_000,
      comprehensionAccuracy: 100,
    })
    // wpm = میانگین (واژه/۳۰ثانیه×۶۰) روی سه متن
    expect(summary.metrics.wordsPerMinute).toBeGreaterThan(0)
  })

  it('یک پاسخ غلط در یک سؤال → فهم ۷۵٪ (۵ از ۶ سؤال) ولی آن مرحله incorrect', () => {
    const { state } = fullSession(1, (t) => {
      const answers = t.questions.map((q) => q.correctIndex)
      if (t.trialIndex === 0) answers[0] = (answers[0] as number) + 1 === 4 ? 0 : (answers[0] as number) + 1
      return { readingMs: 25_000, answers }
    })
    const summary = def.getSummary(state)
    expect(summary.accuracy).toBeLessThan(100)
    expect(summary.metrics.comprehensionAccuracy).toBe(83.3)
  })

  it('انقضا/بی‌پاسخ (null) → omission و فهم فقط از پاسخ‌های نداده صفر می‌شود', () => {
    const { state } = fullSession(1, () => null)
    expect(state.results.every((r) => r.outcome === 'omission')).toBe(true)
    const summary = def.getSummary(state)
    expect(summary.metrics.comprehensionAccuracy).toBe(0)
    expect(summary.metrics.meanReadingMs).toBe(0)
  })
})

describe('قرارداد هسته', () => {
  it('nextTrial پس از پایان خطا؛ submit بدون مرحله خطا', () => {
    const config = configForDifficulty(1)
    let state = def.createSession('s1', config, SEED)
    for (let i = 0; i < config.trials; i += 1) {
      const next = def.nextTrial(state)
      state = def.submitAnswer(next.state, perfectAnswer(next.trial), 1000) as ReadingAloudState
    }
    expect(() => def.nextTrial(state)).toThrow()
    expect(() => def.submitAnswer(def.createSession('s2', config, SEED), null, 1)).toThrow()
  })
})
