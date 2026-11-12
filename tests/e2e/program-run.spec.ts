import { expect, test } from '@playwright/test'
import { fakeCompletedSession, seedSessions, trackPageErrors } from './qa-helpers'
import { faToNumber, waitForActive } from './helpers'

/**
 * E2E اجرای خودکار زنجیرهٔ برنامهٔ روزانه:
 * ورود از دکمهٔ شروع خودکار → پرش از انتخاب سطح → آغاز خودکار بدون کلیک →
 * قطع دوتأییدی → بسته‌شدن اجرا و کارت خلاصه در صفحهٔ برنامه.
 */

test.describe('اجرای خودکار برنامه', () => {
  test('شروع خودکار: بدون کلیکِ شروع فعال می‌شود؛ خروج، اجرا را نیمه‌کاره ثبت می‌کند', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await page.goto('/program')

    // طرح امروز ساخته و دکمهٔ اجرای زنجیره‌ای دیده می‌شود
    const runStart = page.getByTestId('program-run-start')
    await expect(runStart).toBeVisible({ timeout: 15_000 })

    // سطح پیشنهادیِ نخستین آیتم در انتظار — بعداً با دستورالعمل تطبیق می‌دهیم
    const firstRow = page.locator('[data-testid="program-item"]').first()
    const metaText =
      (await firstRow.locator('span').filter({ hasText: 'سطح پیشنهادی' }).first().textContent()) ?? ''
    const levelMatch = metaText.match(/سطح پیشنهادی\s([۰-۹])/)
    expect(levelMatch).not.toBeNull()
    const faDigits = '۰۱۲۳۴۵۶۷۸۹'
    const suggestedLevel = faToNumber(levelMatch?.[1] ?? '')

    await runStart.click()

    // مستقیم به تمرین رفتیم — نه صفحهٔ انتخاب سطح (radio وجود ندارد)
    await expect(page.getByTestId('instructions')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByRole('radio')).toHaveCount(0)

    // سطح از آیتم طرح آمده، نه انتخاب دستی
    await expect(page.getByTestId('instructions')).toContainText(
      `سطح دشواری: ${faDigits[suggestedLevel as number]} از ۵`,
    )

    // آغاز خودکار بدون هیچ کلیکی (شمارش ۵ + ۳ ثانیه)
    await waitForActive(page)

    // قطع دوتأییدی → اجرای برنامه نیمه‌کاره ثبت و به صفحهٔ برنامه برمی‌گردیم
    await page.getByRole('button', { name: 'خروج از جلسه' }).click()
    await page.getByRole('button', { name: 'قطع جلسه — تأیید' }).click()
    await expect(page.getByText('این جلسه نیمه‌کاره رها شد.')).toBeVisible()
    await page.getByRole('button', { name: 'بازگشت به فهرست' }).click()

    await expect(page).toHaveURL(/\/program/)
    const summary = page.getByTestId('program-run-summary')
    await expect(summary).toBeVisible({ timeout: 15_000 })
    await expect(summary).toContainText('نیمه‌کاره')

    expect(getErrors(), 'بدون خطای صفحه در چرخهٔ اجرای خودکار').toEqual([])
  })

  test('کارت خلاصهٔ اجرای کامل: وضعیت کامل و ارقام تحلیل از دادهٔ بذریافته', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await page.goto('/program')
    await expect(page.getByRole('heading', { name: 'برنامه امروز من' })).toBeVisible()

    // اجرای کاملِ امروز با یک جلسهٔ لینک‌شده بکاریم (تاریخ ISO محلی امروز)
    const todayIso = await page.evaluate(() => {
      const d = new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
    })
    const startedAt = await page.evaluate(() => Date.now() - 3_600_000)
    await seedSessions(page, [
      fakeCompletedSession({
        id: 'run-e2e-s1',
        exerciseId: 'n-back',
        domain: 'working-memory',
        difficulty: 1,
        accuracy: 85,
        startedAtMs: startedAt,
      }),
    ])
    await page.evaluate(
      ({ todayIso, startedAt }) =>
        new Promise<void>((resolve, reject) => {
          const req = indexedDB.open('cognitive-training-lab')
          req.onerror = () => reject(req.error)
          req.onsuccess = () => {
            const db = req.result
            const tx = db.transaction('program_runs', 'readwrite')
            tx.objectStore('program_runs').put({
              id: `e2e-${todayIso}`,
              date: todayIso,
              startedAt,
              endedAt: startedAt + 900_000,
              durationMs: 900_000,
              sessionIds: ['run-e2e-s1'],
              status: 'completed',
            })
            tx.oncomplete = () => {
              db.close()
              resolve()
            }
            tx.onerror = () => reject(tx.error)
          }
        }),
      { todayIso, startedAt },
    )

    await page.reload()
    const summary = page.getByTestId('program-run-summary')
    await expect(summary).toBeVisible({ timeout: 15_000 })
    await expect(summary).toContainText('کامل شد')
    await expect(summary).toContainText('۱ جلسهٔ کامل')
    await expect(summary).toContainText('میانگین دقت: ۸۵٪')

    expect(getErrors()).toEqual([])
  })
})
