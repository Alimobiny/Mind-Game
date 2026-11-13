import { expect, test } from '@playwright/test'
import { startExercise, waitForResults, waitProgressAdvance } from './helpers'
import { trackPageErrors } from './qa-helpers'

/**
 * E2E موج نهم — سه بازی از سند پژوهش پیشرفته: تداخل مکانی (سایمون)،
 * پلک توجه (RSVP)، دهانهٔ جاری. همهٔ جلسه‌ها کامل اجرا می‌شوند.
 *
 * نکتهٔ سایمون: پاسخ درست همیشه «دکمهٔ هم‌رنگِ محرک» است؛ تست رنگ صحنه را
 * می‌خواند و دکمهٔ همان رنگ را می‌زند — مستقل از جهت/سازگاری. اگر تاخیر
 * تست از پنجرهٔ پاسخ بگذرد، مرحله به‌صورت بی‌پاسخ پیش می‌رود و حلقه
 * هم‌چنان سالم می‌ماند (پیشروی با data-trial-index سنکرون است).
 */

const FA = '۰۱۲۳۴۵۶۷۸۹'

test.describe('تداخل مکانی (Simon)', () => {
  test('۴۰ مرحله: پاسخ فقط بر اساس رنگ محرک', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await startExercise(page, 'تداخل مکانی', 1)

    let progress = 0
    for (let i = 0; i < 40; i += 1) {
      const stage = page.getByTestId('simon-stage')
      await expect(stage).toBeVisible({ timeout: 15_000 })
      const color = (await stage.getAttribute('data-color')) ?? ''
      expect(['blue', 'red']).toContain(color)
      await page.locator(`[data-testid="simon-button"][data-color="${color}"]`).click()
      progress = await waitProgressAdvance(page, progress)
    }

    await waitForResults(page)
    expect(getErrors(), 'بدون خطای صفحه در تداخل مکانی').toEqual([])
  })
})

test.describe('پلک توجه', () => {
  test('۱۲ جریان: انتخاب هر دو هدف رنگی از جدول حروف', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await startExercise(page, 'پلک توجه', 1)

    let progress = 0
    for (let i = 0; i < 12; i += 1) {
      // جریان RSVP خودش می‌گذرد (~۲٫۷ث) — تا جدول بازیابی صبر
      const recall = page.getByTestId('ab-recall')
      await expect(recall).toBeVisible({ timeout: 30_000 })
      const t1 = (await recall.getAttribute('data-t1')) ?? ''
      const t2 = (await recall.getAttribute('data-t2')) ?? ''
      expect(t1.length).toBeGreaterThan(0)
      expect(t2.length).toBeGreaterThan(0)
      expect(t1).not.toBe(t2)
      await page.locator(`[data-testid="ab-option"][data-letter="${t1}"]`).click()
      await page.locator(`[data-testid="ab-option"][data-letter="${t2}"]`).click()
      await page.getByTestId('ab-submit').click()
      progress = await waitProgressAdvance(page, progress)
    }

    await waitForResults(page)
    expect(getErrors(), 'بدون خطای صفحه در پلک توجه').toEqual([])
  })
})

test.describe('دهانهٔ جاری', () => {
  test('۱۰ جریان: ورود آخرین ارقام پس از توقف ناگهانی', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await startExercise(page, 'دهانهٔ جاری', 1)

    let progress = 0
    for (let i = 0; i < 10; i += 1) {
      // نمایش ۷ تا ۱۲ رقم (~۶-۱۱ث) — تا فاز ورود صبر
      const input = page.getByTestId('rs-input')
      await expect(input).toBeVisible({ timeout: 30_000 })
      const tail = ((await input.getAttribute('data-expected-tail')) ?? '').split(',')
      expect(tail.length).toBeGreaterThanOrEqual(3)
      expect(tail.length).toBeLessThanOrEqual(5)
      for (const digit of tail) {
        await page.getByRole('button', { name: FA[Number(digit)] as string, exact: true }).click()
      }
      await page.getByTestId('rs-submit').click()
      progress = await waitProgressAdvance(page, progress)
    }

    await waitForResults(page)
    expect(getErrors(), 'بدون خطای صفحه در دهانهٔ جاری').toEqual([])
  })
})
