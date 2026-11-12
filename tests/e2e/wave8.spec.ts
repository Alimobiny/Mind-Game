import { expect, test } from '@playwright/test'
import { startExercise, waitForResults, waitProgressAdvance } from './helpers'
import { trackPageErrors } from './qa-helpers'

/**
 * E2E موج زبانی — چهار بازی کلامی/شنیداری: بلندخوانی، واژهٔ به‌هم‌ریخته،
 * یادآوری شنیداری، ترکیب واژه. همهٔ جلسه‌ها کامل اجرا می‌شوند؛ ریتم ارائهٔ
 * صوتی/نمایشی تایمری و مستقل از صدای دستگاه است، پس تست در هر دو حالت
 * یکسان می‌گذرد.
 */

test.describe('Reading Aloud', () => {
  test('۳ متن: خواندن خودتنظیم + پاسخ سؤال‌های فهم', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await startExercise(page, 'بلندخوانی', 1)

    let progress = 0
    for (let i = 0; i < 3; i += 1) {
      const passage = page.getByTestId('ra-passage')
      await expect(passage).toBeVisible({ timeout: 15_000 })
      await page.getByTestId('ra-start').click()
      await page.getByTestId('ra-done').click()
      // دو سؤال فهم — هرکدام گزینهٔ درست از data-correct
      const questions = page.getByTestId('ra-questions')
      await expect(questions).toBeVisible()
      for (let q = 0; q < 2; q += 1) {
        await page
          .locator(`[data-testid="ra-option"][data-q-index="${q}"][data-correct="true"]`)
          .click()
      }
      await page.getByTestId('ra-submit').click()
      progress = await waitProgressAdvance(page, progress)
    }

    await waitForResults(page)
    expect(getErrors(), 'بدون خطای صفحه در بلندخوانی').toEqual([])
  })
})

test.describe('Word Scramble', () => {
  test('۱۲ مرحله: بازسازی واژه از حروف جابه‌جا', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await startExercise(page, 'واژهٔ به‌هم‌ریخته', 1)

    let progress = 0
    for (let i = 0; i < 12; i += 1) {
      const letters = page.getByTestId('ws-letters')
      await expect(letters).toBeVisible({ timeout: 15_000 })
      const target = (await letters.getAttribute('data-target')) ?? ''
      expect(target.length).toBeGreaterThan(0)
      // حروف هدف به ترتیب — هر بار نخستین کاشیِ فعالِ همان حرف
      for (const ch of target) {
        await page
          .locator(`[data-testid="ws-letter"][data-letter="${ch}"]:not([disabled])`)
          .first()
          .click()
      }
      await page.getByTestId('ws-submit').click()
      progress = await waitProgressAdvance(page, progress)
    }

    await waitForResults(page)
    expect(getErrors(), 'بدون خطای صفحه در واژهٔ به‌هم‌ریخته').toEqual([])
  })
})

test.describe('Audio Recall', () => {
  test('۶ مرحله: ارائهٔ خودکار ۳ واژه + بازیابی به همان ترتیب', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await startExercise(page, 'یادآوری شنیداری', 1)

    let progress = 0
    for (let i = 0; i < 6; i += 1) {
      // فاز ارائه خودکار پیش می‌رود (ریتم تایمری) — تا فاز بازیابی صبر
      const recall = page.getByTestId('ar-recall')
      await expect(recall).toBeVisible({ timeout: 30_000 })
      const order = ((await recall.getAttribute('data-expected-order')) ?? '').split(',')
      expect(order).toHaveLength(3)
      for (const word of order) {
        await page.locator(`[data-testid="ar-option"][data-word="${word}"]`).click()
      }
      await page.getByTestId('ar-submit').click()
      progress = await waitProgressAdvance(page, progress)
    }

    await waitForResults(page)
    expect(getErrors(), 'بدون خطای صفحه در یادآوری شنیداری').toEqual([])
  })
})

test.describe('Word Blend', () => {
  test('۱۲ مرحله: شنیدن/دیدن دو قطعه + انتخاب واژهٔ ساخته‌شده', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await startExercise(page, 'ترکیب واژه', 1)

    let progress = 0
    for (let i = 0; i < 12; i += 1) {
      const choices = page.getByTestId('wb-choices')
      await expect(choices).toBeVisible({ timeout: 30_000 })
      await page.locator('[data-testid="wb-option"][data-correct="true"]').click()
      progress = await waitProgressAdvance(page, progress)
    }

    await waitForResults(page)
    expect(getErrors(), 'بدون خطای صفحه در ترکیب واژه').toEqual([])
  })
})
