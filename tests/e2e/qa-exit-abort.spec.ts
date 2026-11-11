import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { startExercise, waitForActive } from './helpers'
import { dualConfirmExit, readAllSessions, trackPageErrors } from './qa-helpers'

/**
 * سناریو QA 2 — خروج دوتایی-تأیید وسط بازی در مراحل مختلف:
 * جلسه باید با وضعیت aborted ثبت شود و صفحه گزارش‌ها سالم بماند.
 * وضعیت جلسه مستقیماً از IndexedDB خوانده می‌شود (منبع حقیقت).
 */

/** آخرین جلسه یک تمرین خاص از IndexedDB */
async function latestSession(page: Page, exerciseId: string) {
  const sessions = await readAllSessions(page)
  const mine = sessions.filter((s) => s.exerciseId === exerciseId)
  return mine.sort((a, b) => b.startedAt - a.startedAt)[0] ?? null
}

/**
 * انتظار برای وضعیت نهایی جلسه در IndexedDB — مرز sync درست «داده» است
 * (فاز ABORTED حالا پس از commit دیتابیس عوض می‌شود، ولی poll می‌مانیم).
 */
async function expectSessionStatus(
  page: Page,
  exerciseId: string,
  status: 'aborted' | 'completed',
) {
  await expect
    .poll(async () => (await latestSession(page, exerciseId))?.status, { timeout: 10_000 })
    .toBe(status)
}

/** صفحه گزارش‌ها سالم است: بدون کرش و بدون پیام خطا */
async function expectReportsHealthy(page: Page): Promise<void> {
  await page.goto('/reports')
  await expect(page.getByRole('heading', { name: 'گزارش‌ها' })).toBeVisible()
  await expect(page.getByText('خواندن گزارش‌ها ناموفق بود')).toBeHidden()
  await expect(page.getByText('در حال خواندن داده‌ها…')).toBeHidden({ timeout: 15_000 })
}

test.describe('QA2: خروج دوتایی-تأیید حین اجرا', () => {
  test('Go/No-Go وسط محرک‌ها: جلسه aborted ثبت و گزارش‌ها سالم', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await startExercise(page, 'برو / نرو', 1)
    // صبر برای اولین محرک → در میانه جلسه خارج شو
    await expect(page.locator('[data-kind="go"], [data-kind="nogo"]').first()).toBeVisible({
      timeout: 15_000,
    })

    await dualConfirmExit(page)
    await expect(page.locator('section[data-phase="ABORTED"]')).toBeVisible({ timeout: 10_000 })

    await expectSessionStatus(page, 'go-no-go', 'aborted')
    const record = await latestSession(page, 'go-no-go')
    expect(record?.endedAt).not.toBeNull()

    await expectReportsHealthy(page)
    expect(getErrors()).toEqual([])
  })

  test('Calculation ×20 بین دو سؤال: جلسه aborted ثبت و گزارش‌ها سالم', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await startExercise(page, 'محاسبه × ۲۰', 1)
    await expect(page.getByTestId('calc-question')).toBeVisible()

    await dualConfirmExit(page)
    await expect(page.locator('section[data-phase="ABORTED"]')).toBeVisible({ timeout: 10_000 })

    await expectSessionStatus(page, 'calculation-20', 'aborted')

    await expectReportsHealthy(page)
    expect(getErrors()).toEqual([])
  })

  test('Number Sequence حین نمایش ارقام: جلسه aborted ثبت و گزارش‌ها سالم', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await startExercise(page, '^توالی اعداد', 1)
    await expect(page.getByTestId('ns-digit')).toBeVisible({ timeout: 10_000 })

    await dualConfirmExit(page)
    await expect(page.locator('section[data-phase="ABORTED"]')).toBeVisible({ timeout: 10_000 })

    await expectSessionStatus(page, 'number-sequence', 'aborted')

    await expectReportsHealthy(page)
    expect(getErrors()).toEqual([])
  })
})

test.describe('QA2: خروج از صفحه دستورالعمل (قبل از شروع)', () => {
  test('خروج از دستورالعمل هم جلسه را aborted ثبت می‌کند (نه in_progress رهاشده)', async ({
    page,
  }) => {
    const getErrors = trackPageErrors(page)
    await page.goto('/play/go-no-go')
    await page.getByRole('button', { name: 'ادامه' }).click()
    await expect(page.getByTestId('instructions')).toBeVisible()

    // دکمه خروج صفحه دستورالعمل (بدون تأیید دوم — جلسه هنوز شروع نشده)
    await page.getByRole('button', { name: 'بازگشت به فهرست' }).click()
    await expect(page.getByRole('button', { name: 'ادامه' })).toBeVisible({ timeout: 10_000 })

    // جلسه با start() ساخته شده بود؛ خروج باید آن را aborted کند نه in_progress رهاشده
    await expectSessionStatus(page, 'go-no-go', 'aborted')
    expect(getErrors()).toEqual([])
  })
})

