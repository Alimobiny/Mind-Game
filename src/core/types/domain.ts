/**
 * حوزه‌های شناختی — ثابت‌های مشترک همه ماژول‌ها.
 * تغییر این فهرست یک تصمیم معماری است و باید صریح ثبت شود.
 *
 * ۲۰۲۶-۱۱-۱۲: حوزهٔ هشتم «حافظه بلندمدت» با تصویب صریح کاربر افزوده شد
 * (برای بازی حافظهٔ انجمنی و خانوادهٔ بازی‌های یادآوری تاخیری).
 */
export const COGNITIVE_DOMAINS = [
  'working-memory',
  'attention-control',
  'processing-speed',
  'verbal-auditory',
  'visual-spatial',
  'reasoning',
  'sensorimotor',
  'long-term-memory',
] as const

export type CognitiveDomain = (typeof COGNITIVE_DOMAINS)[number]

export function isCognitiveDomain(value: string): value is CognitiveDomain {
  return (COGNITIVE_DOMAINS as readonly string[]).includes(value)
}
