/**
 * نردبان استاندارد «تعداد مراحل × سطح دشواری» برای همهٔ بازی‌ها.
 *
 * تا نشست ۱۵ تعداد مراحل تقریباً در همهٔ موتورها یک ثابت بود که با سطح
 * دشواری تغییر نمی‌کرد؛ این جدول قاعدهٔ واحد را تعریف می‌کند:
 *  - سطح ۱ = مقدار پایهٔ فعلی بازی (لنگر؛ همان plannedTrials متا)؛
 *  - سطح ۵ ≈ ۱٫۵ برابر؛ سطوح میانی با ضرایب [۱٫۰۰، ۱٫۱۲۵، ۱٫۲۵، ۱٫۳۷۵، ۱٫۵]
 *    و گرد به عدد صحیح.
 *  - استثناهای دستی: بازی‌های پرمصرف زمانی (خوانش، بلوک‌شماری) نردبان
 *    ملایم‌تری دارند تا سقف مدت جلسه معقول بماند؛ برای دو اسپن پیچیده
 *    واحد نردبان «دسته» است نه محرک.
 *
 * اعمال: createExerciseConfig (modules/index.ts) مقدار این جدول را روی فیلد
 * شمارش config می‌نویسد؛ برای اسپن‌ها به‌صورت پارامتر تعداد دسته به خود موتور
 * می‌رسد. نگهبان هم‌راستایی: registry-invariants.test.ts.
 *
 * بازی‌های «موتور-مولف» (ENGINE_AUTHORED) تعداد مرحله را خود موتور از ساختار
 * جلسه می‌سازد (بلوک‌های حافظهٔ انجمنی) یا تعداد در نام بازی قفل است (محاسبهٔ
 * ۲۰/۱۰۰) — روی آن‌ها override اعمال نمی‌شود و جدول فقط آینهٔ واقعیت برای
 * نمایش و بودجه‌بندی است.
 */

/** ضریب نردبان بر حسب سطح ۱..۵ — سند مرجع گردکردن اعداد جدول */
export const STAGE_MULTIPLIERS: readonly number[] = [1, 1.125, 1.25, 1.375, 1.5]

/**
 * نردبان‌های اعمال‌شونده — سطح ۱ = پایهٔ فعلی، سطح ۵ ≤ ۱٫۵×.
 * واحد دو اسپن (operation-span / symmetry-span) «دسته» است.
 */
export const STAGE_COUNTS_BY_DIFFICULTY: Readonly<Record<string, readonly number[]>> = {
  // حافظهٔ کاری
  'number-sequence': [10, 11, 12, 14, 15],
  'n-back': [25, 28, 31, 34, 38],
  'dual-n-back': [24, 27, 30, 33, 36],
  'dual-n-back-auditory': [24, 27, 30, 33, 36],
  'running-span': [10, 11, 12, 14, 15],
  'operation-span': [3, 4, 4, 5, 5], // واحد = دسته
  // سرعت پردازش
  pasat: [20, 22, 25, 28, 30],
  'continuous-countdown': [10, 11, 12, 14, 15],
  'missing-operator': [20, 22, 25, 28, 30],
  'number-comparison': [36, 40, 45, 50, 54],
  // کنترل توجه
  'go-no-go': [40, 45, 50, 55, 60],
  stroop: [20, 22, 25, 28, 30],
  'task-switching': [40, 45, 50, 55, 60],
  'simon-task': [40, 45, 50, 55, 60],
  'attentional-blink': [12, 14, 15, 17, 18],
  // حافظهٔ بلندمدت و کلامی-شنیداری
  'word-memory': [6, 7, 8, 8, 9],
  'syllable-counting': [12, 14, 15, 17, 18],
  'word-blend': [12, 14, 15, 17, 18],
  'word-scramble': [12, 14, 15, 17, 18],
  'audio-recall': [6, 7, 8, 8, 9],
  // خوانش ~۷۵ث/مرحله — دستی و ملایم‌تر از ۱٫۵× تا سقف مدت معقول بماند
  'reading-aloud': [3, 4, 4, 4, 4],
  // دیداری-فضایی
  'memorise-grid': [10, 11, 12, 14, 15],
  'spatial-sequence': [10, 11, 12, 14, 15],
  'object-tracking': [8, 9, 10, 11, 12],
  'mental-rotation': [16, 18, 20, 22, 24],
  'mirror-clock': [12, 14, 15, 17, 18],
  'change-detection': [16, 18, 20, 22, 24],
  'symmetry-span': [3, 4, 4, 5, 5], // واحد = دسته
  // بلوک‌شماری ~۲۵ث/مرحله — دستی و ملایم‌تر از ۱٫۵×
  'block-height': [12, 13, 14, 15, 16],
  // استدلال
  'sequence-logic': [12, 14, 15, 17, 18],
  'pattern-completion': [12, 14, 15, 17, 18],
  'progressive-matrices': [12, 14, 15, 17, 18],
  'rule-discovery-card-sorting': [36, 40, 45, 50, 54],
  // حسی-حرکتی
  'reaction-time': [10, 11, 12, 14, 15],
}

/**
 * بازی‌هایی که تعداد مرحله را موتور خودش تعیین می‌کند — override اعمال
 * نمی‌شود؛ این آینه فقط برای نمایش «مراحل/مدت» و بودجهٔ برنامه روزانه است.
 */
export const ENGINE_AUTHORED_STAGE_COUNTS: Readonly<Record<string, readonly number[]>> = {
  // بلوک‌های مطالعه/آزمون/یادآوری: pairCount × (۲ یا ۳) — موتور مولف است
  'associative-pairs': [8, 10, 18, 21, 24],
  // تعداد در نام بازی قفل است؛ دشواری از راه عملوندها و زمان‌بندی می‌آید
  'calculation-20': [20, 20, 20, 20, 20],
  'calculation-100': [100, 100, 100, 100, 100],
}

/** اندیس سطح در نردبان — سطوح خارج از بازه به نزدیک‌ترین لبه می‌چسبند */
function ladderIndex(difficulty: number, length: number): number {
  return Math.min(Math.max(difficulty - 1, 0), length - 1)
}

/**
 * تعداد مرحله‌ای که createExerciseConfig باید روی config اعمال کند.
 * null یعنی بازی در سیاست نیست و موتور مقدار خودش را می‌سازد
 * (بازی‌های موتور-مولف و بازی‌های آیندهٔ فاقد نردبان).
 */
export function policyStageCount(exerciseId: string, difficulty: number): number | null {
  const ladder = STAGE_COUNTS_BY_DIFFICULTY[exerciseId]
  if (ladder === undefined) return null
  return ladder[ladderIndex(difficulty, ladder.length)] as number
}

/**
 * تعداد مرحلهٔ استاندارد برای نمایش و بودجه‌بندی — هر دو جدول را می‌بیند و
 * برای بازی‌های ناشناخته به plannedTrials متا (اگر داده شود) برمی‌گردد.
 */
export function standardStageCount(
  exerciseId: string,
  difficulty: number,
  fallbackPlannedTrials?: number,
): number {
  const ladder = STAGE_COUNTS_BY_DIFFICULTY[exerciseId] ?? ENGINE_AUTHORED_STAGE_COUNTS[exerciseId]
  if (ladder === undefined) return fallbackPlannedTrials ?? 0
  return ladder[ladderIndex(difficulty, ladder.length)] as number
}
