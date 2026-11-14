/**
 * قلاب‌های E2E — فقط در build توسعه/تست (dev server) رندر می‌شوند.
 * e2e روی `npm run dev` اجرا می‌شود پس انتخابگرها سالم می‌مانند؛ در build
 * تولیدی DOM پاسخ را نشت نمی‌دهد (تقلب با devtools ممکن نمی‌شود —
 * GAMES-AUDIT §۲-۵).
 */
export const E2E_DEV = import.meta.env.DEV

/** مقدار قلاب data-* — در تولید undefined (حذف اتریبیوت) */
export function e2e<T>(value: T): T | undefined {
  return E2E_DEV ? value : undefined
}
