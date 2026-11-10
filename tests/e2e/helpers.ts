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
