import { describe, expect, it } from 'vitest'
import { configForDifficulty, SENTENCE_BANK_FA, syllableCountingDefinition as def } from './engine'
import type { SyllableCountingState } from './engine'

const SEED = 2024

/** اجرای کامل یک جلسه با الگوی پاسخ دلخواه؛ خروجی: state نهایی و جمله‌های کشیده‌شده */
function runSession(
  difficulty: number,
  seed: number,
  answerFor: (trialIndex: number, expected: number) => number | null,
): { state: SyllableCountingState; texts: string[]; counts: number[] } {
  let state = def.createSession(`session-${difficulty}-${seed}`, configForDifficulty(difficulty), seed)
  const texts: string[] = []
  const counts: number[] = []
  for (let i = 0; i < state.config.totalTrials; i++) {
    const step = def.nextTrial(state)
    texts.push(step.trial.text)
    counts.push(step.trial.syllableCount)
    state = def.submitAnswer(step.state, answerFor(i, step.trial.syllableCount), 1000)
  }
  return { state, texts, counts }
}

describe('شمارش هجا — engine', () => {
  it('configForDifficulty برای هر پنج سطح درست است و بیرون بازه خطا می‌دهد', () => {
    for (let level = 1; level <= 5; level++) {
      const config = configForDifficulty(level)
      expect(config.difficulty).toBe(level)
      expect(config.bankLevel).toBe(level)
      expect(config.totalTrials).toBe(12)
    }
    expect(() => configForDifficulty(0)).toThrow(RangeError)
    expect(() => configForDifficulty(6)).toThrow(RangeError)
    expect(() => configForDifficulty(9)).toThrow(RangeError)
  })

  it('بانک جمله ۵۰ جمله دارد: هر سطح دقیقاً ۱۰ جمله با level در ۱..۵ و syllableCount ≥ ۱', () => {
    expect(SENTENCE_BANK_FA).toHaveLength(50)
    for (let level = 1; level <= 5; level++) {
      const ofLevel = SENTENCE_BANK_FA.filter((s) => s.level === level)
      expect(ofLevel).toHaveLength(10)
    }
    for (const sentence of SENTENCE_BANK_FA) {
      expect(sentence.level).toBeGreaterThanOrEqual(1)
      expect(sentence.level).toBeLessThanOrEqual(5)
      expect(sentence.syllableCount).toBeGreaterThanOrEqual(1)
    }
    // متن جمله‌ها یکتا باشند تا ردیابی «استفاده‌شده» معنادار بماند
    expect(new Set(SENTENCE_BANK_FA.map((s) => s.text)).size).toBe(SENTENCE_BANK_FA.length)
  })

  it('بازبینی کل بانک: متن غیرخالی و شمار هجا بین ۲ تا ۲۵', () => {
    for (const sentence of SENTENCE_BANK_FA) {
      expect(sentence.text.trim().length).toBeGreaterThan(0)
      expect(sentence.syllableCount).toBeGreaterThanOrEqual(2)
      expect(sentence.syllableCount).toBeLessThanOrEqual(25)
      // جمله‌های بانک یا نقطه یا علامت سؤال فارسی داشته باشند (نقطه‌گذاری درست)
      expect(/[.؟!]/.test(sentence.text)).toBe(true)
    }
  })

  it('تولید مراحل با seed یکسان قطعی است و هیچ مهلتی ندارد', () => {
    const a = runSession(3, SEED, (_i, expected) => expected)
    const b = runSession(3, SEED, (_i, expected) => expected)
    expect(a.texts).toEqual(b.texts)
    expect(a.counts).toEqual(b.counts)
    // شمار هجای هر مرحله با بانک می‌خواند و مهلت پاسخ null است
    const state = def.createSession('x', configForDifficulty(3), SEED)
    const first = def.nextTrial(state)
    expect(first.trial.responseWindowMs).toBeNull()
    const bankEntry = SENTENCE_BANK_FA.find((s) => s.text === first.trial.text)
    expect(bankEntry?.syllableCount).toBe(first.trial.syllableCount)
  })

  it('جمله‌های هر سطح تا پیش از تخلیهٔ زیربانک (۱۰ جمله) تکرار نمی‌شوند', () => {
    for (let level = 1; level <= 5; level++) {
      const { texts } = runSession(level, SEED, (_i, expected) => expected)
      // ۱۰ جملهٔ نخست یکتا
      const firstTen = texts.slice(0, 10)
      expect(new Set(firstTen).size).toBe(10)
      // همهٔ جمله‌های کشیده‌شده به زیربانک همان سطح تعلق دارند
      const levelTexts = new Set(SENTENCE_BANK_FA.filter((s) => s.level === level).map((s) => s.text))
      for (const text of texts) {
        expect(levelTexts.has(text)).toBe(true)
      }
    }
  })

  it('پاسخ درست/غلط/بی‌پاسخ درست ثبت می‌شوند', () => {
    const state = def.createSession('a', configForDifficulty(1), SEED)
    const { trial, state: s1 } = def.nextTrial(state)

    const right = def.submitAnswer(s1, trial.syllableCount, 700)
    expect(right.results[0]?.outcome).toBe('correct')
    expect(right.results[0]?.correct).toBe(true)

    const wrong = def.submitAnswer(s1, trial.syllableCount + 1, 700)
    expect(wrong.results[0]?.outcome).toBe('incorrect')
    expect(wrong.results[0]?.correct).toBe(false)

    const none = def.submitAnswer(s1, null, 0)
    expect(none.results[0]?.outcome).toBe('omission')

    // محرک فقط متن است؛ expected همان شمار هجا
    expect(none.results[0]?.stimulus).toEqual({ text: trial.text })
    expect(none.results[0]?.expected).toBe(trial.syllableCount)
    expect(none.results[0]?.reactionTimeMs).toBeNull()
  })

  it('جلسهٔ ۱۲ سؤالی کامل می‌شود و معیارها درست محاسبه می‌شوند', () => {
    // الگو: i%4===1 → پاسخ غلط با خطای +۲ (سه مورد)، i===7 → بی‌پاسخ، بقیه درست
    const { state } = runSession(2, SEED, (i, expected) => (i === 7 ? null : i % 4 === 1 ? expected + 2 : expected))
    expect(def.isComplete(state)).toBe(true)
    const summary = def.getSummary(state)
    expect(summary.exerciseId).toBe('syllable-counting')
    expect(summary.domain).toBe('verbal-auditory')
    expect(summary.totalTrials).toBe(12)
    expect(summary.correctTrials).toBe(8)
    expect(summary.accuracy).toBe(66.7)
    expect(summary.medianReactionTimeMs).toBe(1000)
    // MAE = (۲+۲+۲) ÷ ۱۱ پاسخداده‌شده = ۰/۵
    expect(summary.metrics['meanAbsoluteError']).toBe(0.5)
    // ۸ پاسخ دقیق از ۱۱ پاسخداده‌شده = ۷۲/۷٪
    expect(summary.metrics['exactAnswerRate']).toBe(72.7)
  })

  it('پس از پایان جلسه، تولید مرحلهٔ بعدی خطا می‌دهد', () => {
    const { state } = runSession(1, SEED, (_i, expected) => expected)
    expect(() => def.nextTrial(state)).toThrow('همه جمله‌ها تولید شده‌اند')
  })
})
