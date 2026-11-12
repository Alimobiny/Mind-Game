/**
 * ابزارهای متن فارسی — نرمال‌سازی و شمارش واژه.
 *
 * نخستین نرمال‌ساز پروژه: تا پیش از این هیچ یکسان‌سازی نویسه‌ای وجود نداشت.
 * هدف، مقایسهٔ امنِ پاسخ کاربر با پاسخ موردانتظار است — نه ویرایش متن.
 */

/** اعراب و نشانه‌های قرآنی که در نوشتار روزمره حذف‌شدنی‌اند */
const DIACRITICS = /[\u064B-\u0652\u0670\u0653-\u0655\u0640]/g

/** نگاشت نویسه‌های عربی/variantها به شکل ایرانیِ رایج */
const CHAR_MAP: Readonly<Record<string, string>> = {
  'ي': 'ی', // ی عربی
  'ك': 'ک', // ک عربی
  'ﻻ': 'لا',
  'أ': 'ا',
  'إ': 'ا',
  'آ': 'ا', // برای مقایسه؛ نمایش اصلی دست‌نخورده می‌ماند
  'ٱ': 'ا',
  'ة': 'ه',
  'ؤ': 'و',
  'ئ': 'ی',
  'ٔ': '', // همزهٔ بالایی
  'ٰ': '',
}

/**
 * نرمال‌سازی برای مقایسه: ی/ک عربی → فارسی، حذف اعراب و کشیده،
 * یکسان‌سازی variantهای الف و همزه، حذف فاصله‌های تکراری و ابتدایی/انتهایی.
 * نیم‌فاصله (ZWNJ) حفظ می‌شود — جزء ساختاری واژه است.
 */
export function normalizePersian(text: string): string {
  let out = ''
  for (const ch of text) {
    out += CHAR_MAP[ch] ?? ch
  }
  return out
    .replace(DIACRITICS, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** آیا دو متن پس از نرمال‌سازی برابرند؟ */
export function persianEquals(a: string, b: string): boolean {
  return normalizePersian(a) === normalizePersian(b)
}

/**
 * شمارش واژه‌های یک متن فارسی: جداسازی با فاصله؛ نیم‌فاصله جزء واژه است
 * («می‌رود» = ۱ واژه). نشانه‌های سجاوندی انتها اثر ندارند.
 */
export function countPersianWords(text: string): number {
  const normalized = normalizePersian(text)
  if (normalized === '') return 0
  return normalized.split(' ').filter((w) => w.length > 0).length
}
