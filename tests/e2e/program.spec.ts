import { expect, test } from '@playwright/test'

/**
 * E2E دودی صفحه «برنامه امروز من»: بارگذاری، نمایش آیتم‌های برنامه
 * و ناوبری به صفحه بازی از طریق CTA. (اجرای مستقل:
 * npx playwright test tests/e2e/program.spec.ts)
 */

test.describe('برنامه امروز من', () => {
  test('از صفحه اصلی باز می‌شود، ۳ تا ۴ آیتم دارد و لینک شروع کار می‌کند', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'برنامه امروز من' }).click()

    await expect(page.getByRole('heading', { name: 'برنامه امروز من' })).toBeVisible()
    // خط صادقانه درباره هدف ۱۵ تا ۲۰ دقیقه
    await expect(page.getByText('هدف روزانه: ۱۵ تا ۲۰ دقیقه')).toBeVisible()

    const items = page.getByTestId('program-item')
    await expect(items.first()).toBeVisible()
    const count = await items.count()
    expect(count).toBeGreaterThanOrEqual(3)
    expect(count).toBeLessThanOrEqual(4)

    // هر آیتم دکمه شروع با لینک به صفحه همان بازی دارد
    await page.getByTestId('program-start').first().click()
    await expect(page).toHaveURL(/\/play\//)
    await expect(page.getByRole('radio', { name: '۱', exact: true })).toBeVisible()
  })

  test('بارگذاری مستقیم مسیر /program هم کار می‌کند', async ({ page }) => {
    await page.goto('/program')
    await expect(page.getByRole('heading', { name: 'برنامه امروز من' })).toBeVisible()
    await expect(page.getByTestId('program-item').first()).toBeVisible()
  })
})
