// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  RULE_DISCOVERY_CARD_SORTING_ID,
  REF_CARDS,
  correctPileFor,
  ruleDiscoveryCardSortingDefinition as def,
  configForDifficulty,
} from './engine'
import type { RuleDiscoveryState, RuleDiscoveryTrial, SortDimension } from './engine'

/**
 * تست‌های کارت‌بندی قاعده — قطعی؛ موتور حالت‌دار (قاعده از تاریخچهٔ پاسخ‌ها).
 */

const SEED = 101

function start(difficulty: number): RuleDiscoveryState {
  return def.createSession('s1', configForDifficulty(difficulty), SEED)
}

/** اجرای جلسه با تابع تصمیم — shadow state برای قواعد در دسترس است */
function runSession(
  difficulty: number,
  decide: (trial: RuleDiscoveryTrial, state: RuleDiscoveryState) => number | null,
): RuleDiscoveryState {
  let state = start(difficulty)
  while (!def.isComplete(state)) {
    const { state: withTrial, trial } = def.nextTrial(state)
    state = def.submitAnswer(withTrial, decide(trial, withTrial as RuleDiscoveryState), 600)
  }
  return state
}

describe('configForDifficulty — کارت‌بندی قاعده', () => {
  it('نردبان تعویض/ابعاد/بازخورد + خطای بازه', () => {
    expect(configForDifficulty(1)).toMatchObject({
      trialCount: 36,
      switchAfter: 5,
      dimensions: ['color', 'shape'],
      misleadingFeedbackRate: 0,
    })
    expect(configForDifficulty(3)).toMatchObject({
      dimensions: ['color', 'shape', 'count'],
      switchAfter: 7,
    })
    expect(configForDifficulty(5)).toMatchObject({ switchAfter: 10, misleadingFeedbackRate: 0.15 })
    expect(() => configForDifficulty(0)).toThrow(RangeError)
    expect(() => configForDifficulty(6)).toThrow(RangeError)
  })
})

