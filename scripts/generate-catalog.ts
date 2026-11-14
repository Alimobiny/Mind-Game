/**
 * تولید فهرست مرجع بازی‌ها — docs/GAMES-CATALOG.md از روی کاتالوگ رجیستری.
 * اجرا: `npm run catalog` (tsx). خروجی قطعی است؛ تست src/modules/catalog-doc.test.ts
 * فایل کامیت‌شده را با خروجی تازه مقایسه می‌کند تا drift غیرممکن شود.
 */
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { GAME_CATALOG } from '../src/modules/catalog'
import { buildCatalogMarkdown } from '../src/modules/catalog-markdown'

const target = resolve(fileURLToPath(new URL('.', import.meta.url)), '../docs/GAMES-CATALOG.md')
writeFileSync(target, buildCatalogMarkdown(GAME_CATALOG), 'utf8')
console.log(`✓ docs/GAMES-CATALOG.md بازتولید شد (${GAME_CATALOG.length} بازی)`)
