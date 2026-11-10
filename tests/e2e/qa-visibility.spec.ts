import { expect, test } from '@playwright/test'
import { startExercise } from './helpers'
import { readAnsweredCount, readTrialEvents, setDocumentHidden, toFa, trackPageErrors } from './qa-helpers'

/**
 * سناریو QA 3 — visibilitychange وسط بازی زمان‌بندی‌شده:
 * توقف خودکار باید درگیر شود؛ پس از ادامه، مهلت‌ها به‌درستی ادامه یابند
 * و زمان واکنش ثبت‌شده آلوده به مدت pause نشود.
 *
 * نکته sync: مرز «محرک مخفی/نتایج» اینجا کافی نیست؛ مهلت‌ها با رویدادهای
 * خام IndexedDB و شمارنده هدر راستی‌آزمایی می‌شوند.
 */

test.describe('QA3: توقف خودکار با visibilitychange', () => {
  test('Go/No-Go: pause درگیر می‌شود، مهلت پس از ادامه کار می‌کند و RT آلوده نمی‌شود', async ({
    page,
  }) => {
    const getErrors = trackPageErrors(page)
    await startExercise(page, 'برو / نرو', 1)
    await expect(page.locator('[data-kind="go"]').first()).toBeVisible({ timeout: 15_000 })

    // مخفی‌کردن صفحه وسط محرک (پاسخ نداده‌ایم)
    await setDocumentHidden(page, true)
    await expect(page.getByRole('dialog', { name: 'تمرین متوقف شد' })).toBeVisible({
      timeout: 5_000,
    })
    await page.waitForTimeout(2500) // مدت «غایب‌بودن» کاربر

    // بازگشت به صفحه و ادامه
    await setDocumentHidden(page, false)
    await page.getByRole('button', { name: 'ادامه', exact: true }).click()
    await expect(page.locator('section[data-phase="ACTIVE"]')).toBeVisible({ timeout: 5_000 })

    // پاسخ به همان محرک پس از ادامه — پاسخ باید پذیرفته شود
    const before = await readAnsweredCount(page)
    await page.getByRole('button', { name: 'ناحیه پاسخ' }).click({ force: true, noWaitAfter: true })
    await expect(page.locator('section[data-phase] header')).toContainText(
      `${toFa(before + 1)} / ${toFa(40)}`,
    )

    // مهلت‌ها همچنان کار می‌کنند: بدون ورودی کاربر، شمارنده باید پیش برود
    await expect
      .poll(async () => readAnsweredCount(page), { timeout: 8_000 })
    .toBeGreaterThan(before + 1)

    // RT ثبت‌شده نباید مدت ۲.۵ ثانیه pause را شامل شود (پنجره سطح ۱ = ۱۸۴۰ms)
    const events = await readTrialEvents(page)
    const answered = events.filter((e) => e.given === 'tap')
    expect(answered.length).toBeGreaterThanOrEqual(1)
    for (const e of answered) {
      expect(e.reactionTimeMs as number).toBeLessThan(1840)
    }
    expect(getErrors()).toEqual([])
  })

  test('N-Back: پس از pause و resume، مهلت مراحل بدون ورودی کاربر ادامه می‌یابد', async ({
    page,
  }) => {
    const getErrors = trackPageErrors(page)
    await startExercise(page, 'ان-بک', 1)
    await page.waitForFunction(
      () => {
        const el = document.querySelector('[data-testid="nback-letter"]')
        const text = el ? (el.textContent ?? '').trim() : ''
        return text !== '' && text !== '+'
      },
      undefined,
      { timeout: 20_000 },
    )

    // غیبت کاربر وسط محرک
    await setDocumentHidden(page, true)
    await expect(page.getByRole('dialog', { name: 'تمرین متوقف شد' })).toBeVisible({
      timeout: 5_000,
    })
    await page.waitForTimeout(2500)
    const duringPause = await readAnsweredCount(page)

    // حین pause هیچ پاسخی ثبت نمی‌شود (مهارت‌سنجی پس‌زمینه نامعتبر است)
    await page.waitForTimeout(300)
    expect(await readAnsweredCount(page)).toBe(duringPause)

    await setDocumentHidden(page, false)
    await page.getByRole('button', { name: 'ادامه', exact: true }).click()
    await expect(page.locator('section[data-phase="ACTIVE"]')).toBeVisible({ timeout: 5_000 })

    // بدون هیچ لمسی، مهلت مرحله باید پس از ادامه منقضی و پیشروی کند
    await expect
      .poll(async () => readAnsweredCount(page), { timeout: 8_000 })
      .toBeGreaterThan(duringPause)
    expect(getErrors()).toEqual([])
  })

  test('Stroop: pause/resume — محرک بعدی پس از پاسخ درست می‌آید و جلسه سالم می‌ماند', async ({
    page,
  }) => {
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

    await setDocumentHidden(page, true)
    await expect(page.getByRole('dialog', { name: 'تمرین متوقف شد' })).toBeVisible({
      timeout: 5_000,
    })
    await page.waitForTimeout(2500)
    await setDocumentHidden(page, false)
    await page.getByRole('button', { name: 'ادامه', exact: true }).click()
    await expect(page.locator('section[data-phase="ACTIVE"]')).toBeVisible({ timeout: 5_000 })

    // پاسخ صحیح به محرک جاری (همان کلمه — جای خودش مانده)
    const ink = (await word.getAttribute('data-ink')) as string
    await page.getByRole('button', { name: STROOP_LABELS[ink] as string, exact: true }).click()

    // محرک بعدی باید بیاید (جریان ادامه دارد)
    await page.waitForFunction(
      (prev) => {
        const el = document.querySelector('[data-testid="stroop-word"]')
        return !el || el.getAttribute('data-ink') !== prev
      },
      ink,
      { timeout: 8000 },
    )
    expect(getErrors()).toEqual([])
  })
})
