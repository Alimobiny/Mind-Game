import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'
import { faToNumber, openExerciseFromHome, startExercise, waitForResults } from './helpers'
import {
  countAnsweredEvents,
  expectProgress,
  fireMultiTapInPage,
  readAnsweredCount,
  readTrialEvents,
  toFa,
  trackPageErrors,
} from './qa-helpers'

/**
 * سناریو QA ۱ — تپ سریع/چندگانه روی یک محرک (double-fire):
 * نباید پاسخ دوباره ثبت شود، مرحله‌ای نپرد و شمار مراحل درست بماند.
 * برای دکمه‌های تأییدِ بازی‌های خود-پیش‌رو از dblclick واقعی استفاده
 * می‌شود (دو کلیک پشت‌سرهم در همان لحظه — همان الگوی لمس مضاعف موبایل).
 */

const FA = '۰۱۲۳۴۵۶۷۸۹'

/** حلقه پاسخ صحیح به ۲۰ سؤال محاسبه — هر تأیید با double-click */
async function playCalculationWithDoubleSubmit(page: Page): Promise<void> {
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
    for (const ch of String(answer)) {
      await page.getByRole('button', { name: FA[Number(ch)] as string, exact: true }).click()
    }
    // تپ مضاعف روی تأیید — باید فقط یک پاسخ ثبت شود
    await page.getByRole('button', { name: 'تأیید' }).dblclick()
  }
}

test.describe('QA1: double-fire در بازی‌های زمان‌بندی‌شده', () => {
  test('Go/No-Go: سه ضربه پشت‌سرهم روی ناحیه پاسخ فقط یک پاسخ ثبت می‌کند', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await startExercise(page, 'برو / نرو', 1)

    // صبر برای اولین محرک Go (ممکن است اولین محرک No-Go باشد که با مهلت
    // خودش پاسخ داده می‌شود — پس پیشرفت مطلق قابل ادعا نیست، نسبی است)
    const go = page.locator('[data-kind="go"]').first()
    await expect(go).toBeVisible({ timeout: 15_000 })
    const before = await readAnsweredCount(page)
    // سه pointerdown در همان تسک JS — هم‌ارز تپ‌های فوق‌سریع روی یک محرک
    await fireMultiTapInPage(page, 'button[aria-label="ناحیه پاسخ"]', 3, 'pointerdown')

    // دقیقاً یک پاسخ اضافه شده باشد (نه ۲/۳)
    await expect(page.locator('section[data-phase] header')).toContainText(
      `${toFa(before + 1)} / ${toFa(40)}`,
    )
    // و در رویدادهای خام فقط یک رویداد با پاسخ واقعی 'tap' باشد
    const events = await readTrialEvents(page)
    expect(countAnsweredEvents(events)).toBe(1)
    expect(getErrors()).toEqual([])
  })

  test('Stroop: دوبل‌کلیک روی دکمه رنگ فقط یک پاسخ ثبت می‌کند', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    const STROOP_LABELS: Readonly<Record<string, string>> = {
      red: 'قرمز',
      blue: 'آبی',
      green: 'سبز',
      yellow: 'زرد',
    }
    await startExercise(page, 'استرووپ', 1)
    const word = page.getByTestId('stroop-word')
    await expect(word).toBeVisible({ timeout: 15_000 })
    const ink = (await word.getAttribute('data-ink')) as string
    await page.getByRole('button', { name: STROOP_LABELS[ink] as string, exact: true }).dblclick()

    await expectProgress(page, 1, 20)
    expect(getErrors()).toEqual([])
  })

  test('N-Back: دو ضربه پشت‌سرهم روی «تطبیق» فقط یک پاسخ ثبت می‌کند', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await startExercise(page, '^ان-بک(?! دوگانه)', 1)  // لنگر ^: کارت «ان-بک دوگانه» هم پیشوند است
    // صبر برای اولین هدف واقعی (data-is-target=true و حرف نمایش‌داده‌شده).
    // مهلت مراحل قبل شمرده می‌شود؛ پیشرفت مطلق قابل ادعا نیست.
    await page.waitForFunction(
      () => {
        const el = document.querySelector('[data-testid="nback-letter"]')
        const text = el ? (el.textContent ?? '').trim() : ''
        return text !== '' && text !== '+' && el?.getAttribute('data-is-target') === 'true'
      },
      undefined,
      { timeout: 30_000 },
    )
    const before = await readAnsweredCount(page)
    // دو کلیک در همان تسک JS — هر دو روی همان مرحله فرود می‌آیند
    await fireMultiTapInPage(page, '[data-testid="nback-match"]', 2, 'click')

    await expect(page.locator('section[data-phase] header')).toContainText(
      `${toFa(before + 1)} / ${toFa(25)}`,
    )
    // در رویدادهای خام دقیقاً یک 'match' ثبت شده باشد
    const events = await readTrialEvents(page)
    expect(events.filter((e) => e.given === 'match')).toHaveLength(1)
    expect(getErrors()).toEqual([])
  })

  test('Reaction Time: سه ضربه سریع پس از محرک فقط یک مرحله ثبت می‌کند', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await startExercise(page, 'زمان واکنش', 1)
    const stimulus = page.getByTestId('rt-stimulus')
    await expect(stimulus).toBeVisible({ timeout: 15_000 })
    const tapArea = page.getByRole('button', { name: 'ناحیه پاسخ' })
    await tapArea.click({ force: true, noWaitAfter: true, clickCount: 3 })

    await expectProgress(page, 1, 10)
    expect(getErrors()).toEqual([])
  })
})

