import { expect, test } from '@playwright/test'
import { startExercise, waitForResults, faToNumber, waitProgressAdvance } from './helpers'
import { trackPageErrors } from './qa-helpers'

/**
 * E2E موج چهارم — چهار بازی سرعت پردازش: محاسبه ×۱۰۰، شمارش معکوس پیوسته،
 * عملگر گم‌شده، مقایسه اعداد.
 * + رگرسیون pageerror برای رفعِ «advance پس از اتمام جلسه» در بازی‌های
 * زمان‌بندی‌شدهٔ قدیمی (استرووپ، زمان واکنش) — خطای مهارنشدهٔ پایان جلسه
 * فقط با گوش‌دادن به pageerror دیده می‌شود.
 */

const FA = '۰۱۲۳۴۵۶۷۸۹'

/** تبدیل ارقام فارسی یک رشته به ارقام لاتین (سایر نویسه‌ها دست‌نخورده) */
function faToEnDigits(text: string): string {
  return [...text]
    .map((ch) => {
      const i = FA.indexOf(ch)
      return i === -1 ? ch : String(i)
    })
    .join('')
}

/** اعمال یک عملگر حسابی — قرارداد یکسان با موتورهای محاسبه */
function apply(a: number, op: string, b: number): number {
  if (op === '+') return a + b
  if (op === '-') return a - b
  if (op === '×') return a * b
  return Math.round(a / b)
}

test.describe('Calculation ×100', () => {
  test('۱۰۰ سؤال: محاسبه پاسخ و ورود با صفحه‌کلید فیزیکی', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await startExercise(page, 'محاسبه × ۱۰۰', 1)

    let progress = 0
    for (let i = 0; i < 100; i++) {
      const q = page.getByTestId('calc100-question')
      const text = ((await q.textContent({ timeout: 10_000 })) ?? '').trim()
      const clean = faToEnDigits(text).replace(/[^0-9+\-×÷]/g, '')
      const m = clean.match(/^([0-9]+)([+\-×÷])([0-9]+)$/)
      if (!m) throw new Error(`سؤال قابل پارس نبود: «${text}» → «${clean}»`)
      const ans = apply(Number(m[1]), m[2], Number(m[3]))
      // پاک‌کردن ورودیِ احتمالی مانده (گارد در برابر تایپ در پنجرهٔ بازخورد)
      for (let bs = 0; bs < 4; bs++) await page.keyboard.press('Backspace')
      await page.keyboard.type(String(ans), { delay: 0 })
      await page.keyboard.press('Enter')
      // صبر تا ثبت پاسخ — با شمارندهٔ هدر، نه تغییر متن (سؤال تکراری ممکن است)
      progress = await waitProgressAdvance(page, progress)
    }

    await waitForResults(page)
    expect(getErrors(), 'بدون خطای صفحه در ۱۰۰ سؤال').toEqual([])
  })
})

test.describe('Continuous Countdown', () => {
  test('۱۰ مرحله: جمع‌آوری توالی نمایشی و ورود باقیماندهٔ نهایی', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await startExercise(page, 'شمارش معکوس پیوسته', 1)

    // گردآورندهٔ پایدار در صفحه: هر «ظاهرشدن از حالت خالی» display یک رویداد
    // (kind=start|step) — طبق قرارداد sync توالی‌های HANDOFF §2
    await page.evaluate(() => {
      const w = window as unknown as { __ccEv?: unknown[]; __ccLast?: string }
      w.__ccEv = []
      w.__ccLast = ''
    })

    // سطح ۱: هر مرحله دقیقاً ۱ شروع + ۳ گام = ۴ رویداد نمایشی
    const eventsPerTrial = 4
    for (let trial = 0; trial < 10; trial++) {
      await page.waitForFunction(
        (min) => {
          const w = window as unknown as { __ccEv?: Array<{ kind: string; value: number }>; __ccLast?: string }
          w.__ccEv ??= []
          const el = document.querySelector('[data-testid="ccount-display"]')
          const text = el ? (el.textContent ?? '').trim() : ''
          if (text && text !== w.__ccLast) {
            w.__ccLast = text
            const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹'
            const value = [...text].reduce((acc, ch) => {
              const idx = FA_DIGITS.indexOf(ch)
              return idx === -1 ? acc : acc * 10 + idx
            }, 0)
            w.__ccEv.push({ kind: el?.getAttribute('data-kind') ?? '', value })
          } else if (!text) {
            w.__ccLast = ''
          }
          return w.__ccEv.length >= min || document.querySelector('[data-testid="results"]') !== null
        },
        (trial + 1) * eventsPerTrial,
        { timeout: 30_000 },
      )

      const events = (await page.evaluate(() => {
        const w = window as unknown as { __ccEv?: Array<{ kind: string; value: number }> }
        return w.__ccEv ?? []
      })) as Array<{ kind: string; value: number }>
      const mine = events.slice(trial * eventsPerTrial, (trial + 1) * eventsPerTrial)
      if (mine.length < eventsPerTrial || mine[0]?.kind !== 'start') {
        throw new Error(`توالی مرحله ${trial + 1} ناقص: ${JSON.stringify(mine)}`)
      }
      let remainder = mine[0].value
      for (const step of mine.slice(1)) remainder -= step.value

      const keypad = page.getByRole('group', { name: 'صفحه کلید عددی' })
      for (const d of String(remainder).split('')) {
        await keypad.getByRole('button', { name: FA[Number(d)] as string, exact: true }).click()
      }
      await page.getByTestId('ccount-submit').click()
    }

    await waitForResults(page)
    expect(getErrors(), 'بدون خطای صفحه در ۱۰ مرحله').toEqual([])
  })
})

