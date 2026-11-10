import { describe, expect, it } from 'vitest'
import { SeededRandom } from './seeded-random'

describe('SeededRandom (mulberry32)', () => {
  it('با seed یکسان توالی یکسان تولید می‌کند (قطعیت)', () => {
    const a = new SeededRandom(12345)
    const b = new SeededRandom(12345)
    const seqA = Array.from({ length: 20 }, () => a.next())
    const seqB = Array.from({ length: 20 }, () => b.next())
    expect(seqA).toEqual(seqB)
  })

  it('با seed متفاوت توالی متفاوت می‌دهد', () => {
    const a = new SeededRandom(1)
    const b = new SeededRandom(2)
    const seqA = Array.from({ length: 20 }, () => a.next())
    const seqB = Array.from({ length: 20 }, () => b.next())
    expect(seqA).not.toEqual(seqB)
  })

  it('خروجی next در بازه [0,1) است', () => {
    const rng = new SeededRandom(7)
    for (let i = 0; i < 1000; i++) {
      const value = rng.next()
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  it('int در بازه درخواستی می‌ماند (شامل مرزها)', () => {
    const rng = new SeededRandom(42)
    const seen = new Set<number>()
    for (let i = 0; i < 500; i++) {
      const value = rng.int(3, 7)
      expect(Number.isInteger(value)).toBe(true)
      expect(value).toBeGreaterThanOrEqual(3)
      expect(value).toBeLessThanOrEqual(7)
      seen.add(value)
    }
    // همه مقادیر بازه باید دیده شوند
    expect(seen.has(3)).toBe(true)
    expect(seen.has(7)).toBe(true)
  })

  it('int با بازه معکوس خطا می‌دهد', () => {
    const rng = new SeededRandom(1)
    expect(() => rng.int(5, 2)).toThrow(RangeError)
  })

  it('pick از عناصر آرایه انتخاب می‌کند و روی آرایه خالی خطا می‌دهد', () => {
    const rng = new SeededRandom(9)
    const items = ['a', 'b', 'c']
    expect(items).toContain(rng.pick(items))
    expect(() => rng.pick([])).toThrow()
  })

  it('pickWeighted توزیع تقریبی وزن‌ها را رعایت می‌کند', () => {
    const rng = new SeededRandom(100)
    const N = 10_000
    let goCount = 0
    for (let i = 0; i < N; i++) {
      const value = rng.pickWeighted([
        ['go', 3],
        ['nogo', 1],
      ] as const)
      if (value === 'go') goCount++
    }
    // انتظار 75٪ با تلورانس آماری
    expect(goCount / N).toBeGreaterThan(0.72)
    expect(goCount / N).toBeLessThan(0.78)
  })

  it('shuffle جایگشت است: همه عناصر حفظ می‌شوند', () => {
    const rng = new SeededRandom(55)
    const source = [1, 2, 3, 4, 5, 6, 7, 8]
    const shuffled = rng.shuffle(source)
    expect(shuffled).not.toBe(source)
    expect([...shuffled].sort((a, b) => a - b)).toEqual(source)
    expect(source).toEqual([1, 2, 3, 4, 5, 6, 7, 8]) // ورودی دست‌نخورده
  })

  it('sample بدون تکرار و به تعداد درخواست است', () => {
    const rng = new SeededRandom(77)
    const source = Array.from({ length: 10 }, (_, i) => i)
    const sample = rng.sample(source, 4)
    expect(sample).toHaveLength(4)
    expect(new Set(sample).size).toBe(4)
    sample.forEach((v) => expect(source).toContain(v))
    expect(() => rng.sample(source, 11)).toThrow(RangeError)
  })

  it('دو نمونه مستقل از یک seed یکسان، انتخاب‌های یکسان دارند', () => {
    const run = () => {
      const rng = new SeededRandom(2024)
      return [
        rng.int(0, 99),
        rng.pick(['x', 'y', 'z']),
        rng.sample([1, 2, 3, 4, 5], 2),
        rng.bool(0.75),
      ]
    }
    expect(run()).toEqual(run())
  })
})
