import { expect, test } from '@playwright/test'

/**
 * E2E طبقه‌بندی — سه نمای گروه‌بندی فهرست اصلی (حوزه / نوع تمرین / اثر شناختی):
 * هر نما هر ۲۱ تمرین را دقیقاً یک‌بار نشان می‌دهد و پیمایش به picker سالم است.
 */

const TOTAL_EXERCISES = 24

test.describe('طبقه‌بندی فهرست تمرین‌ها', () => {
  test('سه نمای گروه‌بندی: سرفصل‌ها عوض می‌شوند و هر نما همهٔ ۲۱ تمرین را یک‌بار دارد', async ({
    page,
  }) => {
    await page.goto('/')

    // نمای پیش‌فرض: حوزهٔ شناختی
    const domainBtn = page.getByTestId('view-domain')
    await expect(domainBtn).toBeVisible()
    await expect(domainBtn).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('heading', { name: 'حافظه کاری' })).toBeVisible()
    await expect(page.locator('main a[href^="/play/"]')).toHaveCount(TOTAL_EXERCISES)

    // نمای نوع تمرین — سرفصل‌های جدید، بدون سرفصل حوزه
    await page.getByTestId('view-type').click()
    await expect(page.getByTestId('view-type')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('heading', { name: 'عددی و محاسبه‌ای' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'حافظه کاری' })).toBeHidden()
    await expect(page.locator('main a[href^="/play/"]')).toHaveCount(TOTAL_EXERCISES)

    // نمای اثر شناختی — سرفصل‌های اثر (برچسب حوزه‌ها)، بازی‌ها زیر اثر اصلی‌شان
    await page.getByTestId('view-effect').click()
    await expect(page.getByTestId('view-effect')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('heading', { name: 'حافظه کاری' })).toBeVisible()
    await expect(page.locator('main a[href^="/play/"]')).toHaveCount(TOTAL_EXERCISES)
  })

  test('از نمای نوع تمرین، پیمایش تا picker سالم است', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('view-type').click()

    // در گروه «کلامی» بازی «ان-بک دوگانه» هست — از نمای نوع هم باید قابل شروع باشد
    // (لنگر کامل لازم است: «ان-بک» تنها، پیشوند «ان-بک دوگانه» هم هست و strict mode می‌شکند)
    const nback = page.getByRole('link', { name: /^ان-بک دوگانه/ })
    await expect(nback).toBeVisible()
    await nback.click()

    await expect(page.getByTestId('view-type')).toBeHidden()
    await expect(page.getByRole('radiogroup', { name: 'سطح دشواری' })).toBeVisible()
  })
})
