import { expect, test } from '@playwright/test'

/**
 * E2E کتابخانهٔ فهرست اصلی — کارت «تمرین امروز» + فهرست متراکم با نوار
 * فیلتر چسبان (تب حوزه + خانواده + ترتیب) و جستجوی دسترسی سریع:
 * تب «همه» هر ۳۷ تمرین را یک‌جا نشان می‌دهد؛ فیلترها زیرمجموعه درست
 * می‌دهند و پیمایش تا picker سالم است.
 */

const TOTAL_EXERCISES = 37

test.describe('کتابخانهٔ تمرین‌ها (تب حوزه + فیلتر خانواده)', () => {
  test('کارت «تمرین امروز» بالای کتابخانه و تب همه هر ۳۷ تمرین را یک‌جا دارد', async ({
    page,
  }) => {
    await page.goto('/')

    // کارت قهرمان امروز — عنوان + دکمهٔ مسیر برنامه
    await expect(page.getByRole('heading', { name: 'تمرین امروز' })).toBeVisible()
    await expect(page.getByRole('link', { name: /شروع برنامهٔ امروز|ادامهٔ اجرای امروز|مشاهدهٔ برنامه/ })).toBeVisible()

    // تب پیش‌فرض «همه» — همهٔ ردیف‌ها بدون بازکردن هیچ چیزی
    await expect(page.getByTestId('domain-tab-all')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('heading', { name: /کتابخانهٔ تمرین‌ها/ })).toBeVisible()
    await expect(page.locator('main a[href^="/play/"]')).toHaveCount(TOTAL_EXERCISES)
  })

  test('تب حوزه فهرست را فیلتر می‌کند و برمی‌گرداند', async ({ page }) => {
    await page.goto('/')

    // تب حوزهٔ توجه — فقط ۵ ردیف همان حوزه
    await page.getByTestId('domain-tab-attention-control').click()
    await expect(page.getByTestId('domain-tab-attention-control')).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(page.locator('main a[href^="/play/"]')).toHaveCount(5)
    await expect(page.locator('main a[href^="/play/"][data-domain="attention-control"]')).toHaveCount(5)

    // بازگشت به «همه» — دوباره ۳۷ ردیف
    await page.getByTestId('domain-tab-all').click()
    await expect(page.locator('main a[href^="/play/"]')).toHaveCount(TOTAL_EXERCISES)
  })

  test('فیلتر خانواده زیرمجموعهٔ درست می‌دهد و با تعویض تب پاک می‌شود', async ({ page }) => {
    await page.goto('/')

    // خانوادهٔ ان-بک در «همه» — فقط ان-بک تکی
    await page.getByTestId('family-filter').selectOption('n-back')
    await expect(page.locator('main a[href^="/play/"]')).toHaveCount(1)
    await expect(page.getByRole('link', { name: /^ان-بک(?! دوگانه)/ })).toBeVisible()

    // خانوادهٔ دهانهٔ مرکب — دو عضو در دو حوزهٔ متفاوت
    await page.getByTestId('family-filter').selectOption('complex-span')
    await expect(page.locator('main a[href^="/play/"]')).toHaveCount(2)

    // خانوادهٔ کورسی فقط در دیداری-فضایی است — با رفتن به حافظهٔ کاری پاک می‌شود
    await page.getByTestId('family-filter').selectOption('corsi')
    await expect(page.locator('main a[href^="/play/"]')).toHaveCount(1)
    await page.getByTestId('domain-tab-working-memory').click()
    const value = await page.getByTestId('family-filter').inputValue()
    expect(value).toBe('')
    await expect(page.locator('main a[href^="/play/"]')).toHaveCount(6)
  })

  test('از جستجو، پیمایش تا picker سالم است', async ({ page }) => {
    await page.goto('/')

    // جستجوی «ان-بک دوگانه» — لنگر لازم است («ان-بک» و «ان-بک دوگانهٔ
    // شنیداری» هر دو پیشوند مشترک‌اند و strict mode می‌شکند؛ نام
    // دسترس‌پذیر ردیف متا را هم دارد، پس $ کار نمی‌کند)
    await page.getByTestId('game-search').fill('ان-بک دوگانه')
    const nback = page.getByRole('link', { name: /^ان-بک دوگانه(?!.*شنیداری)/ })
    await expect(nback).toBeVisible()
    await nback.click()

    await expect(page.getByTestId('domain-tab-all')).toBeHidden()
    await expect(page.getByRole('radiogroup', { name: 'سطح دشواری' })).toBeVisible()
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

    // پاک‌کردن → بازگشت به کتابخانهٔ فیلترشده
    await page.getByTestId('game-search-clear').click()
    await expect(page.getByTestId('domain-tab-all')).toBeVisible()
    await expect(page.locator('main a[href^="/play/"]')).toHaveCount(TOTAL_EXERCISES)
  })

  test('جستجو: عبارت لاتین شناسهٔ بازی را می‌یابد (n-back/pasat)', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('game-search').fill('pasat')
    await expect(page.locator('main a[href^="/play/"]')).toHaveCount(1)
    await expect(page.getByRole('link', { name: /جمع زنجیره‌ای گام‌دار/ })).toBeVisible()

    await page.getByTestId('game-search').fill('n-back')
    const nbackLinks = page.locator('main a[href^="/play/"]')
    await expect(nbackLinks.first()).toBeVisible()
    // سه عضو خانوادهٔ ان-بک: n-back و دو dual — هر سه لاتینِ «n-back» را دارند
    await expect(nbackLinks).toHaveCount(3)
  })
})
