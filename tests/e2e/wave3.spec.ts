import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { startExercise, waitForResults, waitProgressAdvance } from './helpers'

/**
 * E2E موج سوم — چهار بازی جدید + Export/Import (انتقال به «دستگاه دیگر»).
 */

const FA = '۰۱۲۳۴۵۶۷۸۹'

test.describe('Word Memory', () => {
  test('۶ بلوک: ثبت کلمات مطالعه و انتخاب همان‌ها', async ({ page }) => {
    await startExercise(page, 'حافظه واژه‌ها', 1)

    for (let block = 0; block < 6; block++) {
      // ضبط کلمات فاز مطالعه (سطح ۱: ۴ کلمه) با polling داخل صفحه
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

      // فاز بازیابی: دکمه تأیید ظاهر می‌شود
      const confirm = page.getByTestId('wm-confirm')
      await expect(confirm).toBeVisible({ timeout: 15_000 })
      for (const word of studied.slice(0, 4)) {
        await page.getByRole('button', { name: word, exact: true }).click()
      }
      await confirm.click()

      await page.evaluate(() => {
        const w = window as unknown as { __wmWords?: string[]; __wmLast?: string }
        w.__wmWords = []
        w.__wmLast = ''
      })
      await page.waitForTimeout(1600)
    }

    await waitForResults(page)
  })
})

test.describe('Syllable Counting', () => {
  test('۱۲ سؤال: ورود عدد و تأیید', async ({ page }) => {
    await startExercise(page, 'شمارش هجا', 1)

    let progress = 0
    for (let i = 0; i < 12; i++) {
      const sentence = page.getByTestId('syllable-sentence')
      await expect(sentence).toBeVisible({ timeout: 10_000 })
      const text = (await sentence.textContent()) ?? ''
      if (!text.trim()) throw new Error('جمله خالی')
      // ورود پاسخ ثابت (E2E فقط جریان را می‌سنجد؛ دقت در unit تست شده)
      await page.getByRole('button', { name: FA[5], exact: true }).click()
      await page.getByRole('button', { name: 'تأیید' }).click()
      // انتقال به مرحلهٔ بعد — با شمارندهٔ trialIndex (جملهٔ تکراری ممکن است)
      progress = await waitProgressAdvance(page, progress)
    }

    await waitForResults(page)
  })
})

test.describe('Sequence Logic', () => {
  test('۱۲ سؤال: انتخاب گزینه', async ({ page }) => {
    await startExercise(page, 'منطق توالی', 1)

    for (let i = 0; i < 12; i++) {
      const shown = page.getByTestId('seq-shown')
      await expect(shown).toBeVisible({ timeout: 10_000 })
      await page.locator('[data-testid="seq-option"]').first().click()
      await page.waitForTimeout(120)
    }

    await waitForResults(page)
  })
})

test.describe('Pattern Completion', () => {
  test('۱۲ سؤال: انتخاب گزینه', async ({ page }) => {
    await startExercise(page, 'تکمیل الگو', 1)

    for (let i = 0; i < 12; i++) {
      const matrix = page.getByTestId('pattern-matrix')
      await expect(matrix).toBeVisible({ timeout: 10_000 })
      await page.locator('[data-testid="pattern-option"]').first().click()
      await page.waitForTimeout(120)
    }

    await waitForResults(page)
  })
})

test.describe('Export / Import', () => {
  test('انتقال کامل داده به یک context جدید (دستگاه دیگر)', async ({ page, browser }) => {
    // ۱) یک جلسه کامل انجام بده تا داده‌ای برای انتقال وجود داشته باشد
    await startExercise(page, 'محاسبه × ۲۰', 1)
    for (let i = 0; i < 20; i++) {
      const questionEl = page.getByTestId('calc-question')
      await expect(questionEl).toBeVisible()
      const text = (await questionEl.textContent()) ?? ''
      const match = text.match(/([۰-۹]+)\s*([+\-×÷])\s*([۰-۹]+)/)
      if (!match) throw new Error(`سؤال قابل پارس نبود: ${text}`)
      const toNum = (s: string) => [...s].reduce((acc, ch) => acc * 10 + FA.indexOf(ch), 0)
      const a = toNum(match[1] as string)
      const b = toNum(match[3] as string)
      const op = match[2]
      const answer = op === '+' ? a + b : op === '-' ? a - b : op === '×' ? a * b : a / b
      for (const ch of String(answer)) {
        await page.getByRole('button', { name: FA[Number(ch)], exact: true }).click()
      }
      await page.getByRole('button', { name: 'تأیید' }).click()
    }
    await waitForResults(page)

    // ۲) خروجی پشتیبان بگیر
    await page.goto('/reports')
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: 'خروجی پشتیبان (JSON)' }).click()
    const download = await downloadPromise
    const backupPath = `test-results/backup-e2e-${Date.now()}.json`
    await download.saveAs(backupPath)

    // ۳) «دستگاه جدید»: context تازه (IndexedDB خالی)
    const freshContext = await browser.newContext({ locale: 'fa-IR' })
    const freshPage: Page = await freshContext.newPage()
    await freshPage.goto('/reports')
    await expect(freshPage.getByText('هنوز جلسه‌ای کامل نشده است')).toBeVisible()

    // ۴) بازیابی فایل پشتیبان → داده برگشت
    await freshPage.setInputFiles('input[type="file"]', backupPath)
    await expect(freshPage.getByText(/بازیابی شد/)).toBeVisible({ timeout: 15_000 })
    await expect(freshPage.getByText('جلسه کامل‌شده')).toBeVisible({ timeout: 15_000 })
    await expect(freshPage.getByText('محاسبه × ۲۰').first()).toBeVisible()

    await freshContext.close()
  })
})
