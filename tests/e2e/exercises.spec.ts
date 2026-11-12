import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'
import { faToNumber, openExerciseFromHome, startExercise, waitForResults } from './helpers'

/**
 * E2E مسیر خوش‌بخیت چهار بازی MVP + ماندگاری داده پس از reload.
 * بازی‌ها واقعی و کامل اجرا می‌شوند (نه حالت تست ویژه).
 */

const FA = '۰۱۲۳۴۵۶۷۸۹'

/** ورود پاسخ عددی از طریق صفحه‌کلید لمسی خود برنامه */
async function typeAnswerWithKeypad(page: Page, answer: number): Promise<void> {
  for (const ch of String(answer)) {
    const faDigit = FA[Number(ch)] as string
    await page.getByRole('button', { name: faDigit, exact: true }).click()
  }
  await page.getByRole('button', { name: 'تأیید' }).click()
}

/** حلقه پاسخ به ۲۰ سؤال محاسبه */
async function playFullCalculation(page: Page): Promise<void> {
  for (let i = 0; i < 20; i++) {
    const questionEl = page.getByTestId('calc-question')
    await expect(questionEl).toBeVisible()
    const text = (await questionEl.textContent()) ?? ''
    const match = text.match(/([۰-۹]+)\s*([+\-×÷])\s*([۰-۹]+)/)
    if (!match) throw new Error(`سؤال قابل پارس نبود: ${text}`)
    const a = faToNumber(match[1] as string)
    const b = faToNumber(match[3] as string)
    const op = match[2]
    const answer = op === '+' ? a + b : op === '-' ? a - b : op === '×' ? a * b : a / b
    await typeAnswerWithKeypad(page, answer)
  }
}

test.describe('صفحه اصلی', () => {
  test('چهار بازی MVP از جستجوی خانه پیدا می‌شوند (فهرست تاشو)', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'آزمایشگاه تمرین شناختی' })).toBeVisible()
    // فهرست بخش‌ها تاشوست — حضور هر بازی از مسیر جستجو تأیید می‌شود.
    // «توالی اعداد» در توضیحِ «منطق توالی» هم هست → first (و not strict).
    for (const name of ['توالی اعداد', 'برو / نرو', 'محاسبه × ۲۰', 'شبکه حافظه']) {
      await page.getByTestId('game-search').fill(name)
      await expect(page.getByRole('link', { name: new RegExp(name) }).first()).toBeVisible()
    }
  })
})

test.describe('Calculation × 20', () => {
  test('۲۰ سؤال کامل و نتیجه ذخیره می‌شود', async ({ page }) => {
    await startExercise(page, 'محاسبه × ۲۰', 1)
    await playFullCalculation(page)
    await waitForResults(page)
    await expect(page.getByText('جلسه کامل شد')).toBeVisible()
  })
})

test.describe('Number Sequence', () => {
  test('۱۰ مرحله با ثبت ارقام نمایش‌داده‌شده کامل می‌شود', async ({ page }) => {
    // شروع دستی تا در فاز COUNTDOWN بتوان ضبط‌کننده ارقام را نصب کرد
    await openExerciseFromHome(page, /^توالی اعداد/)
    await page.getByRole('radio', { name: '۱', exact: true }).click()
    await page.getByRole('button', { name: 'ادامه' }).click()
    await page.getByRole('button', { name: 'شروع تمرین' }).click()

    // ضبط ارقام با شمارش «ظاهرشدن از حالت خالی» — مستقل از مقدار رقم
    // (رقم اول مرحله بعد ممکن است با رقم آخر مرحله قبل یکسان باشد)
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
    await expect(page.locator('section[data-phase="ACTIVE"]')).toBeVisible({ timeout: 20_000 })

    for (let trial = 0; trial < 10; trial++) {
      // هر مرحله دقیقاً ۳ رقم ثبت می‌کند → شرط مطلق بدون race:
      // بعد از مرحله n، طول آرایه باید ۳×(n+1) باشد
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
      if (seen.length < 3) throw new Error(`ارقام ثبت‌شده ناقص: ${allDigits.join(',')}`)

      // فاز input: دکمه تأیید ظاهر می‌شود (ابتدا disabled)
      const submitBtn = page.getByRole('button', { name: 'تأیید' })
      await expect(submitBtn).toBeVisible({ timeout: 10_000 })

      for (const faDigit of seen) {
        await page.getByRole('button', { name: faDigit, exact: true }).click()
      }
      // click خودش تا enabled شدن صبر می‌کند
      await submitBtn.click()
      await page.waitForTimeout(1200)
    }

    await waitForResults(page)
  })
})

