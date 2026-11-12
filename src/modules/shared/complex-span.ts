/**
 * اسکلت مشترک «دهانهٔ مرکب» — پیشنهادهای ۲ و ۳ سند پژوهش
 * (دهانهٔ عملیاتی و دهانهٔ تقارن).
 *
 * ساختار هر دسته (مرحله): چند زوجِ «پردازش مزاحم + رمزآوری» پشت‌سرهم و سپس
 * یک فاز بازیابی ترتیبی. طبق نگاشت مصوب سند، کل پاسخ دسته — آرایهٔ قضاوت‌های
 * پردازش و آیتم‌های بازیابی‌شده — در یک submitAnswer ثبت می‌شود
 * (قرارداد یک-submit-per-trial؛ الگوی ان-بک دوگانه).
 *
 * امتیاز «اعتبار جزئی» استاندارد پژوهش دهانهٔ مرکب است: هر آیتمی که در همان
 * جایگاه ترتیبی درست بازیابی شود یک امتیاز می‌گیرد — دسته‌های نیمه‌کاره صفر
 * نمی‌شوند.
 */

/** نتیجهٔ تحلیل بازیابی یک دسته */
export interface SpanRecallScore {
  /** آیتم‌هایی که دقیقاً در جایگاه ترتیبی درست بازیابی شدند */
  readonly itemsInCorrectPosition: number
  /** آیتم‌های خودِ دسته که در جای غلط بازیابی شدند (تکرار هم اینجا می‌افتد) */
  readonly orderErrors: number
  /** آیتم‌های خارج از دسته — حواس‌پرتی یا خانهٔ نامربوط */
  readonly intrusionErrors: number
  /** طول درست دسته */
  readonly setLength: number
}

/**
 * تحلیل بازیابی ترتیبی یک دسته در برابر ترتیب درست.
 * خالی بودن expected فقط برای جلسه‌ای صفر-آیتمی رخ می‌دهد — همهٔ givenها
 * «تجاوز» شمرده می‌شوند.
 */
export function scoreSpanRecall<T>(expected: readonly T[], given: readonly T[]): SpanRecallScore {
  let itemsInCorrectPosition = 0
  let orderErrors = 0
  let intrusionErrors = 0
  for (let i = 0; i < given.length; i += 1) {
    const item = given[i] as T
    if (i < expected.length && item === expected[i]) {
      itemsInCorrectPosition += 1
    } else if (expected.includes(item)) {
      orderErrors += 1
    } else {
      intrusionErrors += 1
    }
  }
  return { itemsInCorrectPosition, orderErrors, intrusionErrors, setLength: expected.length }
}

/** آیا دسته کامل و به‌ترتیب بازیابی شد؟ */
export function isFullRecall(score: SpanRecallScore): boolean {
  return score.setLength > 0 && score.itemsInCorrectPosition === score.setLength
}

/**
 * امتیاز اعتبار جزئی کل جلسه (٪) — نسبت آیتم‌های درست در جای درست به کل
 * آیتم‌های همهٔ دسته‌ها؛ استاندارد گزارش پژوهش دهانهٔ مرکب.
 */
export function partialCreditUnitPercent(scores: readonly SpanRecallScore[]): number {
  const totalItems = scores.reduce((sum, s) => sum + s.setLength, 0)
  const totalCorrect = scores.reduce((sum, s) => sum + s.itemsInCorrectPosition, 0)
  if (totalItems === 0) return 0
  return Math.round((totalCorrect / totalItems) * 100)
}

/** نسبت دسته‌هایی که کامل و به‌ترتیب بازیابی شدند (٪) */
export function fullRecallSetPercent(scores: readonly SpanRecallScore[]): number {
  if (scores.length === 0) return 0
  const full = scores.filter((s) => isFullRecall(s)).length
  return Math.round((full / scores.length) * 100)
}

/**
 * آستانهٔ اعتبار جلسه — قرارداد پژوهشی دهانهٔ مرکب: اگر دقت تکلیفِ
 * پردازشِ مزاحم (محاسبه/تقارن) زیر این آستانه بیفتد، ظرفیت گزارش‌شده
 * معتبر نیست و جلسه باید «فاقد اعتبار» علامت بخورد.
 */
export const PROCESSING_GATE_PERCENT = 85

/** آیا دقت پردازش از آستانهٔ اعتبار جلسه پایین‌تر است؟ */
export function isProcessingGateFailed(processingAccuracyPercent: number): boolean {
  return processingAccuracyPercent < PROCESSING_GATE_PERCENT
}

/** پاسخ یک دستهٔ دهانهٔ مرکب — قضاوت‌های پردازش + بازیابی به ترتیب انتخاب */
export interface ComplexSpanSetAnswer<TMemory> {
  /** قضاوت هر زوج پردازش — null = بی‌پاسخ (انقضای پنجرهٔ همان زوج) */
  readonly processingJudgments: readonly (boolean | null)[]
  /** زمان واکنش هر قضاوت (میلی‌ثانیه) — null = بی‌پاسخ */
  readonly processingRtMs: readonly (number | null)[]
  /** آیتم‌های بازیابی‌شده به ترتیب انتخاب کاربر */
  readonly recalled: readonly TMemory[]
}