describe('کارت‌ها و قاعدهٔ پنهان', () => {
  it('کارت‌ها قطعی از بذر مرحله و در فضای ۴×۴×۴؛ زیر هر قاعده دقیقاً یک مرجع درست', () => {
    const a = runSession(3, (t) => t.correctPile)
    const b = runSession(3, (t) => t.correctPile)
    expect(a.results.map((r) => r.stimulus)).toEqual(b.results.map((r) => r.stimulus).map((s) => s))
    for (const record of a.results) {
      const card = (record.stimulus as { card: { color: number; shape: number; count: number } }).card
      for (const value of [card.color, card.shape, card.count]) {
        expect(value).toBeGreaterThanOrEqual(0)
        expect(value).toBeLessThanOrEqual(3)
      }
      for (const rule of ['color', 'shape', 'count'] as const) {
        const pile = correctPileFor(card, rule)
        const ref = REF_CARDS[pile] as { color: number; shape: number; count: number }
        expect(ref[rule === 'color' ? 'color' : rule === 'shape' ? 'shape' : 'count']).toBe(
          rule === 'color' ? card.color : rule === 'shape' ? card.shape : card.count,
        )
      }
    }
  })

  it('بازی بی‌نقص: دقت ۱۰۰، تعویض قاعده هر switchAfter پاسخ، چرخهٔ ابعاد', () => {
    const state = runSession(1, (t) => t.correctPile)
    const summary = def.getSummary(state)
    expect(summary.accuracy).toBe(100)
    expect(summary.metrics.totalErrors).toBe(0)
    // ۳۶ مرحله / تعویض هر ۵ پاسخ = ۷ دسته
    expect(summary.metrics.categoriesCompleted).toBe(7)
    expect(summary.metrics.trialsToFirstCategory).toBe(5)
    // چرخهٔ دوبعدی سطح ۱: رنگ → شکل → رنگ → …؛ ۷ تعویض فرد از رنگ = شکل
    expect(state.activeRule).toBe('shape')
    expect(state.previousRule).toBe('color')
  })

  it('قاعدهٔ مرحله بعد از تعویض، بُعد بعدی چرخه است (سطح ۳ سه‌بعدی)', () => {
    const rulesSeen: SortDimension[] = []
    let state = start(3)
    // ۸ پاسخ درست اول: تعویض قاعده بعد از هفتمین (سطح ۳ = switchAfter ۷)
    for (let i = 0; i < 8; i += 1) {
      const { state: s, trial } = def.nextTrial(state)
      rulesSeen.push(trial.activeRule)
      state = def.submitAnswer(s, trial.correctPile, 500)
    }
    expect(rulesSeen.slice(0, 7)).toEqual(['color', 'color', 'color', 'color', 'color', 'color', 'color'])
    expect(rulesSeen.slice(7)).toEqual(['shape'])
    expect(state.categoriesCompleted).toBe(1)
    expect(state.firstCategoryTrial).toBe(7)
  })

  it('پاسخ طبق قاعدهٔ منقضی پس از تعویض = خطای پایدار', () => {
    let state = start(3)
    let triedPerseverative = false
    while (!def.isComplete(state)) {
      const { state: s, trial } = def.nextTrial(state)
      const st = s as RuleDiscoveryState
      let answer: number | null = trial.correctPile
      if (!triedPerseverative && st.previousRule !== null) {
        const expiredPile = correctPileFor(trial.card, st.previousRule)
        if (expiredPile !== trial.correctPile) {
          answer = expiredPile
          triedPerseverative = true
        }
      }
      state = def.submitAnswer(s, answer, 500)
    }
    expect(triedPerseverative).toBe(true)
    const summary = def.getSummary(state)
    expect(summary.metrics.perseverativeErrors).toBe(1)
    expect(summary.metrics.totalErrors).toBe(1)
  })

  it('خطا پس از ۳+ پاسخ درست = شکست در حفظ دسته', () => {
    let state = start(2)
    let broke = false
    let i = 0
    while (!def.isComplete(state)) {
      const { state: s, trial } = def.nextTrial(state)
      let answer: number | null = trial.correctPile
      if (!broke && i === 3) {
        // پس از ۳ پاسخ درست (streak=3) یک خطای عامدانه
        answer = (trial.correctPile + 1) % 4
        broke = true
      }
      state = def.submitAnswer(s, answer, 500)
      i += 1
    }
    expect(broke).toBe(true)
    expect(def.getSummary(state).metrics.failureToMaintainSet).toBe(1)
  })

  it('بی‌پاسخی → omission و صفرشدن رشتهٔ درست', () => {
    const state = runSession(1, (t, s) => (s.correctStreak >= 2 ? null : t.correctPile))
    const summary = def.getSummary(state)
    expect(state.results.some((r) => r.outcome === 'omission')).toBe(true)
    expect(summary.accuracy).toBeLessThan(100)
    expect(summary.metrics.totalErrors).toBeGreaterThan(0)
  })

  it('سطح ۵: بازخورد گمراه‌کننده می‌آید ولی داوری با قاعدهٔ واقعی است', () => {
    const state = runSession(5, (t) => t.correctPile)
    const summary = def.getSummary(state)
    expect(summary.accuracy).toBe(100)
    const misleading = state.results.filter(
      (r) => (r.stimulus as { misleading?: boolean }).misleading === true,
    )
    expect(misleading.length).toBeGreaterThanOrEqual(1)
    for (const r of misleading) {
      // پاسخ درست بوده ولی بازخورد نمایشی غلط
      expect(r.correct).toBe(true)
      expect((r.stimulus as { shownCorrect: boolean }).shownCorrect).toBe(false)
    }
  })

  it('شناسه‌ها و نسخه‌ها در خلاصه ثابت‌اند', () => {
    const summary = def.getSummary(runSession(1, (t) => t.correctPile))
    expect(summary.exerciseId).toBe(RULE_DISCOVERY_CARD_SORTING_ID)
    expect(summary.domain).toBe('reasoning')
    expect(summary.totalTrials).toBe(36)
  })
})

describe('قرارداد هسته', () => {
  it('nextTrial پس از پایان جلسه خطا می‌دهد؛ بدون مرحله فعال، submit خطا می‌دهد', () => {
    const state = runSession(1, (t) => t.correctPile)
    expect(def.isComplete(state)).toBe(true)
    expect(() => def.nextTrial(state)).toThrow()
    expect(() => def.submitAnswer(start(1), null, 100)).toThrow()
  })
})
