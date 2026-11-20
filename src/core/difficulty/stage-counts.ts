/**
 * نردبان استاندارد «تعداد مراحل × سطح دشواری» برای همهٔ بازی‌ها.
 *
 * مبنای کالیبراسیون (نشست ۱۶، بازکالیبراسیون بر دادهٔ نظرسنجی کاربران):
 * نارضایتی از «ناهمگنی» تعداد مراحل + باند استاندارد بازی‌های تجاری
 * (Lumosity/Peak/Elevate: هر بازی ~۱ تا ۳ دقیقه؛ نشست ۵تایی/روز ۵-۱۵ دقیقه).
 * قاعدهٔ واحد: مدت تخمینی جلسه (مراحل × ثانیهٔ هر مرحله + سربار ۹۰ث) باید در
 * سطح ۱ داخل باند ۱٫۵-۳ دقیقه و در سطح ۵ حداکثر ~۴ دقیقه باشد؛ بازی‌هایی که
 * از قبل داخل باند بودند دست نخورده‌اند (تغییر حداقلی).
 *
 * فرمول سقف‌ها: L1 ≤ floor(90 / trialSec) و L5 ≤ floor(150 / trialSec)
 * (با ثانیه‌های هر مرحله از core/program/time-estimation.ts)، هموارشده به
 * پله‌های خوانا و با کفِ معناداری برای متریک‌ها. استثناهای مستند:
 *  - بلندخوانی: واحدِ متن ~۷۵ث است؛ ۲ متن = ۴ دقیقه (کفِ معناداری) — تنها
 *    تخطی از سقف ۳ دقیقه؛ گسترش از راه «تعداد دلخواه» ممکن است.
 *  - اسپن‌های پیچیده: واحد نردبان «دسته» است (دهانهٔ عملیاتی ۴۰ث، تقارن ۳۰ث).
 *  - حافظهٔ انجمنی: موتور-مولف است (بلوک مطالعه/آزمون/یادآوری).
 *
 * اعمال: createExerciseConfig (modules/index.ts) — مقدار سیاست روی فیلد شمارش
 * config بازنویسی می‌شود (یا برای اسپن‌ها به‌صورت تعداد دسته به موتور می‌رسد)؛
 * تعداد «دلخواه» کاربر (اگر ذخیره کرده) بر همهٔ این‌ها مقدم است. نگهبان:
 * registry-invariants.test.ts و تست باند همین ماژول.
 */

/** ضریب سقف مرحله در سطح ۵ نسبت به سطح ۱ — قاعدهٔ کلی گردکردن نردبان */
export const MAX_STAGE_MULTIPLIER = 1.5

/** سربار ثابت هر جلسه (ثانیه) — هم‌ارزش SESSION_OVERHEAD_SECONDS برنامهٔ روزانه */
export const STAGE_BAND_OVERHEAD_SECONDS = 90

/**
 * نردبان‌های استاندارد اعمال‌شونده (سطح ۱..۵).
 * واحد دو اسپن (operation-span / symmetry-span) «دسته» است نه محرک.
 */
export const STAGE_COUNTS_BY_DIFFICULTY: Readonly<Record<string, readonly number[]>> = {
  // حافظهٔ کاری
  'number-sequence': [9, 10, 11, 12, 13],
  'n-back': [25, 28, 31, 34, 38],
  'dual-n-back': [24, 27, 30, 33, 36],
  'dual-n-back-auditory': [24, 27, 30, 33, 36],
  'running-span': [5, 6, 6, 7, 7],
  'operation-span': [2, 2, 3, 3, 3], // واحد = دسته
  // سرعت پردازش
  pasat: [20, 22, 25, 28, 30],
  'continuous-countdown': [7, 8, 9, 10, 11],
  'missing-operator': [20, 22, 25, 28, 30],
  'number-comparison': [30, 34, 37, 41, 45],
  // کنترل توجه
  'go-no-go': [40, 45, 50, 55, 60],
  stroop: [18, 20, 23, 25, 27],
  'task-switching': [36, 40, 45, 50, 54],
  'simon-task': [40, 45, 50, 55, 60],
  'attentional-blink': [10, 11, 12, 14, 15],
  // حافظهٔ بلندمدت و کلامی-شنیداری
  'word-memory': [3, 4, 4, 5, 5],
  'syllable-counting': [6, 7, 8, 8, 9],
  'word-blend': [11, 12, 13, 15, 16],
  'word-scramble': [6, 7, 8, 8, 9],
  'audio-recall': [4, 5, 5, 5, 6],
  // واحد متن ~۷۵ث — کف معناداری ۲ متن؛ گسترش با تعداد دلخواه
  'reading-aloud': [2, 2, 2, 2, 2],
  // دیداری-فضایی
  'memorise-grid': [8, 9, 10, 11, 12],
  'spatial-sequence': [8, 9, 10, 11, 12],
  'object-tracking': [6, 7, 8, 8, 9],
  'mental-rotation': [15, 17, 19, 20, 22],
  'mirror-clock': [7, 8, 9, 9, 10],
  'change-detection': [15, 17, 19, 20, 22],
  'symmetry-span': [3, 3, 3, 4, 4], // واحد = دسته
  'block-height': [3, 3, 4, 4, 4],
  // استدلال
  'sequence-logic': [6, 7, 8, 8, 9],
  'pattern-completion': [6, 7, 8, 8, 9],
  'progressive-matrices': [6, 7, 8, 8, 9],
  'rule-discovery-card-sorting': [22, 24, 27, 30, 33],
  // حسی-حرکتی
  'reaction-time': [10, 11, 12, 14, 15],
  // محاسبه‌ها — پس از بازکالیبراسیون دیگر نام‌قفل نیستند و نردبان دارند؛
  // میراث نام (۲۰/۱۰۰) به‌عنوان سقف «تعداد دلخواه» زنده است (CUSTOM_MAX)
  'calculation-20': [9, 10, 11, 12, 13],
  'calculation-100': [22, 24, 27, 30, 33],
}

