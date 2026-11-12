import { expect, test } from '@playwright/test'
import { trackPageErrors, fakeCompletedSession, seedSessions } from './qa-helpers'

/**
 * E2E صفحهٔ «سیر پیشرفت» — تقویم فعالیت، رکورد روزها و نشان‌ها:
 * هم حالت خالی سالم است و هم با تاریخچهٔ بذریافته، داده‌ها رندر می‌شوند.
 * (ذخیرهٔ فعالیت‌ها از قبل کامل است؛ این صفحه «حافظهٔ» نمایشی همان داده است)
 */

const DAY_MS = 86_400_000

function daysAgoAtNoon(days: number): number {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(12, 0, 0, 0)
  return d.getTime()
}

test.describe('سیر پیشرفت', () => {
  test('حالت خالی: صفحه سالم باز می‌شود و پیام شروع نشان می‌دهد', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await page.goto('/')
    await page.getByRole('link', { name: 'سیر پیشرفت' }).click()
    await expect(page.getByRole('heading', { name: 'سیر پیشرفت' })).toBeVisible()
    await expect(page.getByText('هنوز تمرینی ثبت نشده')).toBeVisible()
    expect(getErrors()).toEqual([])
  })

  test('حالت خالی: کارت فعالیت فشردهٔ صفحهٔ اول مخفی است', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await page.goto('/')
    await expect(page.getByTestId('home-heatmap')).toHaveCount(0)
    expect(getErrors()).toEqual([])
  })

  test('با تاریخچهٔ ۵ روزه: تقویم، رکورد، نشان و خط زمانی رندر می‌شوند', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await page.goto('/')

    // ۳ روز پیاپی اخیر (رکورد ≥ ۳) + ۲ روز دورتر + یک ناتمام امروز
    await seedSessions(page, [
      fakeCompletedSession({
        id: 'j-d4',
        exerciseId: 'n-back',
        domain: 'working-memory',
        difficulty: 1,
        accuracy: 90,
        startedAtMs: daysAgoAtNoon(4),
      }),
      fakeCompletedSession({
        id: 'j-d3',
        exerciseId: 'calculation-20',
        domain: 'processing-speed',
        difficulty: 1,
        accuracy: 85,
        startedAtMs: daysAgoAtNoon(3),
      }),
      fakeCompletedSession({
        id: 'j-d2',
        exerciseId: 'memorise-grid',
        domain: 'visual-spatial',
        difficulty: 1,
        accuracy: 80,
        startedAtMs: daysAgoAtNoon(2),
      }),
      fakeCompletedSession({
        id: 'j-d1',
        exerciseId: 'stroop',
        domain: 'attention-control',
        difficulty: 1,
        accuracy: 88,
        startedAtMs: daysAgoAtNoon(1),
      }),
      fakeCompletedSession({
        id: 'j-d0',
        exerciseId: 'reaction-time',
        domain: 'sensorimotor',
        difficulty: 1,
        accuracy: 92,
        startedAtMs: daysAgoAtNoon(0),
      }),
    ])

    await page.goto('/journey')
    await expect(page.getByRole('heading', { name: 'سیر پیشرفت' })).toBeVisible()

    // تقویم فعالیت: سلول‌های سطح‌دار دیده می‌شوند
    await expect(page.locator('[data-testid="heat-cell"][data-level="1"]')).toHaveCount(5)

    // کارت رکورد فعلی: ۵ روز پیاپی
    await expect(page.getByText('رکورد فعلی')).toBeVisible()

    // نشانِ اولین جلسه باز شده و تاریخ دارد
    const firstBadge = page.locator('[data-testid="milestone"][data-achieved="true"]', {
      hasText: 'اولین قدم',
    })
    await expect(firstBadge).toBeVisible()

    // خط زمانی: روزهای اخیر با چیپ جلسات
    const days = page.getByTestId('journey-day')
    await expect(days).toHaveCount(5)
    await expect(days.first()).toContainText('زمان واکنش')

    expect(getErrors()).toEqual([])
  })

  test('با تاریخچه: کارت فعالیت فشردهٔ صفحهٔ اول سلول‌های سطح‌دار دارد و به سیر پیشرفت می‌رود', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await page.goto('/')

    await seedSessions(page, [
      fakeCompletedSession({
        id: 'h-d1',
        exerciseId: 'n-back',
        domain: 'working-memory',
        difficulty: 1,
        accuracy: 90,
        startedAtMs: daysAgoAtNoon(1),
      }),
      fakeCompletedSession({
        id: 'h-d0',
        exerciseId: 'stroop',
        domain: 'attention-control',
        difficulty: 2,
        accuracy: 86,
        startedAtMs: daysAgoAtNoon(0),
      }),
    ])

    // کارت فشرده پس از تازه‌سازی ظاهر می‌شود (رویداد focus آن را بازمی‌گرداند)
    await page.reload()
    const compact = page.getByTestId('home-heatmap')
    await expect(compact).toBeVisible()
    await expect(compact.locator('[data-testid="heat-cell"][data-level="1"]')).toHaveCount(2)

    // کارت، لینک به صفحهٔ سیر پیشرفت است
    await compact.click()
    await expect(page.getByRole('heading', { name: 'سیر پیشرفت' })).toBeVisible()

    expect(getErrors()).toEqual([])
  })
})
