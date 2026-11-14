// @vitest-environment node
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { GAME_CATALOG } from './catalog'
import { buildCatalogMarkdown } from './catalog-markdown'

/**
 * نگهبان drift فهرست مرجع — docs/GAMES-CATALOG.md باید دقیقاً خروجی تازهٔ
 * کاتالوگ باشد. شکست این تست یعنی متاها تغییر کرده و `npm run catalog`
 * اجرا نشده است.
 */
describe('docs/GAMES-CATALOG.md — نگهبان drift', () => {
  it('فایل کامیت‌شده با خروجی تازهٔ کاتالوگ یکی است', () => {
    const committed = readFileSync(
      resolve(__dirname, '../../docs/GAMES-CATALOG.md'),
      'utf8',
    )
    expect(committed).toBe(buildCatalogMarkdown(GAME_CATALOG))
  })
})
