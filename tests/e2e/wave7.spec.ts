import { expect, test } from '@playwright/test'
import { startExercise, waitForResults, waitProgressAdvance } from './helpers'
import { trackPageErrors } from './qa-helpers'

/**
 * E2E موج هفتم — سه بازی سند پژوهش: دهانهٔ عملیاتی، دهانهٔ تقارن، کارت‌بندی قاعده.
 * همهٔ جلسه‌ها کامل اجرا می‌شوند؛ سنکرون پیشروی با data-trial-index.
 */

test.describe('Operation Span', () => {
  test('۳ دسته: قضاوت معادله‌ها + بازیابی ترتیبی واژه‌ها', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await startExercise(page, 'دهانهٔ عملیاتی', 1)

    // سطح ۱: ۳ دسته × ۳ آیتم
    let progress = 0
    for (let set = 0; set < 3; set++) {
      for (let item = 0; item < 3; item++) {
        const math = page.getByTestId('ospan-math')
        await expect(math).toBeVisible({ timeout: 15_000 })
        const isTrue = (await math.getAttribute('data-math-true')) === 'true'
        await page.getByTestId(isTrue ? 'ospan-judge-true' : 'ospan-judge-false').click()
        // فلش بازخورد و نمایش واژه خودکار پیش می‌روند
      }
      const recall = page.getByTestId('ospan-recall')
      await expect(recall).toBeVisible({ timeout: 15_000 })
      const order = ((await recall.getAttribute('data-expected-order')) ?? '').split(',')
      expect(order).toHaveLength(3)
      for (const word of order) {
        await page.locator(`[data-testid="ospan-choice"][data-word="${word}"]`).click()
      }
      await page.getByTestId('ospan-submit').click()
      progress = await waitProgressAdvance(page, progress)
    }

    await waitForResults(page)
    expect(getErrors(), 'بدون خطای صفحه در جلسهٔ دهانهٔ عملیاتی').toEqual([])
  })
})

test.describe('Symmetry Span', () => {
  test('۳ دسته: قضاوت تقارن + بازیابی ترتیبی مکان‌ها', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await startExercise(page, 'دهانهٔ تقارن', 1)

    // سطح ۱: ۳ دسته × ۳ آیتم
    let progress = 0
    for (let set = 0; set < 3; set++) {
      for (let item = 0; item < 3; item++) {
        const pattern = page.getByTestId('symspan-pattern')
        await expect(pattern).toBeVisible({ timeout: 15_000 })
        const symmetric = (await pattern.getAttribute('data-symmetric')) === 'true'
        await page
          .getByTestId(symmetric ? 'symspan-judge-symmetric' : 'symspan-judge-asymmetric')
          .click()
      }
      const recall = page.getByTestId('symspan-recall')
      await expect(recall).toBeVisible({ timeout: 15_000 })
      const order = ((await recall.getAttribute('data-expected-order')) ?? '').split(',')
      expect(order).toHaveLength(3)
      for (const cell of order) {
        await recall.locator(`[data-cell-index="${cell}"]`).click()
      }
      await page.getByTestId('symspan-submit').click()
      progress = await waitProgressAdvance(page, progress)
    }

    await waitForResults(page)
    expect(getErrors(), 'بدون خطای صفحه در جلسهٔ دهانهٔ تقارن').toEqual([])
  })
})

test.describe('Rule Discovery Card Sorting', () => {
  test('۳۶ کارت: دسته‌بندی کاملِ درست + تعویض‌های قاعده', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await startExercise(page, 'کارت‌بندی قاعده', 1)

    // بازی بی‌نقص: هر کارت زیر جایگاهِ data-expected — قاعده‌ها خودشان می‌چرخند
    let progress = 0
    for (let i = 0; i < 36; i++) {
      const board = page.getByTestId('wcs-board')
      await expect(board).toBeVisible({ timeout: 15_000 })
      const expected = Number(await board.getAttribute('data-expected'))
      await page.locator(`[data-testid="wcs-pile"][data-pile-index="${expected}"]`).click()
      progress = await waitProgressAdvance(page, progress)
    }

    await waitForResults(page)
    expect(getErrors(), 'بدون خطای صفحه در ۳۶ کارت').toEqual([])
  })
})
