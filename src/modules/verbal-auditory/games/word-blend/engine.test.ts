// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { BLEND_BANK_FA, configForDifficulty, wordBlendDefinition as def } from './engine'
import type { WordBlendState, WordBlendTrial } from './engine'
import { normalizePersian } from '../../../../utils/persian'

/**
 * تست‌های ترکیب واژه — بانک هجاشکنی‌شده و موتور قطعی.
 */

const SEED = 42

function fullSession(
  difficulty: number,
  answerOf: (t: WordBlendTrial) => number | null,
) {
  const config = configForDifficulty(difficulty)
  let state = def.createSession('s1', config, SEED)
  const trials: WordBlendTrial[] = []
  for (let i = 0; i < config.trials; i += 1) {
    const next = def.nextTrial(state)
    state = next.state as WordBlendState
    trials.push(next.trial)
    state = def.submitAnswer(state, answerOf(next.trial), 2200) as WordBlendState
  }
  return { state, trials, config }
}

describe('بانک ترکیب واژه', () => {
  it('۴۰ مدخل — دقیقاً ۸ در هر سطح، واژه‌ها یکتا', () => {
    expect(BLEND_BANK_FA).toHaveLength(40)
    for (let level = 1; level <= 5; level += 1) {
      expect(BLEND_BANK_FA.filter((e) => e.level === level)).toHaveLength(8)
    }
    expect(new Set(BLEND_BANK_FA.map((e) => e.word)).size).toBe(40)
  })

  it('اتصال قطعات هر مدخل (پس از حذف اعراب و نیم‌فاصله) همان واژه را می‌سازد', () => {
    // v2: واژه‌های مرکب با نیم‌فاصلهٔ درست نوشته می‌شوند (پنبه‌زن، چای‌دان…)؛
    // قطعات ساده‌اند و ZWNJ فقط در مقایسه حذف می‌شود
    const stripZwnj = (t: string) => t.replace(/\u200c/g, '')
    for (const entry of BLEND_BANK_FA) {
      expect(entry.parts).toHaveLength(2)
      const joined = entry.parts.join('')
      expect(normalizePersian(stripZwnj(joined))).toBe(normalizePersian(stripZwnj(entry.word)))
      expect(entry.word).not.toMatch(/\s/)
      for (const part of entry.parts) {
        expect(part.length).toBeGreaterThan(0)
        expect(part).not.toMatch(/\s/)
        expect(part).not.toMatch(/\u200c/)
      }
    }
  })

  it('واژه‌های مرکب بانک با نیم‌فاصلهٔ درست نوشته شده‌اند (رگرسیون v2)', () => {
    // در v1 پنج مدخل بدون نیم‌فاصله غلط املایی رندر می‌شدند
    const zwnjWords = BLEND_BANK_FA.filter((e) => e.word.includes('‌')).map((e) => e.word)
    expect(zwnjWords).toEqual(
      expect.arrayContaining(['پنبه‌زن', 'چای‌دان', 'آتش‌نشانی', 'دستمال‌کاغذی', 'چراغ‌دان']),
    )
    expect(
      BLEND_BANK_FA.some((e) => /^(پنبهزن|چایدان|آتشنشانی|دستمالکاغذی|چراغدان)$/.test(e.word)),
    ).toBe(false)
  })

  it('trial نردبان سرعت گفتار را حمل می‌کند (سیم‌کشی v2)', () => {
    const config = configForDifficulty(5)
    const state = def.createSession('s', config, 11)
    const next = def.nextTrial(state)
    expect(next.trial.speechRate).toBe(config.speechRate)
  })
})

describe('configForDifficulty', () => {
  it('نردبان گپ و سرعت + خطای بازه', () => {
    expect(configForDifficulty(1)).toMatchObject({ blendLevel: 1, partGapMs: 1200, choiceCount: 4 })
    expect(configForDifficulty(5)).toMatchObject({ blendLevel: 5, partGapMs: 700 })
    expect(configForDifficulty(1).speechRate).toBeLessThan(configForDifficulty(5).speechRate)
    expect(() => configForDifficulty(0)).toThrow(RangeError)
    expect(() => configForDifficulty(6)).toThrow(RangeError)
  })
})

describe('طرح جلسه', () => {
  it('قطعی از بذر؛ مدخل‌ها از سطح درست؛ دو مرحلهٔ پشت‌سرهم یکی نیست', () => {
    const a = fullSession(3, (t) => t.correctIndex)
    const b = fullSession(3, (t) => t.correctIndex)
    expect(a.trials.map((t) => t.entry.word)).toEqual(b.trials.map((t) => t.entry.word))
    for (const t of a.trials) expect(t.entry.level).toBe(3)
    for (let i = 1; i < a.trials.length; i += 1) {
      expect(a.trials[i]?.entry.word).not.toBe(a.trials[i - 1]?.entry.word)
    }
  })

  it('هر مرحله چهار گزینهٔ یکتا شامل واژهٔ هدف با اندیس درست', () => {
    const { trials } = fullSession(2, (t) => t.correctIndex)
    for (const t of trials) {
      expect(t.choices).toHaveLength(4)
      expect(new Set(t.choices).size).toBe(4)
      expect(t.choices[t.correctIndex]).toBe(t.entry.word)
    }
  })
})

describe('داوری و امتیازدهی', () => {
  it('همه درست → دقت ۱۰۰ با میانگین زمان', () => {
    const { state } = fullSession(1, (t) => t.correctIndex)
    expect(def.isComplete(state)).toBe(true)
    const summary = def.getSummary(state)
    expect(summary.accuracy).toBe(100)
    expect(summary.metrics.meanAnswerTimeMs).toBe(2200)
  })

  it('انتخاب گزینهٔ فریب → غلط؛ بی‌پاسخ → omission', () => {
    const { state } = fullSession(2, (t) => (t.correctIndex + 1) % 4)
    expect(def.getSummary(state).accuracy).toBe(0)
    const skipped = fullSession(2, () => null)
    expect(skipped.state.results.every((r) => r.outcome === 'omission')).toBe(true)
    expect(def.getSummary(skipped.state).metrics.meanAnswerTimeMs).toBe(0)
  })
})

describe('قرارداد هسته', () => {
  it('nextTrial پس از پایان خطا؛ submit بدون مرحله خطا', () => {
    const config = configForDifficulty(1)
    let state = def.createSession('s1', config, SEED)
    for (let i = 0; i < config.trials; i += 1) {
      const next = def.nextTrial(state)
      state = def.submitAnswer(next.state, next.trial.correctIndex, 1000) as WordBlendState
    }
    expect(() => def.nextTrial(state)).toThrow()
    expect(() => def.submitAnswer(def.createSession('s2', config, SEED), null, 1)).toThrow()
  })
})
