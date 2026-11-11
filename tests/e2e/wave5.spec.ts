import { expect, test } from '@playwright/test'
import { startExercise, waitForResults } from './helpers'
import { trackPageErrors } from './qa-helpers'

/**
 * E2E موج پنجم — پنج بازی جدید: دنبال‌کردن اشیا (اولین بازی Canvas)،
 * چرخش ذهنی، ساعت آینه‌ای، ارتفاع بلوک‌ها، جابه‌جایی تکلیف.
 * همهٔ جلسه‌ها کامل اجرا می‌شوند و بدون هیچ pageerror باید پایان یابند.
 */

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹'

/** انتظار برای افزایش شمارندهٔ «مرحله n / m» هدر — سنکرون مقاوم هر مرحله */
async function waitProgressAdvance(page: import('@playwright/test').Page, prev: number): Promise<number> {
  await page.waitForFunction(
    (prevCount) => {
      if (document.querySelector('[data-testid="results"]')) return true
      const header = document.querySelector('section[data-phase] header')
      const first = (header?.textContent ?? '').trim().match(/[۰-۹]+/)?.[0]
      if (!first) return false
      const num = [...first].reduce((acc, ch) => {
        const idx = FA_DIGITS.indexOf(ch)
        return idx === -1 ? acc : acc * 10 + idx
      }, 0)
      return num > prevCount
    },
    prev,
    { timeout: 20_000 },
  )
  return prev + 1
}

test.describe('Task Switching', () => {
  test('۴۰ مرحله: پاسخ بر اساس نشانهٔ بُعد (نگاشت ثابت راست/چپ)', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await startExercise(page, 'جابه‌جایی تکلیف', 1)

    // نگاشت ثابت موتور: آبی/دایره/کوچک = راست · قرمز/مثلث/بزرگ = چپ
    const sideFor: Record<string, string> = {
      blue: 'right', red: 'left',
      circle: 'right', triangle: 'left',
      small: 'right', large: 'left',
    }

    let progress = 0
    for (let i = 0; i < 40; i++) {
      const cue = page.getByTestId('ts-cue')
      await expect(cue).toBeVisible({ timeout: 15_000 })
      const dimension = (await cue.getAttribute('data-dimension')) ?? 'color'
      const stimulus = page.getByTestId('ts-stimulus')
      await expect(stimulus).toBeVisible({ timeout: 10_000 })
      const attr =
        dimension === 'color' ? 'data-color' : dimension === 'shape' ? 'data-shape' : 'data-size'
      const value = (await stimulus.getAttribute(attr)) ?? ''
      const side = sideFor[value]
      if (!side) throw new Error(`مقدار محرک ناشناخته: ${dimension}=${value}`)
      await page.locator(`[data-testid="ts-choice"][data-side="${side}"]`).click()
      progress = await waitProgressAdvance(page, progress)
    }

    await waitForResults(page)
    expect(getErrors(), 'بدون خطای صفحه در ۴۰ مرحله').toEqual([])
  })
})

test.describe('Mental Rotation', () => {
  test('۱۶ مرحله: قضاوت یکسان/آینه‌ای از data-same', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await startExercise(page, 'چرخش ذهنی', 1)

    let progress = 0
    for (let i = 0; i < 16; i++) {
      const candidate = page.getByTestId('mr-candidate')
      await expect(candidate).toBeVisible({ timeout: 15_000 })
      const isSame = ((await candidate.getAttribute('data-same')) ?? '') === 'true'
      await page
        .locator(`[data-testid="mr-choice"][data-verdict="${isSame ? 'same' : 'mirrored'}"]`)
        .click()
      progress = await waitProgressAdvance(page, progress)
    }

    await waitForResults(page)
    expect(getErrors(), 'بدون خطای صفحه در ۱۶ مرحله').toEqual([])
  })
})

test.describe('Mirror Clock', () => {
  test('۱۲ مرحله: انتخاب گزینهٔ درست (زمان واقعی از data-hour/minute)', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await startExercise(page, 'ساعت آینه‌ای', 1)

    let progress = 0
    for (let i = 0; i < 12; i++) {
      const clock = page.getByTestId('mc-clock')
      await expect(clock).toBeVisible({ timeout: 15_000 })
      // درستی جواب از خود موتور می‌آید (data-correct) — E2E جریان را می‌سنجد
      await page.locator('[data-testid="mc-option"][data-correct="true"]').click()
      progress = await waitProgressAdvance(page, progress)
    }

    await waitForResults(page)
    expect(getErrors(), 'بدون خطای صفحه در ۱۲ مرحله').toEqual([])
  })
})

test.describe('Block Height', () => {
  test('۱۲ مرحله: شمارش کل بلوک‌ها با صفحه‌کلید (data-total)', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await startExercise(page, 'ارتفاع بلوک‌ها', 1)

    let progress = 0
    for (let i = 0; i < 12; i++) {
      const figure = page.getByTestId('bh-figure')
      await expect(figure).toBeVisible({ timeout: 15_000 })
      const total = Number((await figure.getAttribute('data-total')) ?? '0')
      if (!Number.isFinite(total) || total <= 0) throw new Error(`data-total نامعتبر: ${total}`)
      for (const digit of String(total).split('')) {
        await page.getByTestId(`bh-key-${digit}`).click()
      }
      await page.getByTestId('bh-submit').click()
      progress = await waitProgressAdvance(page, progress)
    }

    await waitForResults(page)
    expect(getErrors(), 'بدون خطای صفحه در ۱۲ مرحله').toEqual([])
  })
})

test.describe('Object Tracking', () => {
  test('۸ مرحله: هایلایت → حرکت → انتخاب اهداف و تأیید', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await startExercise(page, 'دنبال‌کردن اشیا', 1)

    // سطح ۱: ۴ شیء و ۲ هدف — انتخاب دو شیء اول کافی است (E2E جریان را می‌سنجد)
    let progress = 0
    for (let trial = 0; trial < 8; trial++) {
      // فاز پاسخ پس از هایلایت (~۱.۶ث) + حرکت (~۴ث) ظاهر می‌شود
      await expect(page.locator('[data-testid="ot-phase"][data-phase="answer"]')).toBeVisible({
        timeout: 20_000,
      })
      await page.getByTestId('ot-select-1').click()
      await page.getByTestId('ot-select-2').click()
      await page.getByTestId('ot-confirm').click()
      progress = await waitProgressAdvance(page, progress)
    }

    await waitForResults(page)
    expect(getErrors(), 'بدون خطای صفحه در ۸ مرحلهٔ Canvas').toEqual([])
  })
})
