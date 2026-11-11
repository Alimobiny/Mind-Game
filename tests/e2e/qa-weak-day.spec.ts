import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { faToNumber } from './helpers'
import { fakeCompletedSession, seedSessions, trackPageErrors } from './qa-helpers'

/**
 * سناریو QA 4 — جلسه کاملاً غلط (accuracy=0) و قاعده «روز ضعیف»:
 * بهترین دقت روز < ۵۰٪ → سطح پیشنهادی −۱ (تا کف ۱).
 * مسیر کامل و واقعی: سطح پیشنهادی قبل (بذر ۳ روز موفق → سطح ۲)،
 * جلسه واقعی تماماً غلط در سطح ۲، سپس سطح پیشنهادی بعد باید ۱ باشد.
 */

/**
 * ظهرِ (۱۲:۰۰) k روز تقویمی قبل — لنگر روز-محور، مستقل از ساعتِ اجرای تست.
 * فرمول قبلی «now − k×DAY + 12h» در اجراهای بعدازظهر، بذرِ «دیروز» را به
 * صبحِ همان روزِ جلسهٔ واقعی می‌انداخت؛ روزِ ادغام‌شده با قاعدهٔ روز-محور
 * «روز ضعیف» سازگار نبود و تست فقط پیش از ظهر سبز می‌شد.
 */
function daysAgoAtNoon(days: number): number {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(12, 0, 0, 0)
  return d.getTime()
}

/** شروع دستی محاسبه ×۲۰ در سطح مشخص (بدون هلپر startExercise برای کنترل سطح) */
async function startCalculationAt(page: Page, level: number): Promise<void> {
  await page.goto('/')
  await page.getByRole('link', { name: /محاسبه × ۲۰/ }).click()
  await page.getByRole('radio', { name: ['۱', '۲', '۳', '۴', '۵'][level - 1] as string, exact: true }).click()
  await page.getByRole('button', { name: 'ادامه' }).click()
  await page.getByTestId('instructions')
  await page.getByRole('button', { name: 'شروع تمرین' }).click()
  await expect(page.locator('section[data-phase="ACTIVE"]')).toBeVisible({ timeout: 20_000 })
}

/** دکمه صفحه‌کلید لمسی برنامه برای یک رقم */
async function pressDigit(page: Page, digit: string): Promise<void> {
  const FA = '۰۱۲۳۴۵۶۷۸۹'
  for (const ch of digit) {
    await page.getByRole('button', { name: FA[Number(ch)] as string, exact: true }).click()
  }
}

test.describe('QA4: قاعده روز ضعیف پس از جلسه تماماً غلط', () => {
  test('دقت ۰٪ در سطح پیشنهادی ۲ → سطح پیشنهادی به ۱ برمی‌گردد', async ({ page }) => {
    const getErrors = trackPageErrors(page)

    // ۱) بذر تاریخچه: سه روز تقویمی متوالی موفق در سطح ۱ → پیشنهادی ۲
    await page.goto('/')
    await seedSessions(page, [
      fakeCompletedSession({
        id: 'seed-d1',
        exerciseId: 'calculation-20',
        domain: 'processing-speed',
        difficulty: 1,
        accuracy: 90,
        startedAtMs: daysAgoAtNoon(3),
      }),
      fakeCompletedSession({
        id: 'seed-d2',
        exerciseId: 'calculation-20',
        domain: 'processing-speed',
        difficulty: 1,
        accuracy: 85,
        startedAtMs: daysAgoAtNoon(2),
      }),
      fakeCompletedSession({
        id: 'seed-d3',
        exerciseId: 'calculation-20',
        domain: 'processing-speed',
        difficulty: 1,
        accuracy: 95,
        startedAtMs: daysAgoAtNoon(1),
      }),
    ])

    // پیش از جلسه: نشان «پیشنهادی» روی سطح ۲ است
    await page.goto('/play/calculation-20')
    await expect(page.getByRole('radio', { name: '۲', exact: true })).toContainText('پیشنهادی')
    await expect(page.getByRole('radio', { name: '۱', exact: true })).not.toContainText('پیشنهادی')

    // ۲) جلسه واقعی تماماً غلط در سطح پیشنهادی ۲
    await startCalculationAt(page, 2)
    for (let i = 0; i < 20; i++) {
      const questionEl = page.getByTestId('calc-question')
      await expect(questionEl).toBeVisible()
      const text = (await questionEl.textContent()) ?? ''
      const match = text.match(/([۰-۹]+)\s*([+\-×÷])\s*([۰-۹]+)/)
      if (!match) throw new Error(`سؤال قابل پارس نبود: ${text}`)
      const a = faToNumber(match[1] as string)
      const b = faToNumber(match[3] as string)
      const op = match[2]
      const correct = op === '+' ? a + b : op === '-' ? a - b : op === '×' ? a * b : a / b
      // پاسخ قطعاً غلط: correct+1 (mod 1000 برای سقف ۳ رقمی صفحه‌کلید)
      const wrong = String((correct + 1) % 1000)
      await pressDigit(page, wrong)
      await page.getByRole('button', { name: 'تأیید' }).click()
    }

    // ۳) نتایج: دقت ۰٪ و بنر افت سطح
    await expect(page.getByTestId('results')).toBeVisible({ timeout: 60_000 })
    await expect(page.getByText('جلسه کامل شد')).toBeVisible()
    await expect(page.getByTestId('threshold-banner')).toBeVisible()
    // آخرین تغییر سطح امروزِ همان روز است → سطح پیشنهادی اکنون: ۱
    await expect(page.getByText('سطح پیشنهادی اکنون: ۱')).toBeVisible({ timeout: 15_000 })

    // ۴) اثر ماندگار: در انتخابگر، نشان پیشنهادی به سطح ۱ برگشته
    await page.goto('/play/calculation-20')
    await expect(page.getByRole('radio', { name: '۱', exact: true })).toContainText('پیشنهادی', {
      timeout: 15_000,
    })
    await expect(page.getByRole('radio', { name: '۲', exact: true })).not.toContainText('پیشنهادی')

    // ۵) گزارش‌ها سالم
    await page.goto('/reports')
    await expect(page.getByRole('heading', { name: 'گزارش‌ها' })).toBeVisible()
    await expect(page.getByText('خواندن گزارش‌ها ناموفق بود')).toBeHidden()
    expect(getErrors()).toEqual([])
  })
})
