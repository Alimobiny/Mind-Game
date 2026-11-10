import type { CognitiveDomain } from '../core/types'

/** برچسب فارسی حوزه‌های شناختی — تنها منبع متون نمایشی حوزه‌ها */
export const DOMAIN_LABELS_FA: Readonly<Record<CognitiveDomain, string>> = {
  'working-memory': 'حافظه کاری',
  'attention-control': 'توجه و کنترل اجرایی',
  'processing-speed': 'سرعت پردازش و محاسبه',
  'verbal-auditory': 'زبان و پردازش شنیداری',
  'visual-spatial': 'حافظه دیداری و فضایی',
  reasoning: 'استدلال و حل مسئله',
  sensorimotor: 'هماهنگی حسی و حرکتی',
}

export const APP_TEXTS_FA = {
  appName: 'آزمایشگاه تمرین شناختی',
  appSubtitle: 'تمرین‌های تعاملی حافظه، توجه و سرعت پردازش — همه داده‌ها فقط روی دستگاه شما',
  disclaimer:
    'این تمرین‌ها ابزار تمرین ذهنی هستند؛ ادعای اثر بالینی، پیشگیری از بیماری یا افزایش هوش عمومی ندارند.',
  startExercise: 'شروع تمرین',
  difficulty: 'سطح دشواری',
  play: 'بازی کن',
  reports: 'گزارش‌ها',
  home: 'تمرین‌ها',
  retry: 'دوباره از ابتدا',
  exit: 'بازگشت به فهرست',
  sessionPaused: 'تمرین متوقف شد',
  resume: 'ادامه',
  aborted: 'این جلسه نیمه‌کاره رها شد.',
  getReady: 'آماده باش…',
  correct: 'درست!',
  incorrect: 'نادرست',
} as const
