import type { ProgramExerciseEntry } from './types'

/**
 * تخمین مدت جلسه هر بازی (دقیقه) برای بودجه‌بندی برنامه روزانه.
 *
 * فرمول: plannedTrials × ثانیه‌های هر مرحله + سربار ثابت جلسه، گرد به بالا
 * (محافظه‌کارانه — بیش‌برآورد به کم‌برآورد ترجیح دارد).
 *
 * ثانیه‌های هر مرحله از پارامترهای زمانی موتورها (زمان محرک، فاصله بین‌محرکی،
 * پنجره پاسخ و بازخورد) در میانه سطح‌ها تخمین زده شده و مستند است. سربار ثابت
 * شامل خواندن دستورالعمل، شمارش معکوس ۳ ثانیه‌ای و صفحه نتایج است.
 *
 * سقف ۱۵–۲۰ دقیقه برای جلسه روزانه مطابق قواعد طراحی سند
 * docs/SCIENTIFIC-VALIDATION.md (بازه توصیه‌شده ادبیات تمرین شناختی).
 */

/** سربار ثابت هر جلسه: دستورالعمل + شمارش معکوس + صفحه نتایج (ثانیه) */
export const SESSION_OVERHEAD_SECONDS = 90

/** ثانیه‌های هر مرحله برای بازی‌های ناشناخته (بازی‌های آینده Registry) */
export const DEFAULT_TRIAL_SECONDS = 10

/**
 * ثانیه‌های تقریبی هر مرحله بر اساس پارامترهای زمانی موتور هر بازی.
 * کلیدها همان id تمرین‌ها در src/modules/index.ts هستند.
 */
export const TRIAL_SECONDS_BY_EXERCISE: Readonly<Record<string, number>> = {
  // نمایش ارقام (~۳ رقم × ~۱ ثانیه + فاصله) + ورود پاسخ + بازخورد
  'number-sequence': 10,
  // محرک + فاصله بین‌محرکی ≈ ۳ ثانیه در هر مرحله
  'n-back': 3,
  // محرک + فاصله (مجموعاً ~۱٫۴ تا ۱٫۹ ثانیه بسته به سطح)
  'go-no-go': 2,
  // محرک رنگ‌واژه + پاسخ انتخابی + بازخورد
  'stroop': 5,
  // سؤال روان‌حسابی + تایپ پاسخ عددی
  'calculation-20': 10,
  // فاز حفظ (~۲ ثانیه) + بازیابی خانه‌ها + بازخورد
  'memorise-grid': 11,
  // نمایش توالی + بازسازی ترتیب + بازخورد
  'spatial-sequence': 11,
  // جیتر انتظار محرک + پنجره پاسخ
  'reaction-time': 4,
  // نمایش فهرست واژه‌ها + بازشناسی از میان دو برابر گزینه
  'word-memory': 25,
  // خواندن جمله + شمارش هجا + ورود عدد
  'syllable-counting': 14,
  // کشف قاعده توالی + انتخاب گزینه
  'sequence-logic': 14,
  // تحلیل ماتریس + انتخاب گزینه
  'pattern-completion': 14,
  // موج ۴ — سؤال سریع + فلش کوتاه (~۰٫۵تا۱ ثانیه) + تایپ پاسخ
  'calculation-100': 4,
  // نمایش عدد شروع + توالی گام‌ها + ورود باقیمانده نهایی
  'continuous-countdown': 12,
  // خواندن معادله + انتخاب عملگر + بازخورد
  'missing-operator': 4,
  // پنجره پاسخ کوتاه + بازخورد انتخاب
  'number-comparison': 3,
}

/** تخمین مدت جلسه یک بازی به دقیقه — گرد به بالا */
export function estimateExerciseMinutes(entry: ProgramExerciseEntry): number {
  const perTrialSeconds = TRIAL_SECONDS_BY_EXERCISE[entry.exerciseId] ?? DEFAULT_TRIAL_SECONDS
  return Math.ceil((entry.plannedTrials * perTrialSeconds + SESSION_OVERHEAD_SECONDS) / 60)
}
