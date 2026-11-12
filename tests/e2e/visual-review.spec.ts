import { test } from '@playwright/test'

/** اسکرین‌شات صفحات برای بازبینی بصری — بعد از هر تغییر UI اجرا می‌شود */
test('screenshots for visual review', async ({ page }) => {
  test.setTimeout(120_000)

  // صفحه اصلی
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: 'test-results/shot-home.png', fullPage: true })

  // صفحه انتخاب سطح یک بازی
  await page.goto('/play/stroop')
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: 'test-results/shot-picker.png', fullPage: true })

  // دستورالعمل بازی
  await page.getByRole('button', { name: 'ادامه' }).click()
  await page.getByTestId('instructions').waitFor()
  await page.screenshot({ path: 'test-results/shot-instructions.png', fullPage: true })

  // فاز اجرا (بازی بدون زمان — توالی اعداد) + دکمه خروج جدید
  await page.goto('/play/number-sequence')
  await page.getByRole('button', { name: 'ادامه' }).click()
  await page.getByRole('button', { name: 'شروع تمرین' }).click()
  await page.locator('section[data-phase="ACTIVE"]').waitFor({ timeout: 20_000 })
  await page.waitForTimeout(400)
  await page.screenshot({ path: 'test-results/shot-active.png' })

  // دکمه خروج: حالت تأیید
  await page.getByRole('button', { name: 'خروج از جلسه' }).click()
  await page.waitForTimeout(200)
  await page.screenshot({ path: 'test-results/shot-exit-confirm.png' })

  // بازی سریع تا صفحه نتایج با بنر حد نصاب
  await page.goto('/play/pattern-completion')
  await page.getByRole('button', { name: 'ادامه' }).click()
  await page.getByRole('button', { name: 'شروع تمرین' }).click()
  await page.locator('section[data-phase="ACTIVE"]').waitFor({ timeout: 20_000 })
  for (let i = 0; i < 12; i++) {
    await page.locator('[data-testid="pattern-option"]').first().click()
    await page.waitForTimeout(150)
  }
  await page.getByTestId('results').waitFor({ timeout: 30_000 })
  await page.waitForTimeout(800)
  await page.screenshot({ path: 'test-results/shot-results.png', fullPage: true })

  // گزارش‌ها
  await page.goto('/reports')
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: 'test-results/shot-reports.png', fullPage: true })

  // برنامهٔ روزانه
  await page.goto('/program')
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: 'test-results/shot-program.png', fullPage: true })
})
