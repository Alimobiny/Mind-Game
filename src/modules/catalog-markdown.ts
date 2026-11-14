import type { ExerciseMeta } from '../core/registry/game-registry'
import { COGNITIVE_DOMAINS, EXERCISE_FAMILIES, FAMILY_LABELS_FA } from '../core/types'
import type { CognitiveDomain } from '../core/types'
import { DOMAIN_LABELS_FA, EXERCISE_TYPE_LABELS_FA } from '../i18n/fa'

/**
 * ساخت Markdown فهرست مرجع بازی‌ها از کاتالوگ — قطعی و بدون زمان‌سنج
 * (خروجیِ پایدار برای تست نگهبان drift). مصرف‌کننده‌ها: اسکریپت
 * scripts/generate-catalog.ts (نوشتن فایل) و تست catalog-doc (مقایسه).
 */

/** ارقام فارسی برای اعداد فهرست — بدون وابستگی به utils/format (خالق متن سند) */
function toFaCount(value: number): string {
  return String(value).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])
}

const TABLE_HEADER =
  '| بازی | English | شناسه | خانواده | نوع | اثرها | سطح‌ها | مراحل/جلسه | متریک‌ها |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- |'

function domainSection(catalog: readonly ExerciseMeta[], domain: CognitiveDomain): string {
  const rows = catalog
    .filter((m) => m.domain === domain)
    .map((m) => {
      const effects = m.effects.map((d) => DOMAIN_LABELS_FA[d]).join(' + ')
      const metrics = Object.values(m.metricLabelsFa).join(' · ')
      return `| ${m.nameFa} | ${m.nameEn} | \`${m.id}\` | ${FAMILY_LABELS_FA[m.family]} | ${EXERCISE_TYPE_LABELS_FA[m.exerciseType]} | ${effects} | ${toFaCount(m.difficultyLevels.length)} | ${toFaCount(m.plannedTrials ?? 0)} | ${metrics} |`
    })
  return [`## ${DOMAIN_LABELS_FA[domain]} (${domain})`, '', TABLE_HEADER, rows.join('\n'), ''].join('\n')
}

function familyIndex(catalog: readonly ExerciseMeta[]): string {
  const lines = EXERCISE_FAMILIES.map((family) => {
    const games = catalog.filter((m) => m.family === family)
    if (games.length === 0) return null
    return `- **${FAMILY_LABELS_FA[family]}** (\`${family}\`) — ${games.map((m) => m.nameFa).join('، ')}`
  }).filter((line): line is string => line !== null)
  return ['## فهرست خانواده‌های پارادایمی', '', ...lines, ''].join('\n')
}

export function buildCatalogMarkdown(catalog: readonly ExerciseMeta[]): string {
  const header = [
    '# فهرست مرجع بازی‌ها (تولیدشده)',
    '',
    '> این سند از روی کاتالوگ رجیستری تولید می‌شود — منبع یگانهٔ متادیتای بازی‌ها',
    '> `src/modules/catalog.ts` است. بعد از هر تغییر در متاها، `npm run catalog` را',
    '> اجرا کن؛ تست `catalog-doc` نسخهٔ کامیت‌شده را با خروجی تازه مقایسه می‌کند.',
    '> جدول وضعیت علمی/کد بازی‌ها در `docs/GAMES-AUDIT.md` است (آن جدول دست‌نویس است، این نیست).',
    '',
    `**${toFaCount(catalog.length)} بازی در ${toFaCount(COGNITIVE_DOMAINS.length)} حوزهٔ شناختی**`,
    '',
  ].join('\n')

  const activeDomains = COGNITIVE_DOMAINS.filter((d) => catalog.some((m) => m.domain === d))
  const parts: string[] = [header]
  for (const domain of activeDomains) {
    parts.push(domainSection(catalog, domain))
  }
  parts.push(familyIndex(catalog))
  return parts.join('\n')
}
