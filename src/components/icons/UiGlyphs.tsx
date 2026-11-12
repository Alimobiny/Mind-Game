/**
 * گلیف‌های عمومی UI (تقویم/نمودار/جهت) — تزئینی و سبک؛
 * همیشه با متن همراه بیایند (aria-hidden).
 */
import type { EmblemProps } from './DomainEmblems'

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

/** تقویم با نشان تیک — نشان «برنامه امروز من» */
export function CalendarGlyph({ size = 24, className }: EmblemProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" {...stroke} />
      <line x1="3.5" y1="9.5" x2="20.5" y2="9.5" {...stroke} />
      <line x1="8" y1="3" x2="8" y2="6.5" {...stroke} />
      <line x1="16" y1="3" x2="16" y2="6.5" {...stroke} />
      <path d="m9 14.8 2 2 3.8-4" {...stroke} />
    </svg>
  )
}

/** نمودار میله‌ای — نشان «گزارش‌ها» */
export function ChartGlyph({ size = 24, className }: EmblemProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      <line x1="4" y1="20" x2="20" y2="20" {...stroke} />
      <rect x="6" y="11" width="3.2" height="9" rx="1" fill="currentColor" opacity="0.85" />
      <rect x="10.4" y="7" width="3.2" height="13" rx="1" fill="currentColor" opacity="0.85" />
      <rect x="14.8" y="13" width="3.2" height="7" rx="1" fill="currentColor" opacity="0.85" />
    </svg>
  )
}

/** فلش جهت پیشروی — در RTL به سمت چپ */
export function ForwardGlyph({ size = 24, className }: EmblemProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      <path d="M19 12H5m0 0 6-6m-6 6 6 6" {...stroke} />
    </svg>
  )
}

/** پرچم مسیر — نشان «سیر پیشرفت» */
export function FlagGlyph({ size = 24, className }: EmblemProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      <line x1="6" y1="3" x2="6" y2="21" {...stroke} />
      <path d="M6 4.5h11.5l-3 3.75 3 3.75H6" {...stroke} />
    </svg>
  )
}

/** شعله — نشان رکورد روزهای پیاپی (Duolingo-سبک) */
export function FlameGlyph({ size = 24, className }: EmblemProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      <path
        d="M12 3c.5 3-1.6 4.6-3 6.2-1.5 1.7-2.5 3.3-2.5 5.3a5.5 5.5 0 0 0 11 0c0-2-1-3.4-2-4.6-.6 1-1.3 1.6-2.3 2-.3-2 .2-4.6-1.2-8.9Z"
        {...stroke}
      />
    </svg>
  )
}
