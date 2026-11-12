import { expect, test } from '@playwright/test'
import { startExercise, waitForResults, waitProgressAdvance } from './helpers'
import { trackPageErrors } from './qa-helpers'

/**
 * E2E موج ششم — سه بازی جدید: ان-بک دوگانه، پاسات، حافظهٔ انجمنی.
 * همهٔ جلسه‌ها کامل اجرا می‌شوند؛ سنکرون پیشروی با data-trial-index.
 */

test.describe('Dual N-Back', () => {
  test('۲۴ مرحله: تطبیق حرف و مکان بر اساس صفات هدف', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await startExercise(page, 'ان-بک دوگانه', 1)

    let progress = 0
    for (let i = 0; i < 24; i++) {
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
    expect(getErrors(), 'بدون خطای صفحه در ۲۴ مرحلهٔ دوگانه').toEqual([])
  })
})

test.describe('PASAT', () => {
  test('۲۰ رقم: ورود جمع دو رقم متوالی (data-expected)', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await startExercise(page, 'جمع زنجیره‌ای گام‌دار', 1)

    const FA = '۰۱۲۳۴۵۶۷۸۹'
    let progress = 0
    for (let i = 0; i < 20; i++) {
      const display = page.getByTestId('pasat-display')
      await expect(display).toBeVisible({ timeout: 15_000 })
      const expectedAttr = (await display.getAttribute('data-expected')) ?? ''
      if (expectedAttr === '') {
        // رقم اول: فقط تماشا — پیشروی با انقضای ریتم
        progress = await waitProgressAdvance(page, progress)
        continue
      }
      for (const ch of expectedAttr) {
        await page
          .getByRole('button', { name: FA[Number(ch)] as string, exact: true })
          .click()
      }
      await page.getByTestId('pasat-submit').click()
      progress = await waitProgressAdvance(page, progress)
    }

    await waitForResults(page)
    expect(getErrors(), 'بدون خطای صفحه در ۲۰ رقم پاسات').toEqual([])
  })
})

test.describe('Associative Pairs', () => {
  test('مطالعه خودکار + آزمون انتخاب درست + (سطح ۱: بدون بازآزمون)', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await startExercise(page, 'حافظهٔ انجمنی', 1)

    // سطح ۱: ۴ جفت مطالعه (خودکار) + ۴ آزمون = ۸ مرحله
    let progress = 0
    for (let i = 0; i < 8; i++) {
      const study = page.getByTestId('ap-study')
      const isStudy = await study.isVisible().catch(() => false)
      if (isStudy) {
        await expect(study).toBeVisible()
        // مطالعه با انقضای پنجره خودکار پیش می‌رود
        progress = await waitProgressAdvance(page, progress)
      } else {
        const option = page.locator('[data-testid="ap-option"][data-correct="true"]')
        await expect(option).toBeVisible({ timeout: 15_000 })
        await option.click()
        progress = await waitProgressAdvance(page, progress)
      }
    }

    await waitForResults(page)
    expect(getErrors(), 'بدون خطای صفحه در جلسهٔ انجمنی').toEqual([])
  })
})
