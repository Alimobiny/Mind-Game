import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { readAllSessions, trackPageErrors } from './qa-helpers'

/**
 * سناریو QA 7 — رفرش (F5) وسط بازی در ۴ الگوی تعاملی:
 * خود-پیش‌رو (محاسبه)، محرک زمان‌بندی‌شده (برو/نرو)، نمایش توالی
 * (توالی اعداد)، زبانی (حافظه واژه‌ها). پس از reload و بوت بعدی،
 * جلسه in_progress باید aborted شود؛ بدون جلسه سرگردان و با گزارش سالم.
 */

interface SessionRow {
  id: string
  exerciseId: string
  status: string
  startedAt: number
}

async function sessionsOf(page: Page, exerciseId: string): Promise<SessionRow[]> {
  const all = (await readAllSessions(page)) as unknown as SessionRow[]
  return all.filter((s) => s.exerciseId === exerciseId)
}

/** شروع بازی از صفحه اصلی تا ACTIVE با انتخاب سطح ۱ */
async function beginExercise(page: Page, linkName: string | RegExp): Promise<void> {
  await page.goto('/')
  await page.getByRole('link', { name: linkName }).click()
  await page.getByRole('radio', { name: '۱', exact: true }).click()
  await page.getByRole('button', { name: 'ادامه' }).click()
  await page.getByRole('button', { name: 'شروع تمرین' }).click()
  await expect(page.locator('section[data-phase="ACTIVE"]')).toBeVisible({ timeout: 20_000 })
}

/** رفرش + بوت بعدی: جلسه قطع‌شده باید aborted و یکتا باشد */
async function expectAbortedAfterReload(page: Page, exerciseId: string): Promise<void> {
  await page.reload()
  // هر صفحه‌ای getAppData را صدا می‌زند → abortStaleSessions اجرا شده است
  await expect(page.getByRole('button', { name: 'ادامه' })).toBeVisible({ timeout: 20_000 })

  await expect
    .poll(async () => (await sessionsOf(page, exerciseId)).map((s) => s.status).join(','), {
      timeout: 10_000,
    })
    .toBe('aborted')

  const sessions = await sessionsOf(page, exerciseId)
  expect(sessions, 'بدون جلسه سرگردان/تکراری — دقیقاً یک رکورد').toHaveLength(1)

  // گزارش‌ها سالم
  await page.goto('/reports')
  await expect(page.getByRole('heading', { name: 'گزارش‌ها' })).toBeVisible()
  await expect(page.getByText('خواندن گزارش‌ها ناموفق بود')).toBeHidden()
}

test.describe('QA7: رفرش وسط بازی — ۴ الگوی تعاملی', () => {
  test('محاسبه ×۲۰ (خود-پیش‌رو): رفرش بعد از دو پاسخ → aborted', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await beginExercise(page, /محاسبه × ۲۰/)
    const FA = '۰۱۲۳۴۵۶۷۸۹'
    for (let i = 0; i < 2; i++) {
      await expect(page.getByTestId('calc-question')).toBeVisible()
      await page.getByRole('button', { name: FA[5] as string, exact: true }).click()
      await page.getByRole('button', { name: 'تأیید' }).click()
      await page.waitForTimeout(150)
    }
    await expectAbortedAfterReload(page, 'calculation-20')
    expect(getErrors()).toEqual([])
  })

  test('برو / نرو (محرک زمان‌بندی‌شده): رفرش وسط محرک → aborted', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await beginExercise(page, /برو \/ نرو/)
    await expect(page.locator('[data-kind="go"], [data-kind="nogo"]').first()).toBeVisible({
      timeout: 15_000,
    })
    await page.waitForTimeout(300)
    await expectAbortedAfterReload(page, 'go-no-go')
    expect(getErrors()).toEqual([])
  })

  test('توالی اعداد (نمایش توالی): رفرش حین نمایش ارقام → aborted', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await beginExercise(page, /^توالی اعداد/)
    await expect(page.getByTestId('ns-digit')).toBeVisible({ timeout: 10_000 })
    await expectAbortedAfterReload(page, 'number-sequence')
    expect(getErrors()).toEqual([])
  })

  test('حافظه واژه‌ها (زبانی): رفرش حین مطالعه واژه‌ها → aborted', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await beginExercise(page, /حافظه واژه‌ها/)
    await page.waitForFunction(
      () => {
        const el = document.querySelector('[data-testid="wm-study-word"]')
        return !!el && (el.textContent ?? '').trim() !== ''
      },
      undefined,
      { timeout: 20_000 },
    )
    await expectAbortedAfterReload(page, 'word-memory')
    expect(getErrors()).toEqual([])
  })
})

test.describe('QA7: بدون انباشت جلسه سرگردان پس از چند رفرش', () => {
  test('دو رفرش متوالی وسط دو بازی — مجموع رکوردها دقیقاً ۲ و همه aborted', async ({ page }) => {
    await beginExercise(page, /محاسبه × ۲۰/)
    await expect(page.getByTestId('calc-question')).toBeVisible()
    await page.reload()
    await expect(page.getByRole('button', { name: 'ادامه' })).toBeVisible({ timeout: 20_000 })

    await beginExercise(page, /برو \/ نرو/)
    await expect(page.locator('[data-kind="go"], [data-kind="nogo"]').first()).toBeVisible({
      timeout: 15_000,
    })
    await page.reload()
    await expect(page.getByRole('button', { name: 'ادامه' })).toBeVisible({ timeout: 20_000 })

    await expect
      .poll(async () => ((await readAllSessions(page)) as unknown as SessionRow[]).length, {
        timeout: 10_000,
      })
      .toBe(2)
    const all = (await readAllSessions(page)) as unknown as SessionRow[]
    expect(all.map((s) => s.status).sort()).toEqual(['aborted', 'aborted'])
    // هیچ جلسه‌ای completed نیست → گزارش‌ها خالی اما سالم
    await page.goto('/reports')
    await expect(page.getByRole('heading', { name: 'گزارش‌ها' })).toBeVisible()
    await expect(page.getByText('خواندن گزارش‌ها ناموفق بود')).toBeHidden()
  })
})
