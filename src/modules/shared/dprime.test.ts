// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { dPrimeLoglinear } from './dprime'

describe('dPrimeLoglinear — تصحیح loglinear برای خانوادهٔ n-back', () => {
  it('قاطع و متقارن: بدون سیگنال/بدون نویز → صفر', () => {
    expect(dPrimeLoglinear(0, 0, 0, 0)).toBe(0)
  })

  it('نرخ‌های حدی بی‌نهایت نمی‌شوند (درس اصلی loglinear)', () => {
    const perfect = dPrimeLoglinear(8, 8, 0, 17)
    expect(Number.isFinite(perfect)).toBe(true)
    expect(perfect).toBeGreaterThan(3)
    const worst = dPrimeLoglinear(0, 8, 17, 17)
    expect(Number.isFinite(worst)).toBe(true)
    expect(worst).toBeLessThan(-3)
  })

  it('مقادیر مرجع: z هموارشده با دقت ±۰٫۰۱', () => {
    // hit=(8.5/9)≈0.9444 → z≈1.5901؛ fa=(0.5/18)≈0.0278 → z≈-1.9113 → d′≈3.50
    expect(dPrimeLoglinear(8, 8, 0, 17)).toBeCloseTo(3.5, 1)
    // hit=fa → صفر
    expect(dPrimeLoglinear(4, 8, 4, 8)).toBeCloseTo(0, 2)
    // فقط نرخ‌ها مهم‌اند نه مخرج‌ها؟ نه — loglinear به N حساس است: همان نرخ با N بزرگتر → |d′| بزرگتر
    const small = dPrimeLoglinear(4, 8, 0, 8)
    const big = dPrimeLoglinear(8, 16, 0, 16)
    expect(big).toBeGreaterThan(small)
  })

  it('ورودی نامعتبر خطا می‌دهد', () => {
    expect(() => dPrimeLoglinear(9, 8, 0, 8)).toThrow(RangeError)
    expect(() => dPrimeLoglinear(1, 8, -1, 8)).toThrow(RangeError)
  })
})
