import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { fakeCompletedSession, trackPageErrors } from './qa-helpers'

/**
 * سناریو QA 5 — ایمپورت فایل‌های پشتیبان خراب/ناقص/نامرتبط در صفحه گزارش‌ها:
 * پیام خطای فارسی واضح، بدون کرش، داده‌های موجود دست‌نخورده.
 */

const VALID_SESSION = fakeCompletedSession({
  id: 'import-base-session',
  exerciseId: 'calculation-20',
  domain: 'processing-speed',
  difficulty: 1,
  accuracy: 100,
  startedAtMs: Date.now() - 3_600_000,
})

function validBackupJson(): string {
  return JSON.stringify({
    app: 'cognitive-training-lab',
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    sessions: [VALID_SESSION],
    trialEvents: [],
  })
}

/** ایمپورت با بافر درون‌خطی — بدون فایل موقت روی دیسک */
async function importBuffer(page: Page, name: string, data: string | Buffer): Promise<void> {
  await page.setInputFiles('input[type="file"]', {
    name,
    mimeType: 'application/json',
    buffer: typeof data === 'string' ? Buffer.from(data, 'utf-8') : data,
  })
}

/** پیام نتیجهٔ ایمپورت داخل بخش پشتیبان‌گیری (نه پاراگراف راهنمای ثابت) */
function importMessage(page: Page) {
  return page
    .getByRole('region', { name: 'پشتیبان‌گیری داده‌ها' })
    .locator('p')
    .filter({ hasNotText: 'پیشرفت شما فقط روی همین دستگاه' })
    .last()
}

test.describe('QA5: ایمپورت فایل پشتیبان خراب', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/reports')
    // داده موجود: یک پشتیبان معتبر با یک جلسه کامل
    await importBuffer(page, 'valid.json', validBackupJson())
    await expect(page.getByText(/بازیابی شد/)).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('جلسه کامل‌شده').first()).toBeVisible()
  })

  test('(الف) باینری خراب: پیام فارسی، بدون کرش، داده موجود سالم', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await importBuffer(page, 'corrupted.json', Buffer.from([0x00, 0xff, 0xfe, 0x89, 0x50, 0x4b, 0x03, 0x7f]))

    // پیام خطا باید فارسی و صریح باشد (نه پیام انگلیسی SyntaxError)
    const message = importMessage(page)
    await expect(message).toBeVisible({ timeout: 10_000 })
    await expect(message).toContainText('فایل پشتیبان JSON معتبر نیست')
    await expect(message).not.toContainText(/Unexpected token|SyntaxError|is not valid JSON/i)

    // صفحه زنده است و داده قبلی پابرجا
    await expect(page.getByText('جلسه کامل‌شده').first()).toBeVisible()
    await expect(page.getByText('محاسبه × ۲۰').first()).toBeVisible()
    expect(getErrors()).toEqual([])
  })

  test('(ب) JSON معتبر با ساختار غلط/کلیدهای غایب: پیام فارسی «ناقص»', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await importBuffer(
      page,
      'wrong-shape.json',
      JSON.stringify({ app: 'cognitive-training-lab', schemaVersion: 1, exportedAt: 'x' }),
    )
    await expect(page.getByText('فایل پشتیبان ناقص است')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('جلسه کامل‌شده').first()).toBeVisible()
    expect(getErrors()).toEqual([])
  })

  test('(ج) JSON معتبر اما نامرتبط: پیام فارسی «متعلق به این برنامه نیست»', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await importBuffer(page, 'unrelated.json', JSON.stringify({ foo: 'bar', list: [1, 2, 3] }))
    await expect(
      page.getByText('این فایل متعلق به آزمایشگاه تمرین شناختی نیست'),
    ).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('جلسه کامل‌شده').first()).toBeVisible()
    expect(getErrors()).toEqual([])
  })

  test('(د) JSON غیر-object (مثلاً آرایه): پیام فارسی، بدون کرش', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await importBuffer(page, 'array.json', JSON.stringify([1, 2, 3]))
    // آرایه هم object است؛ اولین چک «app» پیام فارسی «متعلق به این برنامه نیست» می‌دهد
    await expect(
      page.getByText('این فایل متعلق به آزمایشگاه تمرین شناختی نیست'),
    ).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('جلسه کامل‌شده').first()).toBeVisible()
    expect(getErrors()).toEqual([])
  })
})
