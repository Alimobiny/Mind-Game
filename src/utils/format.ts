const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'] as const

/** تبدیل ارقام لاتین به فارسی برای نمایش */
export function toFaDigits(value: number | string): string {
  return String(value).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)] as string)
}

/** نمایش درصد با یک رقم اعشار (اعدید بدون اعشار اضافی) */
export function formatPercent(value: number): string {
  return `${toFaDigits(Number.isInteger(value) ? value : Math.round(value * 10) / 10)}٪`
}

/** مدت زمان خوانا: ۱:۲۳ یا ۴۵ ثانیه */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes === 0) return `${toFaDigits(seconds)} ثانیه`
  return `${toFaDigits(minutes)}:${toFaDigits(String(seconds).padStart(2, '0'))} دقیقه`
}

/** تاریخ و ساعت کوتاه فارسی */
export function formatDateTime(epochMs: number): string {
  return new Intl.DateTimeFormat('fa-IR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(epochMs))
}

/** فقط تاریخ (بدون ساعت) — برای «آخرین تمرین» و تایم‌لاین‌ها */
export function formatDate(epochMs: number): string {
  return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium' }).format(new Date(epochMs))
}