test.describe('Missing Operator', () => {
  test('۲۰ معادله: انتخاب عملگر برقرارکننده', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await startExercise(page, 'عملگر گم‌شده', 1)

    let progress = 0
    for (let i = 0; i < 20; i++) {
      const eq = page.getByTestId('missop-equation')
      const text = ((await eq.textContent({ timeout: 10_000 })) ?? '').trim()
      const clean = faToEnDigits(text).replace(/[^0-9=+\-×÷?؟]/g, '')
      const m = clean.match(/^([0-9]+)[?؟]([0-9]+)=([0-9]+)$/)
      if (!m) throw new Error(`معادله قابل پارس نبود: «${text}» → «${clean}»`)
      const a = Number(m[1])
      const b = Number(m[2])
      const result = Number(m[3])
      const solution = ['+', '-', '×', '÷'].find((op) => apply(a, op, b) === result)
      if (!solution) throw new Error(`عملگر برقرارکننده پیدا نشد: ${clean}`)
      await page.locator(`[data-testid="missop-choice"][data-op="${solution}"]`).click()
      // صبر تا ثبت پاسخ — با شمارندهٔ هدر، نه تغییر متن (ریشهٔ flake سابق:
      // موتور می‌تواند دو معادلهٔ یکسان پشت‌سرهم تولید کند و متن هرگز عوض نشود)
      progress = await waitProgressAdvance(page, progress)
    }

    await waitForResults(page)
    expect(getErrors(), 'بدون خطای صفحه در ۲۰ معادله').toEqual([])
  })
})

test.describe('Number Comparison', () => {
  test('۳۶ مرحله: انتخاب عدد بزرگ‌تر پیش از انقضای مهلت', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await startExercise(page, 'مقایسه اعداد', 1)

    let progress = 0
    for (let i = 0; i < 36; i++) {
      if (await page.getByTestId('results').isVisible().catch(() => false)) break

      const pair = (await page.evaluate(() => ({
        l: (document.querySelector('[data-testid="numcmp-left"]')?.textContent ?? '').trim(),
        r: (document.querySelector('[data-testid="numcmp-right"]')?.textContent ?? '').trim(),
      }))) as { l: string; r: string }
      const combined = `${pair.l}|${pair.r}`

      // رشته‌رقم جداشده هم مقدار عددی همان ارقام پشت‌سرهم است
      const lv = faToNumber(pair.l.replace(/\s+/g, ''))
      const rv = faToNumber(pair.r.replace(/\s+/g, ''))
      if (lv === rv) throw new Error(`جفت برابر تولید شد: ${combined}`)
      await page.getByTestId(lv > rv ? 'numcmp-left' : 'numcmp-right').click()
      // صبر تا ثبت پاسخ — با شمارندهٔ هدر، نه جفتِ متفاوت (جفت تکراری ممکن است)
      progress = await waitProgressAdvance(page, progress)
    }

    await waitForResults(page)
    expect(getErrors(), 'بدون خطای صفحه در ۳۶ مرحله').toEqual([])
  })
})

test.describe('رگرسیون — پایان جلسه در بازی‌های زمان‌بندی‌شدهٔ قدیمی', () => {
  // رفع «advance در فاز COMPLETED» (هم‌خانوادهٔ باگ ۲ مأموریت A): پاسخ آخر
  // نباید advance روی جلسهٔ تمام‌شده بزند — خطا فقط از طریق pageerror دیده می‌شود.
  test('استرووپ: پایان کامل جلسه بدون هیچ pageerror', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await startExercise(page, 'استرووپ', 1)
    const STROOP_LABELS: Readonly<Record<string, string>> = {
      red: 'قرمز',
      blue: 'آبی',
      green: 'سبز',
      yellow: 'زرد',
    }
    const results = page.getByTestId('results')
    // سنکرون دقیق هر مرحله: شمارندهٔ «n / ۲۰» هدر یکی جلو می‌رود (محرک‌های
    // هم‌رنگِ متوالی با مقایسهٔ ink قابل‌تشخیص نیستند و مهلت را می‌سوزانند)
    let prevCount = 0
    for (let i = 0; i < 20; i++) {
      if (await results.isVisible().catch(() => false)) break
      const word = page.getByTestId('stroop-word')
      await expect(word).toBeVisible({ timeout: 10_000 })
      const ink = (await word.getAttribute('data-ink')) as string
      await page.getByRole('button', { name: STROOP_LABELS[ink] as string, exact: true }).click()
      prevCount = await waitProgressAdvance(page, prevCount)
    }
    await waitForResults(page)
    expect(getErrors(), 'استرووپ نباید در پایان جلسه خطای مهارنشده داشته باشد').toEqual([])
  })

  test('زمان واکنش: پایان کامل جلسه بدون هیچ pageerror', async ({ page }) => {
    const getErrors = trackPageErrors(page)
    await startExercise(page, 'زمان واکنش', 1)
    const tapArea = page.getByRole('button', { name: 'ناحیه پاسخ' })
    for (let i = 0; i < 10; i++) {
      const stimulus = page.getByTestId('rt-stimulus')
      await expect(stimulus).toBeVisible({ timeout: 15_000 })
      await tapArea.click({ force: true, noWaitAfter: true })
      await expect(stimulus).toBeHidden({ timeout: 5000 })
    }
    await waitForResults(page)
    expect(getErrors(), 'زمان واکنش نباید در پایان جلسه خطای مهارنشده داشته باشد').toEqual([])
  })
})
