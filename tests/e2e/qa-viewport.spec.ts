import { expect, test, type Locator, type Page } from '@playwright/test'
import { startExercise } from './helpers'
import { trackPageErrors } from './qa-helpers'

/**
 * سناریو QA 6 — جاروب viewport: هر ۱۲ بازی در عرض موبایل ۳۷۵px و
 * دسکتاپ ۱۲۸۰px قابل بازی است: بدون سرریز افقی، دکمه خروج و کنترل اصلی
 * در دسترس. از هر حالت اسکرین‌شات برای بازبینی بصری گرفته می‌شود.
 */

interface GameCase {
  readonly id: string
  readonly name: string
  /** کنترل اصلی بازی که باید دیده و در کادر viewport باشد */
  readonly control: (page: Page) => Locator
}

const GAMES: readonly GameCase[] = [
  { id: 'number-sequence', name: '^توالی اعداد', control: (p) => p.getByTestId('ns-digit') },
  { id: 'n-back', name: '^ان-بک(?! دوگانه)', control: (p) => p.getByTestId('nback-letter') },
  {
    id: 'go-no-go',
    name: 'برو / نرو',
    control: (p) => p.getByRole('button', { name: 'ناحیه پاسخ' }),
  },
  { id: 'stroop', name: 'استرووپ', control: (p) => p.getByTestId('stroop-word') },
  { id: 'calculation-20', name: 'محاسبه × ۲۰', control: (p) => p.getByTestId('calc-question') },
  {
    id: 'memorise-grid',
    name: 'شبکه حافظه',
    control: (p) => p.locator('[data-cell-index]').first(),
  },
  {
    id: 'spatial-sequence',
    name: 'توالی مکانی',
    control: (p) => p.locator('[data-cell-index]').first(),
  },
  {
    id: 'reaction-time',
    name: 'زمان واکنش',
    control: (p) => p.getByRole('button', { name: 'ناحیه پاسخ' }),
  },
  { id: 'word-memory', name: 'حافظه واژه‌ها', control: (p) => p.getByTestId('wm-study-word') },
  {
    id: 'syllable-counting',
    name: 'شمارش هجا',
    control: (p) => p.getByTestId('syllable-sentence'),
  },
  { id: 'sequence-logic', name: 'منطق توالی', control: (p) => p.getByTestId('seq-shown') },
  {
    id: 'pattern-completion',
    name: 'تکمیل الگو',
    control: (p) => p.getByTestId('pattern-matrix'),
  },
]

const VIEWPORTS = [
  { label: '375', width: 375, height: 720 },
  { label: '1280', width: 1280, height: 800 },
] as const

/** سرریز افقی نباید وجود داشته باشد (تلورانس ۱px) */
async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement
    return Math.max(doc.scrollWidth, document.scrollingElement?.scrollWidth ?? 0) - doc.clientWidth
  })
  expect(overflow, 'سرریز افقی صفحه').toBeLessThanOrEqual(1)
}

/** عنصر باید کاملاً داخل کادر viewport باشد (قابل لمس/دسترس) */
async function expectInViewport(page: Page, locator: Locator): Promise<void> {
  const box = await locator.boundingBox()
  expect(box, 'باکس کنترل اصلی').not.toBeNull()
  const viewport = page.viewportSize()
  expect(viewport).not.toBeNull()
  if (!box || !viewport) return
  expect(box.x).toBeGreaterThanOrEqual(-1)
  expect(box.y).toBeGreaterThanOrEqual(-1)
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1)
}

test.describe('QA6: جاروب viewport همه بازی‌ها', () => {
  for (const game of GAMES) {
    test(`${game.id}: قابل بازی در ۳۷۵ و ۱۲۸۰ پیکسل`, async ({ page }) => {
      const getErrors = trackPageErrors(page)
      test.setTimeout(60_000)

      for (const vp of VIEWPORTS) {
        await page.setViewportSize({ width: vp.width, height: vp.height })
        await startExercise(page, game.name, 1)

        const control = game.control(page)
        await expect(control.first()).toBeVisible({ timeout: 20_000 })

        // دکمه خروج حین اجرا همیشه در دسترس است
        const exitBtn = page.getByRole('button', { name: 'خروج از جلسه' })
        await expect(exitBtn).toBeVisible()
        await expectInViewport(page, exitBtn)
        await expectInViewport(page, control.first())
        await expectNoHorizontalOverflow(page)

        await page.screenshot({
          path: `test-results/qa-viewport/${game.id}-${vp.label}.png`,
        })
        await page.goto('/')
      }
      expect(getErrors()).toEqual([])
    })
  }
})
