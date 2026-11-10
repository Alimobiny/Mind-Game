/**
 * سرویس زمان‌سنج جلسه — مبنای همه اندازه‌گیری‌های زمانی.
 *
 * اصول:
 *  - زمان پاسخ با performance.now() اندازه‌گیری می‌شود نه Date.now()
 *    (ساعت دیواری با تغییر ساعت دستگاه جابه‌جا می‌شود).
 *  - زمان‌های PAUSE در elapsed حساب نمی‌شوند؛ یعنی مخفی‌کردن tab
 *    نتیجه را خراب نمی‌کند.
 *  - clock قابل تزریق است تا تست‌ها بدون setTimeout واقعی قطعی باشند.
 */

/** ساعت یکنوا؛ میلی‌ثانیه صعودی برمی‌گرداند */
export type Clock = () => number

export function performanceClock(): number {
  return performance.now()
}

type TimerStatus = 'idle' | 'running' | 'paused' | 'stopped'

export class SessionTimer {
  private readonly clock: Clock
  private status: TimerStatus = 'idle'
  /** مجموع زمان فعالِ قطع‌شده قبل از بازه جاری */
  private accumulatedMs = 0
  /** شروع بازه فعال جاری (به ساعت تزریقی) */
  private segmentStart = 0

  constructor(clock: Clock = performanceClock) {
    this.clock = clock
  }

  get isRunning(): boolean {
    return this.status === 'running'
  }

  get currentStatus(): TimerStatus {
    return this.status
  }

  /** شروع سنجش؛ فقط یک‌بار قابل اجراست */
  start(): void {
    if (this.status !== 'idle') {
      throw new Error(`start در وضعیت ${this.status} مجاز نیست`)
    }
    this.status = 'running'
    this.segmentStart = this.clock()
  }

  /** توقف موقت؛ زمان بازه جاری به accumulated اضافه می‌شود */
  pause(): void {
    this.ensureRunning('pause')
    this.accumulatedMs += this.clock() - this.segmentStart
    this.status = 'paused'
  }

  /** ادامه پس از توقف؛ بازه فعال جدید باز می‌شود */
  resume(): void {
    if (this.status !== 'paused') {
      throw new Error(`resume در وضعیت ${this.status} مجاز نیست`)
    }
    this.segmentStart = this.clock()
    this.status = 'running'
  }

  /** پایان سنجش؛ زمان کل فعال را برمی‌گرداند و تایمر را قفل می‌کند */
  stop(): number {
    this.ensureRunning('stop')
    const total = this.accumulatedMs + (this.clock() - this.segmentStart)
    this.accumulatedMs = total
    this.status = 'stopped'
    return total
  }

  /** زمان فعال سپری‌شده تا لحظه حال (بدون pauseها) */
  elapsedMs(): number {
    if (this.status === 'running') {
      return this.accumulatedMs + (this.clock() - this.segmentStart)
    }
    return this.accumulatedMs
  }

  /**
   * «الان» تایمر — برای محاسبه زمان پاسخ:
   * rt = timer.now() هنگام پاسخ منهای timer.now() هنگام نمایش محرک.
   */
  now(): number {
    return this.elapsedMs()
  }

  private ensureRunning(operation: string): void {
    if (this.status !== 'running') {
      throw new Error(`${operation} فقط در وضعیت running مجاز است (وضعیت فعلی: ${this.status})`)
    }
  }
}