test.describe('QA1: double-fire روی دکمه تأیید بازی‌های خود-پیش‌رو', () => {
  test('Calculation ×20: دوبل‌کلیک تأیید در هر ۲۰ سؤال — نتایج دقیق', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await startExercise(page, 'محاسبه × ۲۰', 1)
    await playCalculationWithDoubleSubmit(page)
    await waitForResults(page)

    // بدون پاسخ تکراری/پریده: همه ۲۰ مرحله درست
    await expect(page.getByText('جلسه کامل شد')).toBeVisible()
    const correctCard = page.locator('div', { hasText: 'پاسخ درست' }).getByText(toFa(20))
    await expect(correctCard.first()).toBeVisible()
    expect(getErrors()).toEqual([])
  })

  test('Number Sequence: دوبل‌کلیک تأیید با پاسخ درست — بازخورد «درست!» و بدون خطای صفحه', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await openExerciseFromHome(page, /^توالی اعداد/)
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
    await expect(page.locator('section[data-phase="ACTIVE"]')).toBeVisible({ timeout: 20_000 })
    await page.waitForFunction(
      () => (window as unknown as { __nsDigits: string[] }).__nsDigits.length >= 3,
      undefined,
      { timeout: 20_000 },
    )
    const seen = (await page.evaluate(
      () => (window as unknown as { __nsDigits: string[] }).__nsDigits,
    )) as string[]

    const submitBtn = page.getByRole('button', { name: 'تأیید' })
    await expect(submitBtn).toBeVisible({ timeout: 10_000 })
    for (const faDigit of seen.slice(-3)) {
      await page.getByRole('button', { name: faDigit, exact: true }).click()
    }
    // تپ مضاعف روی تأیید — پاسخ درست است؛ بازخورد باید «درست!» باشد نه «نادرست»
    await submitBtn.dblclick()

    await expect(page.getByText('درست!')).toBeVisible({ timeout: 5_000 })
    // دقیقاً یک مرحله پاسخ داده شده باشد (دوبله ثبت نشده)
    await expectProgress(page, 1, 10)
    // صبر از بازخورد عبور کنیم؛ هیچ استثنای مهارنشده (مثل advance دوباره) نباشد
    await page.waitForTimeout(1500)
    expect(getErrors()).toEqual([])
  })

  test('Memorise Grid: دوبل‌کلیک تأیید با پاسخ درست — بازخورد «کامل و درست!»', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await startExercise(page, 'شبکه حافظه', 1)

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
    const confirm = page.getByRole('button', { name: 'تأیید' })
    await confirm.dblclick()

    await expect(page.getByText('کامل و درست!')).toBeVisible({ timeout: 5_000 })
    await expectProgress(page, 1, 10)
    await page.waitForTimeout(2000)
    expect(getErrors()).toEqual([])
  })

  test('Spatial Sequence: دوبل‌کلیک تأیید با پاسخ درست — بازخورد «درست!»', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await startExercise(page, 'توالی مکانی', 1)

    await page.waitForFunction(
      () => {
        const w = window as unknown as { __spatialOrder?: string[]; __spatialLast?: string }
        w.__spatialOrder ??= []
        const el = document.querySelector('[data-active="true"]')
        const cell = el ? (el.getAttribute('data-cell-index') ?? '') : ''
        if (cell && cell !== w.__spatialLast) {
          w.__spatialLast = cell
          w.__spatialOrder.push(cell)
        }
        return w.__spatialOrder.length >= 3
      },
      undefined,
      { timeout: 15_000 },
    )
    const order = (await page.evaluate(() => {
      const w = window as unknown as { __spatialOrder?: string[] }
      return w.__spatialOrder ?? []
    })) as string[]

    const confirm = page.getByTestId('spatial-confirm')
    await expect(confirm).toBeVisible({ timeout: 10_000 })
    for (const cellIndex of order.slice(0, 3)) {
      await page.locator(`[data-cell-index="${cellIndex}"]`).click()
    }
    await confirm.dblclick()

    await expect(page.getByText('درست!')).toBeVisible({ timeout: 5_000 })
    await expectProgress(page, 1, 10)
    await page.waitForTimeout(2000)
    expect(getErrors()).toEqual([])
  })

  test('Word Memory: دوبل‌کلیک تأیید با پاسخ درست — بازخورد «کامل و درست!»', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await startExercise(page, 'حافظه واژه‌ها', 1)

    await page.waitForFunction(
      () => {
        const w = window as unknown as { __wmWords?: string[]; __wmLast?: string }
        w.__wmWords ??= []
        const el = document.querySelector('[data-testid="wm-study-word"]')
        const word = el ? (el.textContent ?? '').trim() : ''
        if (word && word !== w.__wmLast) {
          w.__wmLast = word
          w.__wmWords.push(word)
        }
        return w.__wmWords.length >= 4
      },
      undefined,
      { timeout: 20_000 },
    )
    const studied = (await page.evaluate(() => {
      const w = window as unknown as { __wmWords?: string[] }
      return w.__wmWords ?? []
    })) as string[]

    const confirm = page.getByTestId('wm-confirm')
    await expect(confirm).toBeVisible({ timeout: 15_000 })
    for (const word of studied.slice(0, 4)) {
      await page.getByRole('button', { name: word, exact: true }).click()
    }
    await confirm.dblclick()

    await expect(page.getByText('کامل و درست!')).toBeVisible({ timeout: 5_000 })
    await expectProgress(page, 1, 6)
    await page.waitForTimeout(1900)
    expect(getErrors()).toEqual([])
  })
})

/** یارکمک: همه دکمه‌های گزینه در بازی‌های استدلال هم فقط یک پاسخ باید ثبت کنند */
test.describe('QA1: double-fire روی گزینه‌های استدلال', () => {
  test('Pattern Completion: دوبل‌کلیک روی گزینه فقط یک مرحله جلو می‌برد', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await startExercise(page, 'تکمیل الگو', 1)
    const option: Locator = page.locator('[data-testid="pattern-option"]').first()
    await expect(option).toBeVisible({ timeout: 10_000 })
    await option.dblclick()
    await expectProgress(page, 1, 12)
    expect(getErrors()).toEqual([])
  })

  test('Sequence Logic: دوبل‌کلیک روی گزینه فقط یک مرحله جلو می‌برد', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await startExercise(page, 'منطق توالی', 1)
    const option: Locator = page.locator('[data-testid="seq-option"]').first()
    await expect(option).toBeVisible({ timeout: 10_000 })
    await option.dblclick()
    await expectProgress(page, 1, 12)
    expect(getErrors()).toEqual([])
  })
})
