import type { CognitiveDomain } from '../core/types'
import type { ExerciseType } from '../core/types'

/** برچسب فارسی حوزه‌های شناختی — تنها منبع متون نمایشی حوزه‌ها */
export const DOMAIN_LABELS_FA: Readonly<Record<CognitiveDomain, string>> = {
  'working-memory': 'حافظه کاری',
  'attention-control': 'توجه و کنترل اجرایی',
  'processing-speed': 'سرعت پردازش و محاسبه',
  'verbal-auditory': 'زبان و پردازش کلامی',
  'visual-spatial': 'حافظه دیداری و فضایی',
  reasoning: 'استدلال و حل مسئله',
  sensorimotor: 'هماهنگی حسی و حرکتی',
}

/** برچسب فارسی انواع تمرین — جنس تکلیف (طبقه‌بندی عرضی) */
export const EXERCISE_TYPE_LABELS_FA: Readonly<Record<ExerciseType, string>> = {
  numeric: 'عددی و محاسبه‌ای',
  verbal: 'کلامی',
  visual: 'دیداری',
  spatial: 'فضایی',
  reaction: 'واکنشی',
  logic: 'منطقی',
}

export const APP_TEXTS_FA = {
  appName: 'آزمایشگاه تمرین شناختی',
  appSubtitle: 'تمرین‌های تعاملی حافظه، توجه و سرعت پردازش — همه داده‌ها فقط روی دستگاه شما',
  disclaimer:
    'این برنامه یک سرگرمی و تمرین ذهنی است، نه ابزار درمانی یا تشخیصی. با تمرین منظم، عملکرد شما در خودِ همین تمرین‌ها و کارهای بسیار مشابه بهتر می‌شود (اثر «انتقال نزدیک»)؛ اما پژوهش‌های علمی تا امروز افزایش هوش عمومی، بهبود گسترده توانایی‌های ذهنی، یا پیشگیری و درمان بیماری‌ها — از جمله زوال عقل — را از این‌گونه تمرین‌ها تأیید نکرده‌اند. اگر نگران حافظه یا شناخت خود هستید، با متخصص مشورت کنید.',
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
  groupSwitchLabel: 'گروه‌بندی تمرین‌ها',
  groupByDomain: 'حوزهٔ شناختی',
  groupByType: 'نوع تمرین',
  groupByEffect: 'اثر شناختی',
  exerciseCountUnit: 'تمرین',
  journey: 'سیر پیشرفت',
} as const

/**
 * متون صفحهٔ «سیر پیشرفت» — تقویم فعالیت، رکورد روزها و نشان‌ها.
 * نشان‌ها فقط بازتاب نظم و حجم تمرین‌اند، نه سنجش توانایی ذهنی
 * (هم‌راستا با docs/SCIENTIFIC-VALIDATION.md).
 */
export const JOURNEY_TEXTS_FA = {
  title: 'سیر پیشرفت',
  backToHome: APP_TEXTS_FA.home,
  loadError: 'خواندن سیر پیشرفت ناموفق بود.',
  loading: 'در حال خواندن داده‌ها…',
  empty: 'هنوز تمرینی ثبت نشده — اولین جلسه را شروع کن تا سیر پیشرفتت شکل بگیرد.',
  statsLabel: 'خلاصهٔ فعالیت',
  activeDays: 'روز فعال',
  currentStreak: 'رکورد فعلی',
  bestStreak: 'بهترین رکورد',
  dayUnit: 'روز',
  totalSessions: 'کل جلسات',
  totalTime: 'کل زمان',
  heatmapLabel: 'تقویم فعالیت — ۱۲ هفتهٔ گذشته',
  heatmapCellTitle: (count: number) => (count > 0 ? `${count} جلسه` : 'بدون تمرین'),
  milestonesLabel: 'نشان‌ها',
  milestonesHonestNote: 'نشان‌ها فقط بازتاب نظم و حجم تمرین‌اند، نه سنجش توانایی ذهنی.',
  achievedOn: 'دستیابی',
  mFirstSession: 'اولین قدم',
  mDomainCoverage: 'هفت‌گانهٔ کامل',
  mSessions: 'جلسهٔ تمرین',
  mStreakDays: 'روز پیاپی',
  mLevelUp: 'ارتقای سطح',
  levelUpDetail: (from: string, to: string) => `سطح ${from} به ${to}`,
  timelineLabel: 'روزهای اخیر',
  sessionAborted: 'ناتمام',
} as const

/**
 * متون صفحه «برنامه امروز من» — چارچوب صادقانه و بدون ادعای بالینی؛
 * مبنا: قواعد طراحی docs/SCIENTIFIC-VALIDATION.md (جلسه ۱۵–۲۰ دقیقه،
 * تنوع حوزه‌ها، بدون ادعای درمانی — فقط انتقال نزدیک).
 */
export const PROGRAM_TEXTS_FA = {
  title: 'برنامه امروز من',
  backToHome: APP_TEXTS_FA.home,
  entryHint: '۱۵ تا ۲۰ دقیقه تمرین متنوع، متناسب با سطح تو',
  suggestedLevel: 'سطح پیشنهادی',
  estimatedMinutes: 'حدود',
  minutesUnit: 'دقیقه',
  statusDone: 'انجام‌شده',
  statusPending: 'در انتظار',
  startCta: 'شروع تمرین',
  redoCta: 'تمرین دوباره',
  estimatedTotal: 'مجموع تخمینی امروز',
  targetRange: 'هدف روزانه: ۱۵ تا ۲۰ دقیقه',
  allDone: 'برنامه امروز را کامل کردی — آفرین!',
  guideline:
    'این برنامه برای منظم و متنوع تمرین‌کردن طراحی شده: هر روز چند بازی از حوزه‌های متفاوت، حدود ۱۵ تا ۲۰ دقیقه — سقف توصیه‌شده پژوهش‌ها برای جلسات تمرین شناختی. این فقط یک پیشنهاد برای شروع است، نه نسخه‌ای درمانی؛ هر بازی را هر وقت خواستی و با هر سطحی که دوست داری انجام بده.',
  loadError: 'خواندن برنامه امروز ناموفق بود.',
} as const
