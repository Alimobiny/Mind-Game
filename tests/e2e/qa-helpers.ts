import { expect, type Page } from '@playwright/test'
import { faToNumber } from './helpers'

/** ابزارهای مشترک تست‌های QA — سناریوهای باگ‌یابی (qa-*.spec.ts) */

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹'

/** تبدیل عدد به رشته ارقام فارسی (برای تطبیق متن UI) */
export function toFa(n: number): string {
  return String(n)
    .split('')
    .map((ch) => (/\d/.test(ch) ? (FA_DIGITS[Number(ch)] as string) : ch))
    .join('')
}

/** جمع‌کردن خطاهای صفحه (uncaught exceptions) برای تشخیص باگ‌های double-fire */
export function trackPageErrors(page: Page): () => string[] {
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(String(err)))
  return () => errors
}

/** خواندن همه رکوردهای جلسات از IndexedDB (مستقل از لایه اپ) */
export async function readAllSessions(page: Page): Promise<
  Array<{
    id: string
    exerciseId: string
    status: string
    difficulty: number
    trialCount: number
    summary: { accuracy: number } | null
    startedAt: number
  }>
> {
  return page.evaluate(
    () =>
      new Promise<Array<Record<string, unknown>>>((resolve, reject) => {
        const req = indexedDB.open('cognitive-training-lab', 1)
        req.onerror = () => reject(req.error)
        req.onsuccess = () => {
          const db = req.result
          const tx = db.transaction('exercise_sessions', 'readonly')
          const storeReq = tx.objectStore('exercise_sessions').getAll()
          storeReq.onsuccess = () => resolve(storeReq.result as Array<Record<string, unknown>>)
          storeReq.onerror = () => reject(storeReq.error)
        }
      }),
  ) as Promise<Array<{
    id: string
    exerciseId: string
    status: string
    difficulty: number
    trialCount: number
    summary: { accuracy: number } | null
    startedAt: number
  }>>
}

/** درج رکوردهای جلسه ساختگی در IndexedDB — برای آماده‌سازی تاریخچه (سناریو روز ضعیف) */
export async function seedSessions(
  page: Page,
  sessions: Array<Record<string, unknown>>,
): Promise<void> {
  await page.evaluate(
    (records) =>
      new Promise<void>((resolve, reject) => {
        const req = indexedDB.open('cognitive-training-lab', 1)
        req.onerror = () => reject(req.error)
        req.onsuccess = () => {
          const db = req.result
          const tx = db.transaction('exercise_sessions', 'readwrite')
          const store = tx.objectStore('exercise_sessions')
          for (const record of records) store.put(record)
          tx.oncomplete = () => resolve()
          tx.onerror = () => reject(tx.error)
        }
      }),
    sessions,
  )
}

/** ساخت رکورد جلسه کامل ساختگی با دقت دلخواه در یک روز مشخص */
export function fakeCompletedSession(options: {
  id: string
  exerciseId: string
  domain: string
  difficulty: number
  accuracy: number
  startedAtMs: number
  totalTrials?: number
}): Record<string, unknown> {
  const total = options.totalTrials ?? 20
  const correct = Math.round((options.accuracy / 100) * total)
  return {
    id: options.id,
    exerciseId: options.exerciseId,
    exerciseVersion: '1.0.0',
    contentVersion: '1',
    domain: options.domain,
    difficulty: options.difficulty,
    seed: 12345,
    status: 'completed',
    startedAt: options.startedAtMs,
    endedAt: options.startedAtMs + 60_000,
    durationMs: 60_000,
    trialCount: total,
    summary: {
      exerciseId: options.exerciseId,
      sessionId: options.id,
      exerciseVersion: '1.0.0',
      contentVersion: '1',
      domain: options.domain,
      difficulty: options.difficulty,
      totalTrials: total,
      correctTrials: correct,
      incorrectTrials: total - correct,
      accuracy: options.accuracy,
      medianReactionTimeMs: 800,
      metrics: {},
    },
  }
}

