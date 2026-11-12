import { expect, type Page } from '@playwright/test'

/** ابزارهای مشترک E2E — آغاز بازی، تبدیل ارقام فارسی، پارس سؤال */

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹'

/** تبدیل رشته ارقام فارسی به عدد */
export function faToNumber(text: string): number {
  return [...text].reduce((acc, ch) => {
    const i = FA_DIGITS.indexOf(ch)
    return i === -1 ? acc : acc * 10 + i
  }, 0)
}

/** شروع یک بازی از صفحه اصلی تا ورود به فاز ACTIVE */
export async function startExercise(
  page: Page,
  exerciseName: string,
  difficulty = 1,
): Promise<void> {
  await page.goto('/')
  // دسترسی سریع: بازی از نوار جستجوی خانه (فهرستِ تاشو، بازی‌ها لزوماً باز نیستند)
  await page.getByTestId('game-search').fill(exerciseName)
  await page.getByRole('link', { name: new RegExp(exerciseName) }).click()
  // انتخاب سطح دشواری (رادیو) — دکمه‌های سطح با متن رقمی فارسی
  await page.getByRole('radio', { name: FA_DIGITS[difficulty] as string, exact: true }).click()
  await page.getByRole('button', { name: 'ادامه' }).click()
  await expect(page.getByTestId('instructions')).toBeVisible()
  await page.getByRole('button', { name: 'شروع تمرین' }).click()
  // عبور از شمارش معکوس ۳ ثانیه‌ای و ورود به فاز ACTIVE
  await waitForActive(page)
}

/** انتظار برای ورود به فاز اجرای فعال */
export async function waitForActive(page: Page): Promise<void> {
  await expect(page.locator('section[data-phase="ACTIVE"]')).toBeVisible({ timeout: 20_000 })
}

/** انتظار برای صفحه نتایج (پایان جلسه) */
export async function waitForResults(page: Page): Promise<void> {
  await expect(page.getByTestId('results')).toBeVisible({ timeout: 120_000 })
}

/**
 * انتظار برای رندر مرحلهٔ بعدی — همگام‌سازی مقاوم هر مرحله، از طریق صفت
 * `data-trial-index` روی section اصلی بازی (GameShell).
 *
 * چرا نه «تغییر متن محرک»؟ موتور می‌تواند دو محرک یکسان پشت‌سرهم تولید کند
 * (معادلهٔ تکراری عملگر گم‌شده، رنگ جوهر تکراری استرووپ) — متن هرگز عوض
 * نمی‌شود و تست به‌نادرست تایم‌اوت می‌خورد.
 *
 * چرا نه متن/aria-label هدر؟ عنوان بازی می‌تواند رقم داشته باشد («محاسبه ×
 * ۱۰۰») و answerdTrials هم فقط «ثبت پاسخ» را نشان می‌دهد نه «رندر مرحلهٔ بعدی»
 * را — بازی‌های دارای فلش بازخورد (×۱۰۰) مرحلهٔ بعد را با تأخیر رندر می‌کنند
 * و تایپِ پیش از رندر در پنجرهٔ بازخورد قفل می‌شود. trialIndex دقیقاً با رندر
 * مرحلهٔ جدید زیاد می‌شود.
 *
 * توجه: predicate در زمینهٔ مرورگر اجرا می‌شود؛ ثابت‌های سمت Node در آن
 * قابل ارجاع نیستند.
 *
 * @returns شاخص مرحلهٔ جدید (prev + 1)
 */
export async function waitProgressAdvance(page: Page, prev: number): Promise<number> {
  await page.waitForFunction(
    (prevCount) => {
      if (document.querySelector('[data-testid="results"]')) return true
      const attr = document
        .querySelector('section[data-phase]')
        ?.getAttribute('data-trial-index')
      if (attr === null || attr === undefined) return false
      const num = Number(attr)
      return Number.isFinite(num) && num > prevCount
    },
    prev,
    { timeout: 20_000 },
  )
  return prev + 1
}