test.describe('QA2: پس از آخرین پاسخ تا نتایج — بدون خطای صفحه', () => {
  test('Number Sequence کامل: پس از آخرین پاسخ هیچ advance دومی روی جلسه تمام‌شده پرتاب نمی‌شود', async ({
    page,
  }) => {
    const getErrors = trackPageErrors(page)
    await page.goto('/')
    await page.getByRole('link', { name: /^توالی اعداد/ }).click()
    await page.getByRole('radio', { name: '۱', exact: true }).click()
    await page.getByRole('button', { name: 'ادامه' }).click()
    await page.getByRole('button', { name: 'شروع تمرین' }).click()

    // ضبط ارقام با شمارش «ظاهرشدن از حالت خالی»
    await page.evaluate(() => {
      const w = window as unknown as { __nsDigits: string[]; __nsOccupied: boolean }
      w.__nsDigits = []
      w.__nsOccupied = false
      new MutationObserver(() => {
        const el = document.querySelector('[data-testid="ns-digit"]')
        const text = el ? (el.textContent ?? '').trim() : ''
        if (text && !w.__nsOccupied) {
          w.__nsOccupied = true
          w.__nsDigits.push(text)
        }
        if (!text) w.__nsOccupied = false
      }).observe(document.body, { childList: true, subtree: true, characterData: true })
    })
    await waitForActive(page)

    for (let trial = 0; trial < 10; trial++) {
      const needed = (trial + 1) * 3
      await page.waitForFunction(
        (target) => (window as unknown as { __nsDigits: string[] }).__nsDigits.length >= target,
        needed,
        { timeout: 20_000 },
      )
      const allDigits = (await page.evaluate(
        () => (window as unknown as { __nsDigits: string[] }).__nsDigits,
      )) as string[]
      const seen = allDigits.slice(-3)
      const submitBtn = page.getByRole('button', { name: 'تأیید' })
      await expect(submitBtn).toBeVisible({ timeout: 10_000 })
      for (const faDigit of seen) {
        await page.getByRole('button', { name: faDigit, exact: true }).click()
      }
      await submitBtn.click()
      // بازخورد آخرین مرحله ~850ms — advance بعد از پایان جلسه نباید پرتاب شود
      await page.waitForTimeout(950)
    }

    await expect(page.getByTestId('results')).toBeVisible({ timeout: 15_000 })
    // مهلت کافی برای هر تایمر advance باقی‌مانده
    await page.waitForTimeout(1200)
    expect(getErrors()).toEqual([])

    const record = await latestSession(page, 'number-sequence')
    expect(record?.status).toBe('completed')
    expect(record?.trialCount).toBe(10)
  })

  test('Pattern Completion کامل: کلیک آخرین گزینه advance روی جلسه تمام‌شده نمی‌زند', async ({
    page,
  }) => {
    const getErrors = trackPageErrors(page)
    await startExercise(page, 'تکمیل الگو', 1)
    for (let i = 0; i < 12; i++) {
      await page.locator('[data-testid="pattern-option"]').first().click()
      await page.waitForTimeout(120)
    }
    await expect(page.getByTestId('results')).toBeVisible({ timeout: 30_000 })
    await page.waitForTimeout(600)
    expect(getErrors()).toEqual([])
  })

  test('Memorise Grid کامل: بدون خطای صفحه پس از آخرین تأیید', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await startExercise(page, 'شبکه حافظه', 1)
    for (let trial = 0; trial < 10; trial++) {
      const activeCells = page.locator('[data-active="true"]')
      await expect(activeCells.first()).toBeVisible({ timeout: 10_000 })
      await page.waitForTimeout(200)
      const indices: string[] = []
      const count = await activeCells.count()
      for (let i = 0; i < count; i++) {
        indices.push((await activeCells.nth(i).getAttribute('data-cell-index')) as string)
      }
      await expect(activeCells.first()).toBeHidden({ timeout: 6000 })
      for (const index of indices) {
        await page.locator(`[data-cell-index="${index}"]`).click()
      }
      await page.getByRole('button', { name: 'تأیید' }).click()
      await page.waitForTimeout(1500)
    }
    await expect(page.getByTestId('results')).toBeVisible({ timeout: 15_000 })
    await page.waitForTimeout(1200)
    expect(getErrors()).toEqual([])
  })
})

test.describe('QA2+: خروج در فاز شمارش معکوس', () => {
  // تصمیم طراحی رفع‌شده: دکمهٔ خروج حالا در ۳ ثانیهٔ شمارش معکوس هم هست
  test('Go/No-Go وسط شمارش معکوس: دکمه خروج موجود و جلسه aborted ثبت می‌شود', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await page.goto('/')
    await page.getByRole('link', { name: 'برو / نرو' }).click()
    await page.getByRole('radio', { name: '۱', exact: true }).click()
    await page.getByRole('button', { name: 'ادامه' }).click()
    await expect(page.getByTestId('instructions')).toBeVisible()
    await page.getByRole('button', { name: 'شروع تمرین' }).click()
    // میانهٔ شمارش معکوس: عدد بزرگ آمادگی دیده می‌شود
    await expect(page.locator('section[data-phase="COUNTDOWN"]')).toBeVisible({ timeout: 10_000 })

    // دکمهٔ خروج در همین فاز باید موجود باشد (قبلاً نبود)
    await dualConfirmExit(page)
    await expect(page.locator('section[data-phase="ABORTED"]')).toBeVisible({ timeout: 10_000 })

    await expectSessionStatus(page, 'go-no-go', 'aborted')
    await expectReportsHealthy(page)
    expect(getErrors()).toEqual([])
  })
})
