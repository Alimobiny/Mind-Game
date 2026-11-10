import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 180_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    locale: 'fa-IR',
  },
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60_000,
  },
  // از Chrome نصب‌شده سیستم استفاده می‌شود؛ دانلود مرورگر CDN در این
  // محیط مسدود است. اگر Chrome نصب نبود، `npx playwright install chromium`
  // با PLAYWRIGHT_DOWNLOAD_HOST مناسب جایگزین شود.
  projects: [{ name: 'chromium', use: { browserName: 'chromium', channel: 'chrome' } }],
})
