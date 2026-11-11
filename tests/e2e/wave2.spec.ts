import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { startExercise, waitForResults, waitProgressAdvance } from './helpers'

/**
 * E2E موج دوم — چهار بازی جدید: Stroop، Reaction Time، N-Back،
 * Spatial Sequence. بازی‌ها کامل و واقعی اجرا می‌شوند.
 */

const STROOP_LABELS: Readonly<Record<string, string>> = {
  red: 'قرمز',
  blue: 'آبی',
  green: 'سبز',
  yellow: 'زرد',
}

test.describe('Stroop (تمرین رنگ‌ها)', () => {
  test('۲۰ محرک: انتخاب رنگ جوهر بر اساس data-ink', async ({ page }) => {
    await startExercise(page, 'استرووپ', 1)
    const results = page.getByTestId('results')

    // صبر تا ثبت پاسخ با شمارندهٔ هدر — نه تغییر رنگ جوهر (محرک هم‌رنگِ
    // متوالی ممکن است و آنگاه تغییر ink هرگز رخ نمی‌دهد و تست تایم‌اوت می‌خورد)
    let progress = 0
    for (let i = 0; i < 20; i++) {
      if (await results.isVisible().catch(() => false)) break
      const word = page.getByTestId('stroop-word')
      await expect(word).toBeVisible({ timeout: 10_000 })
      const ink = (await word.getAttribute('data-ink')) as string
      const label = STROOP_LABELS[ink]
      if (!label) throw new Error(`رنگ جوهر ناشناخته: ${ink}`)
      await page.getByRole('button', { name: label, exact: true }).click()
      progress = await waitProgressAdvance(page, progress)
    }

    await waitForResults(page)
    await expect(page.getByText('جلسه کامل شد')).toBeVisible()
  })
})

test.describe('Reaction Time', () => {
  test('۱۰ محرک: تپ سریع پس از ظاهرشدن محرک', async ({ page }) => {
    await startExercise(page, 'زمان واکنش', 1)
    const tapArea = page.getByRole('button', { name: 'ناحیه پاسخ' })

    for (let i = 0; i < 10; i++) {
      // صبر برای محرک (jitter تا ۳ ثانیه در سطح ۱)
      const stimulus = page.getByTestId('rt-stimulus')
      await expect(stimulus).toBeVisible({ timeout: 15_000 })
      await tapArea.click({ force: true, noWaitAfter: true })
      // صبر تا این محرک برداشته شود (advance فوری یا پایان جلسه)
      await expect(stimulus).toBeHidden({ timeout: 5000 })
    }

    await waitForResults(page)
    await expect(page.getByText('جلسه کامل شد')).toBeVisible()
  })
})

test.describe('N-Back', () => {
  test('۲۵ محرک: تطبیق فقط برای اهداف (خواندن data-is-target)', async ({ page }) => {
    await startExercise(page, 'ان-بک', 1)
    const matchButton = page.getByTestId('nback-match')
    const letter = page.getByTestId('nback-letter')

    const results = page.getByTestId('results')
    for (let i = 0; i < 25; i++) {
      // صبر تا حرف نمایش داده شود (در ISI علامت + است، نه حرف) — یا پایان جلسه
      await page.waitForFunction(
        () => {
          if (document.querySelector('[data-testid="results"]')) return true
          const el = document.querySelector('[data-testid="nback-letter"]')
          const text = el ? (el.textContent ?? '').trim() : ''
          return text !== '' && text !== '+'
        },
        undefined,
        { timeout: 15_000 },
      )
      if (await results.isVisible().catch(() => false)) break
      const isTarget = (await letter.getAttribute('data-is-target')) === 'true'
      if (isTarget) {
        await matchButton.click()
      }
      // صبر تا حرف به + برگردد (ISI) یا جلسه تمام شود → محرک بعدی sync می‌شود
      await page.waitForFunction(
        () => {
          if (document.querySelector('[data-testid="results"]')) return true
          const el = document.querySelector('[data-testid="nback-letter"]')
          const text = el ? (el.textContent ?? '').trim() : ''
          return !el || text === '' || text === '+'
        },
        undefined,
        { timeout: 8000 },
      )
      if (await results.isVisible().catch(() => false)) break
    }

    await waitForResults(page)
    await expect(page.getByText('جلسه کامل شد')).toBeVisible()
  })
})

test.describe('Spatial Sequence', () => {
  test('۱۰ مرحله: بازسازی ترتیب خانه‌های فعال', async ({ page }) => {
    await startExercise(page, 'توالی مکانی', 1)

    for (let trial = 0; trial < 10; trial++) {
      // ثبت ترتیب خانه‌های فعال با polling داخل صفحه (waitForFunction مکرر اجرا می‌شود)
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
      if (order.length < 3) throw new Error(`ترتیب ثبت‌شده ناقص: ${order.join(',')}`)

      // فاز بازسازی: دکمه تأیید ظاهر می‌شود
      const confirmBtn = page.getByTestId('spatial-confirm')
      await expect(confirmBtn).toBeVisible({ timeout: 10_000 })
      for (const cellIndex of order.slice(0, 3)) {
        await page.locator(`[data-cell-index="${cellIndex}"]`).click()
      }
      await confirmBtn.click()

      // ریست ضبط و صبر بازخورد
      await page.evaluate(() => {
        const w = window as unknown as { __spatialOrder?: string[]; __spatialLast?: string }
        w.__spatialOrder = []
        w.__spatialLast = ''
      })
      await page.waitForTimeout(1700)
    }

    await waitForResults(page)
  })
})
