import type { CognitiveDomain } from './domain'
import type { ExerciseSummary } from './summary'

/** تنظیمات پایه هر جلسه؛ هر بازی می‌تواند فیلدهای خودش را اضافه کند. */
export interface ExerciseConfig {
  /** سطح دشواری ۱..۵ — در MVP فقط Fixed */
  readonly difficulty: number
}

/**
 * نتیجه ارزیابی یک مرحله؛ هم در State بازی می‌ماند و هم مبنای
 * ثبت TrialEvent خام در لایه ذخیره‌سازی است.
 */
export type TrialOutcome =
  /** پاسخ درست داده شد */
  | 'correct'
  /** پاسخ غلط داده شد */
  | 'incorrect'
  /** جایی که پاسخ لازم بود پاسخی داده نشد (timeout/بی‌واکنشی) */
  | 'omission'
  /** جایی که باید پاسخ مهار می‌شد، پاسخ داده شد (خطای commission) */
  | 'commission'

export function outcomeIsCorrect(outcome: TrialOutcome): boolean {
  return outcome === 'correct'
}

/** رکورد کامل یک مرحله پاسخ‌داده‌شده — داده خام، بدون تجمیع. */
export interface RecordedTrial {
  readonly trialIndex: number
  /** محرک مرحله به شکل serialize-friendly (JSON) */
  readonly stimulus: unknown
  readonly expected: unknown
  readonly given: unknown | null
  readonly outcome: TrialOutcome
  readonly correct: boolean
  readonly reactionTimeMs: number | null
}

/** State پایه‌ای که State هر بازی باید از آن ارث‌بری کند. */
export interface ExerciseState<
  TConfig extends ExerciseConfig = ExerciseConfig,
  TRecord extends RecordedTrial = RecordedTrial,
> {
  readonly sessionId: string
  readonly config: TConfig
  readonly seed: number
  /** شماره مرحله بعدی که باید تولید شود (۰-محور) */
  readonly nextTrialIndex: number
  /** محرک مرحله جاری — پیش از اولین nextTrial مقدار ندارد */
  readonly currentTrial: unknown | null
  /** نتایج ثبت‌شده تا کنون (به ترتیب اجرا) */
  readonly results: readonly TRecord[]
}

/** Trial پایه؛ هر بازی فیلدهای محرک خودش را اضافه می‌کند. */
export interface ExerciseTrial {
  readonly trialIndex: number
  /**
   * مهلت پاسخ از لحظه نمایش محرک (میلی‌ثانیه).
   * null = بی‌مهلت (بازی‌های غیرزمانی مثل Calculation × 20).
   * توجه: SessionManager خودش تایمر مهلتی ندارد — مسئولیت اجرای مهلت با
   * کامپوننت بازی است که timeRemainingMs را چک و در انقضا submitAnswer با
   * answer=null می‌زند (الگوی رایج در کامپوننت‌های بازی ببینید).
   */
  readonly responseWindowMs: number | null
}

/**
 * قرارداد مشترک تمام تمرین‌ها (Exercise Definition Contract).
 *
 * پیاده‌سازی‌ها باید خالص (pure) و مستقل از React باشند:
 * هیچ DOM، تایمر واقعی یا فراخوانی شبکه در این لایه انجام نمی‌شود.
 * زمان سنجی به‌صورت reactionTimeMs از بیرون تزریق می‌شود تا تست‌ها
 * قطعی باشند.
 */
export interface ExerciseDefinition<
  TConfig extends ExerciseConfig = ExerciseConfig,
  TState extends ExerciseState<TConfig> = ExerciseState<TConfig>,
  TTrial extends ExerciseTrial = ExerciseTrial,
  TAnswer = unknown,
> {
  readonly id: string
  /** نسخه منطق/الگوریتم بازی (semantic version) */
  readonly version: string
  /** نسخه محتوای محرک‌ها (مثلاً بانک سؤالات) */
  readonly contentVersion: string
  readonly domain: CognitiveDomain

  createSession(sessionId: string, config: TConfig, seed: number): TState

  /**
   * تولید مرحله بعدی. باید فقط وقتی صدا زده شود که مرحله قبلی
   * پاسخ داده شده باشد؛ در غیر این صورت خطا می‌دهد (جلوگیری از
   * گم‌شدن پاسخ‌ها).
   */
  nextTrial(state: TState): { state: TState; trial: TTrial }

  /**
   * ثبت پاسخ مرحله جاری.
   * answer === null یعنی «بدون پاسخ» (انقضای مهلت) تا omissionها هم
   * در داده خام ثبت شوند.
   */
  submitAnswer(state: TState, answer: TAnswer | null, reactionTimeMs: number): TState

  isComplete(state: TState): boolean

  /** خروجی استاندارد پایان جلسه — معیارهای اختصاصی داخل metrics */
  getSummary(state: TState): ExerciseSummary
}
