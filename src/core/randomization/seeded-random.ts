/**
 * مولد اعداد شبه‌تصادفی قطعی (mulberry32).
 *
 * همه محرک‌های بازی‌ها باید از همین کلاس با seed صریح ساخته شوند تا:
 *  - تست‌ها قطعی و تکرارپذیر باشند؛
 *  - هر جلسه با seed خودش بازتولیدپذیر بماند (seed در SessionRecord ثبت می‌شود).
 */
export class SeededRandom {
  private state: number

  constructor(seed: number) {
    // >>> 0 نرمال‌سازی به uint32 است؛ seed صفر هم مجاز است.
    this.state = seed >>> 0
  }

  /** عدد شناور در بازه [0, 1) */
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0
    let t = this.state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  /** عدد صحیح در بازه [minInclusive, maxInclusive] */
  int(minInclusive: number, maxInclusive: number): number {
    if (maxInclusive < minInclusive) {
      throw new RangeError(`maxInclusive (${maxInclusive}) نباید از minInclusive (${minInclusive}) کمتر باشد`)
    }
    return minInclusive + Math.floor(this.next() * (maxInclusive - minInclusive + 1))
  }

  /** مقدار بولی؛ pTrue احتمال true است (پیش‌فرض ۵۰٪) */
  bool(pTrue = 0.5): boolean {
    return this.next() < pTrue
  }

  /** انتخاب یک عنصر تصادفی از آرایه غیرخالی */
  pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error('pick روی آرایه خالی مجاز نیست')
    }
    return items[this.int(0, items.length - 1)] as T
  }

  /** انتخاب وزن‌دار؛ entries زوج‌های (مقدار، وزن مثبت) هستند */
  pickWeighted<T>(entries: readonly (readonly [T, number])[]): T {
    const totalWeight = entries.reduce((sum, [, w]) => sum + w, 0)
    if (totalWeight <= 0) {
      throw new Error('مجموع وزن‌ها باید مثبت باشد')
    }
    let threshold = this.next() * totalWeight
    for (const [value, weight] of entries) {
      threshold -= weight
      if (threshold < 0) return value
    }
    // از نظر ریاضی غیرقابل‌رسیدن؛ فقط برای رضایت نوع‌ها
    return entries[entries.length - 1][0]
  }

  /** جای‌به‌جایی Fisher-Yates — آرایه جدید برمی‌گرداند، ورودی دست‌نخورده می‌ماند */
  shuffle<T>(items: readonly T[]): T[] {
    const result = [...items]
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.int(0, i)
      const tmp = result[i] as T
      result[i] = result[j] as T
      result[j] = tmp
    }
    return result
  }

  /** نمونه‌گیری بدون تکرار (ترتیب خروجی تصادفی است) */
  sample<T>(items: readonly T[], count: number): T[] {
    if (count < 0 || count > items.length) {
      throw new RangeError(`count (${count}) باید بین 0 و طول آرایه (${items.length}) باشد`)
    }
    return this.shuffle(items).slice(0, count)
  }
}

/** تولید seed مناسب برای جلسه واقعی (غیر از تست) */
export function createRandomSeed(): number {
  const buffer = new Uint32Array(1)
  crypto.getRandomValues(buffer)
  return buffer[0] as number
}