test.describe('Go / No-Go', () => {
  test('۴۰ محرک: واکنش به دایره و مهار مربع', async ({ page }) => {
    await startExercise(page, 'برو / نرو', 1)
    const area = page.getByRole('button', { name: 'ناحیه پاسخ' })
    const results = page.getByTestId('results')

    // تا رسیدن به صفحه نتایج: هر محرک یا results ظاهر می‌شود
    for (let i = 0; i < 45; i++) {
      const nextThing = page
        .locator('[data-kind="go"], [data-kind="nogo"], [data-testid="results"]')
        .first()
      await expect(nextThing).toBeVisible({ timeout: 10_000 })
      if (await results.isVisible()) break

      const stimulus: Locator = page.locator('[data-kind="go"], [data-kind="nogo"]').first()
      const kind = await stimulus.getAttribute('data-kind')
      if (kind === 'go') {
        await area.click({ force: true, noWaitAfter: true })
      }
      // صبر تا این محرک برداشته شود (مخفی‌شدن یا جایگزینی)
      await page.waitForTimeout(120)
    }

    await waitForResults(page)
    // متریک‌های اختصاصی نمایش داده می‌شوند
    await expect(page.getByText('خطای ارتکاب (واکنش به مربع)').first()).toBeVisible()
    await expect(page.getByText('میانه واکنش به دایره (میلی‌ثانیه)').first()).toBeVisible()
  })
})

test.describe('Memorise Grid', () => {
  test('۱۰ مرحله با خواندن خانه‌های فعال کامل می‌شود', async ({ page }) => {
    await startExercise(page, 'شبکه حافظه', 1)

    for (let trial = 0; trial < 10; trial++) {
      // فاز memorise: خانه‌های active را ثبت کن
      const activeCells = page.locator('[data-active="true"]')
      await expect(activeCells.first()).toBeVisible({ timeout: 10_000 })
      await page.waitForTimeout(200)
      const indices: string[] = []
      const count = await activeCells.count()
      for (let i = 0; i < count; i++) {
        indices.push((await activeCells.nth(i).getAttribute('data-cell-index')) as string)
      }
      expect(indices).toHaveLength(3)

      // فاز recall: صبر تا فاز حفظ تمام شود
      await expect(activeCells.first()).toBeHidden({ timeout: 6000 })
      for (const index of indices) {
        await page.locator(`[data-cell-index="${index}"]`).click()
      }
      await page.getByRole('button', { name: 'تأیید' }).click()
      // بازخورد ~1.4 ثانیه و مرحله بعد
      await page.waitForTimeout(1700)
    }

    await waitForResults(page)
  })
})

test.describe('ماندگاری داده (local-first)', () => {
  test('پس از پایان بازی و reload، گزارش جلسه موجود است', async ({ page }) => {
    await startExercise(page, 'محاسبه × ۲۰', 1)
    await playFullCalculation(page)
    await waitForResults(page)

    // reload → state صفحه ریست می‌شود؛ گزارش از IndexedDB خوانده می‌شود
    await page.goto('/reports')
    await expect(page.getByText('جلسه کامل‌شده')).toBeVisible()
    await expect(page.getByText('محاسبه × ۲۰').first()).toBeVisible()
  })
})