/**
 * بازی‌هایی که تعداد مرحله را موتور خودش از ساختار جلسه می‌سازد — override
 * اعمال نمی‌شود و تعداد دلخواه هم برایشان معنا ندارد؛ این آینه فقط برای
 * نمایش و بودجه‌بندی برنامه روزانه است.
 */
export const ENGINE_AUTHORED_STAGE_COUNTS: Readonly<Record<string, readonly number[]>> = {
  // بلوک‌های مطالعه/آزمون/یادآوری: ۴ جفت × (۲ یا ۳ بلوک) — موتور مولف است
  'associative-pairs': [8, 8, 8, 12, 12],
}

/** حداقل/حداکثر «تعداد دلخواه» — پیش‌فرض از نردبان مشتق می‌شود */
const CUSTOM_MAX_OVERRIDE: Readonly<Record<string, number>> = {
  // میراث نام: جلسهٔ کلاسیک ۲۰/۱۰۰تایی با تعداد دلخواه در دسترس می‌ماند
  'calculation-20': 20,
  'calculation-100': 100,
}

/** اندیس سطح در نردبان — سطوح خارج از بازه به نزدیک‌ترین لبه می‌چسبند */
function ladderIndex(difficulty: number, length: number): number {
  return Math.min(Math.max(difficulty - 1, 0), length - 1)
}

/**
 * تعداد مرحله‌ای که createExerciseConfig باید روی config اعمال کند.
 * null یعنی بازی در سیاست نیست و موتور مقدار خودش را می‌سازد
 * (بازی موتور-مولف و بازی‌های آیندهٔ فاقد نردبان).
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

/** آیا کاربر می‌تواند تعداد مرحلهٔ این بازی را خودش انتخاب کند؟ */
export function isStageCountCustomizable(exerciseId: string): boolean {
  return STAGE_COUNTS_BY_DIFFICULTY[exerciseId] !== undefined
}

/** محدودهٔ مجاز «تعداد دلخواه» — کف ۲؛ سقف ۱٫۵× بالاترین نردبان (یا override نام) */
export function stageCountBounds(exerciseId: string): { readonly min: number; readonly max: number } {
  const ladder = STAGE_COUNTS_BY_DIFFICULTY[exerciseId]
  const override = CUSTOM_MAX_OVERRIDE[exerciseId]
  if (ladder !== undefined && override !== undefined) {
    return { min: 2, max: override }
  }
  if (ladder !== undefined) {
    return { min: 2, max: Math.max(2, Math.round((ladder[ladder.length - 1] as number) * MAX_STAGE_MULTIPLIER)) }
  }
  return { min: 2, max: 2 }
}

/** تعداد دلخواه را به محدودهٔ مجاز می‌چسباند؛ بازی غیرقابل‌تنظیم → null */
export function clampCustomStageCount(
  exerciseId: string,
  requested: number | null | undefined,
): number | null {
  if (!isStageCountCustomizable(exerciseId) || requested === null || requested === undefined) {
    return null
  }
  const bounds = stageCountBounds(exerciseId)
  return Math.min(Math.max(Math.round(requested), bounds.min), bounds.max)
}

/**
 * پیش‌تنظیم‌های ردیف «تعداد مراحل» در صفحهٔ انتخاب سطح — کوتاه/استاندارد/بلند
 * حول مقدار استاندارد همان سطح؛ بلند هرگز از سقف مجاز رد نمی‌شود.
 */
export function stageCountPresets(
  exerciseId: string,
  difficulty: number,
): { readonly short: number; readonly standard: number; readonly long: number } {
  const standard = standardStageCount(exerciseId, difficulty, 0)
  const bounds = stageCountBounds(exerciseId)
  return {
    short: Math.min(Math.max(Math.round(standard * 0.7), bounds.min), standard),
    standard,
    long: Math.min(Math.max(Math.round(standard * 1.3), standard), bounds.max),
  }
}
