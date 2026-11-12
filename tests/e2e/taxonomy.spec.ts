import { expect, test, type Page } from '@playwright/test'

/**
 * E2E طبقه‌بندی — سه نمای گروه‌بندی فهرست اصلی (حوزه / نوع تمرین / اثر شناختی)
 * با بخش‌های تاشو و نوار جستجوی دسترسی سریع:
 * هر نما هر ۳۱ تمرین را دقیقاً یک‌بار نشان می‌دهد و پیمایش تا picker سالم است.
 */

const TOTAL_EXERCISES = 31

/** باز کردن همهٔ بخش‌های تاشو — پیش از شمارش کارت‌ها.
 *  همیشه «نخستینِ بسته» کلیک می‌شود؛ باز شدنِ هر بخش فهرست بسته‌ها را
 *  جابه‌جا می‌کند و اندیس گرفتنِ یک‌باره برای nth خطای کهنه می‌دهد. */
async function expandAllSections(page: Page): Promise<void> {
  const collapsed = page.locator('[data-testid="section-toggle"][aria-expanded="false"]')
  while ((await collapsed.count()) > 0) {
    await collapsed.first().click()
  }
}

test.describe('طبقه‌بندی فهرست تمرین‌ها', () => {
  test('سه نمای گروه‌بندی: سرفصل‌ها عوض می‌شوند و هر نما همهٔ ۳۱ تمرین را یک‌بار دارد', async ({
    page,
  }) => {
    await page.goto('/')

    // نمای پیش‌فرض: حوزهٔ شناختی
    const domainBtn = page.getByTestId('view-domain')
    await expect(domainBtn).toBeVisible()
    await expect(domainBtn).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('heading', { name: 'حافظه کاری' })).toBeVisible()
    await expandAllSections(page)
    await expect(page.locator('main a[href^="/play/"]')).toHaveCount(TOTAL_EXERCISES)

    // نمای نوع تمرین — سرفصل‌های جدید، بدون سرفصل حوزه
    await page.getByTestId('view-type').click()
    await expect(page.getByTestId('view-type')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('heading', { name: 'عددی و محاسبه‌ای' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'حافظه کاری' })).toBeHidden()
    await expandAllSections(page)
    await expect(page.locator('main a[href^="/play/"]')).toHaveCount(TOTAL_EXERCISES)

    // نمای اثر شناختی — سرفصل‌های اثر (برچسب حوزه‌ها)، بازی‌ها زیر اثر اصلی‌شان
    await page.getByTestId('view-effect').click()
    await expect(page.getByTestId('view-effect')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('heading', { name: 'حافظه کاری' })).toBeVisible()
    await expandAllSections(page)
    await expect(page.locator('main a[href^="/play/"]')).toHaveCount(TOTAL_EXERCISES)
  })

  test('از جستجو، پیمایش تا picker سالم است', async ({ page }) => {
    await page.goto('/')

    // جستجوی «ان-بک دوگانه» — لنگر کامل لازم است («ان-بک» پیشوندش است و strict mode می‌شکند)
    await page.getByTestId('game-search').fill('ان-بک دوگانه')
    const nback = page.getByRole('link', { name: /^ان-بک دوگانه/ })
    await expect(nback).toBeVisible()
    await nback.click()

    await expect(page.getByTestId('view-type')).toBeHidden()
    await expect(page.getByRole('radiogroup', { name: 'سطح دشواری' })).toBeVisible()
  })

  test('بخش‌های تاشو: پیش‌فرض فقط نخستین بخش باز؛ کلیک می‌بندد و باز می‌کند', async ({
    page,
  }) => {
    await page.goto('/')

    const toggles = page.locator('[data-testid="section-toggle"]')
    await expect(toggles.first()).toBeVisible()
    // فقط یک بخش باز است
    await expect(page.locator('[data-testid="section-toggle"][aria-expanded="true"]')).toHaveCount(1)
    // بازی‌های بخش اول دیده می‌شوند
    await expect(page.locator('main a[href^="/play/"]').first()).toBeVisible()

    // بستن بخش باز → هیچ بازی‌ای در DOM نیست (فهرست فشرده)
    await page.locator('[data-testid="section-toggle"][aria-expanded="true"]').click()
    await expect(page.locator('main a[href^="/play/"]')).toHaveCount(0)

    // باز کردن بخش دوم → کارت‌های همان بخش ظاهر می‌شوند
    await toggles.nth(1).click()
    await expect(page.locator('main a[href^="/play/"]').first()).toBeVisible()
  })

  test('جستجو: فیلتر زندهٔ نام بازی + حالت خالی + بازگشت با پاک‌کردن', async ({ page }) => {
    await page.goto('/')

    const search = page.getByTestId('game-search')
    await search.fill('بلندخوانی')
    await expect(page.locator('main a[href^="/play/"]')).toHaveCount(1)
    await expect(page.getByRole('link', { name: /^بلندخوانی/ })).toBeVisible()

    // عبارت بی‌نتیجه → پیام خالی
    await search.fill('چیزی‌که‌نیست')
    await expect(page.getByTestId('search-empty')).toBeVisible()
    await expect(page.locator('main a[href^="/play/"]')).toHaveCount(0)

    // پاک‌کردن → بازگشت به فهرست تاشوی گروه‌بندی
    await page.getByTestId('game-search-clear').click()
    await expect(page.getByTestId('view-domain')).toBeVisible()
    await expect(page.locator('[data-testid="section-toggle"]').first()).toBeVisible()
  })
})
