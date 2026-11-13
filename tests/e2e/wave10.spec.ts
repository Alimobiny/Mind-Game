import { expect, test } from '@playwright/test'
import { startExercise, waitForResults, waitProgressAdvance } from './helpers'
import { trackPageErrors } from './qa-helpers'

/**
 * E2E موج دهم — آخرین سه بازی سند پژوهش: تشخیص تغییر، ان-بک دوگانهٔ
 * شنیداری، ماتریس پیشرونده. همهٔ جلسه‌ها کامل اجرا می‌شوند.
 *
 * نکتهٔ شنیداری: ریتم ارائه تایمری و مستقل از صدای دستگاه است؛ در محیط
 * بدون صدای فارسی حرف‌ها به‌صورت دیداری نمایش می‌یابند و صفات هدف
 * (data-is-*-target) در هر دو حالت یکی‌اند — الگوی موج زبانی.
 */

test.describe('تشخیص تغییر', () => {
  test('۱۶ مرحله: دوداوری تغییر/عدم تغییر آرایهٔ رنگی', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await startExercise(page, 'تشخیص تغییر', 1)

    let progress = 0
    for (let i = 0; i < 16; i += 1) {
      // نمونه → خالی → آزمون؛ فقط فاز آزمون دکمه دارد
      const testGrid = page.locator('[data-testid="cd-grid"][data-phase="test"]')
      await expect(testGrid).toBeVisible({ timeout: 15_000 })
      const changed = (await testGrid.getAttribute('data-changed')) === 'true'
      await page.getByTestId(changed ? 'cd-yes' : 'cd-no').click()
      progress = await waitProgressAdvance(page, progress)
    }

    await waitForResults(page)
    expect(getErrors(), 'بدون خطای صفحه در تشخیص تغییر').toEqual([])
  })
})

test.describe('ان-بک دوگانهٔ شنیداری', () => {
  test('۲۴ مرحله: تطبیق حرف (شنیداری/دیداری) و مکان بر اساس صفات هدف', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await startExercise(page, 'ان-بک دوگانهٔ شنیداری', 1)

    let progress = 0
    for (let i = 0; i < 24; i += 1) {
      const letterArea = page.getByTestId('dnback-letter')
      await expect(letterArea).toBeVisible({ timeout: 15_000 })
      const isLetterTarget = (await letterArea.getAttribute('data-is-letter-target')) === 'true'
      const grid = page.getByTestId('dnback-grid')
      const isCellTarget = (await grid.getAttribute('data-is-cell-target')) === 'true'
      if (isLetterTarget) await page.getByTestId('dnback-letter-match').click()
      if (isCellTarget) await page.getByTestId('dnback-cell-match').click()
      // پیشروی با انقضای پنجرهٔ پاسخ خودکار است (submit یک‌تایی در ددلاین)
      progress = await waitProgressAdvance(page, progress)
    }

    await waitForResults(page)
    expect(getErrors(), 'بدون خطای صفحه در ان-بک دوگانهٔ شنیداری').toEqual([])
  })
})

test.describe('ماتریس پیشرونده', () => {
  test('۱۲ مرحله: انتخاب گزینهٔ برندهٔ همهٔ قواعد', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await startExercise(page, 'ماتریس پیشرونده', 1)

    let progress = 0
    for (let i = 0; i < 12; i += 1) {
      const matrix = page.getByTestId('pm-matrix')
      await expect(matrix).toBeVisible({ timeout: 15_000 })
      await page.locator('[data-testid="pm-option"][data-correct="true"]').click()
      progress = await waitProgressAdvance(page, progress)
    }

    await waitForResults(page)
    expect(getErrors(), 'بدون خطای صفحه در ماتریس پیشرونده').toEqual([])
  })
})