/** خواندن رویدادهای خام مراحل از IndexedDB (مستقل از لایه اپ) */
export async function readTrialEvents(page: Page): Promise<Array<Record<string, unknown>>> {
  return page.evaluate(
    () =>
      new Promise<Array<Record<string, unknown>>>((resolve, reject) => {
        const req = indexedDB.open('cognitive-training-lab', 1)
        req.onerror = () => reject(req.error)
        req.onsuccess = () => {
          const db = req.result
          const tx = db.transaction('trial_events', 'readonly')
          const storeReq = tx.objectStore('trial_events').getAll()
          storeReq.onsuccess = () => resolve(storeReq.result as Array<Record<string, unknown>>)
          storeReq.onerror = () => reject(storeReq.error)
        }
      }),
  )
}

/** شمار رویدادهایی که پاسخ غیرتهی دارند (تپ/تطبیق واقعی — نه انقضای مهلت) */
export function countAnsweredEvents(events: Array<Record<string, unknown>>): number {
  return events.filter((e) => e.given !== null && e.given !== undefined).length
}

/** خواندن تعداد پاسخ‌داده‌شده از هدر جلسه (عدد فارسی اول از متن «n / m») */
export async function readAnsweredCount(page: Page): Promise<number> {
  const text = await page.evaluate(
    () => document.querySelector('section[data-phase] header')?.textContent ?? '',
  )
  const firstFaNumber = text.trim().match(/[۰-۹]+/)?.[0]
  if (!firstFaNumber) throw new Error(`هدر جلسه قابل پارس نبود: «${text}»`)
  return faToNumber(firstFaNumber)
}

/**
 * شلیک چند رویداد ورودی در «همان تسک JS» — شبیه‌سازی تپ‌های چندگانه روی
 * یک محرک بدون اینترلیوِ async (advance/انقضای مهلت نمی‌تواند بین‌شان
 * بیفتد؛ مثل تپ‌های فوق‌سریع لمس واقعی روی یک دکمه).
 */
export async function fireMultiTapInPage(
  page: Page,
  selector: string,
  taps: number,
  eventType: 'pointerdown' | 'click' = 'pointerdown',
): Promise<void> {
  await page.evaluate(
    ({ selector, taps, eventType }) => {
      const el = document.querySelector(selector)
      if (!el) throw new Error(`عنصر پیدا نشد: ${selector}`)
      for (let i = 0; i < taps; i++) {
        if (eventType === 'pointerdown') {
          el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }))
        } else {
          el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
        }
      }
    },
    { selector, taps, eventType },
  )
}

/** شبیه‌سازی مخفی‌شدن صفحه: document.hidden=true + رویداد visibilitychange */
export async function setDocumentHidden(page: Page, hidden: boolean): Promise<void> {
  await page.evaluate((flag) => {
    Object.defineProperty(document, 'hidden', {
      configurable: true,
      get: () => flag,
    })
    document.dispatchEvent(new Event('visibilitychange'))
  }, hidden)
}

/** انتظار برای مقدار مشخصی از پیشرفت جلسه در هدر (مثل «۱ / ۴۰») */
export async function expectProgress(
  page: Page,
  answered: number,
  total: number,
): Promise<void> {
  const header = page.locator('section[data-phase] header')
  await expect(header).toContainText(`${toFa(answered)} / ${toFa(total)}`, { timeout: 10_000 })
}

/** خروج دوتایی-تأیید از وسط جلسه: یک ضربه → حالت تأیید، دو ضربه → قطع */
export async function dualConfirmExit(page: Page): Promise<void> {
  const exitBtn = page.getByRole('button', { name: 'خروج از جلسه' })
  await exitBtn.click()
  await expect(page.getByRole('button', { name: 'قطع جلسه — تأیید' })).toBeVisible()
  await page.getByRole('button', { name: 'قطع جلسه — تأیید' }).click()
}
