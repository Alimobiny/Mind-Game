/**
 * طبقه‌بندی عرضی تمرین‌ها — مستقل از «حوزهٔ شناختی».
 *
 * «نوع تمرین» جنس تکلیف را توصیف می‌کند (عددی؟ کلامی؟ دیداری؟ ...)؛
 * «اثر شناختی» همان حوزه‌های شناختی هستند که این تمرین تقویت می‌کند
 * (عنصر اول effects = اثر اصلی — مبنای گروه‌بندی نمای «اثر» در فهرست).
 */
export const EXERCISE_TYPES = [
  'numeric',
  'verbal',
  'visual',
  'spatial',
  'reaction',
  'logic',
] as const

export type ExerciseType = (typeof EXERCISE_TYPES)[number]

export function isExerciseType(value: string): value is ExerciseType {
  return (EXERCISE_TYPES as readonly string[]).includes(value)
}

/**
 * «خانوادهٔ پارادایمی» — مکتب پژوهشی‌ای که بازی از آن اقتباس شده است.
 * منبع نگاشت بازی→خانواده: SCIENTIFIC-VALIDATION §۲/§۷٫۱ و GAMES-AUDIT
 * §۳-۱/§۳-۳. برخلاف نوع تمرین، خانوادهٔ تک‌عضوی مجاز است (پارادایمی که
 * فقط یک بازی از آن ساخته شده، همچنان خانواده است) — مبنای نمای
 * «خانواده» در فهرست و جست‌وجو.
 */
export const EXERCISE_FAMILIES = [
  'n-back',
  'dual-n-back',
  'complex-span',
  'digit-span',
  'running-span',
  'go-no-go',
  'stroop',
  'task-switching',
  'simon',
  'attentional-blink',
  'arithmetic-fluency',
  'pasat',
  'word-list',
  'phonological-awareness',
  'repeated-reading',
  'anagram',
  'auditory-word-span',
  'phonemic-synthesis',
  'grid-span',
  'corsi',
  'mot',
  'mental-rotation',
  'mirror-reading',
  'spatial-estimation',
  'change-detection',
  'number-series',
  'pattern-completion',
  'wcst',
  'matrices',
  'reaction-time',
  'associative-memory',
] as const

export type ExerciseFamily = (typeof EXERCISE_FAMILIES)[number]

/** برچسب فارسی خانواده — برای نمایش و جست‌وجو */
export const FAMILY_LABELS_FA: Readonly<Record<ExerciseFamily, string>> = {
  'n-back': 'ان-بک',
  'dual-n-back': 'ان-بک دوگانه',
  'complex-span': 'دهانهٔ مرکب',
  'digit-span': 'دهانهٔ ارقام',
  'running-span': 'دهانهٔ جاری',
  'go-no-go': 'برو-نرو',
  stroop: 'تداخل استرووپ',
  'task-switching': 'جابه‌جایی تکلیف',
  simon: 'سایمون',
  'attentional-blink': 'پلک توجه',
  'arithmetic-fluency': 'روانی محاسبه',
  pasat: 'جمع زنجیره‌ای گام‌دار (PASAT)',
  'word-list': 'فهرست واژه',
  'phonological-awareness': 'آگاهی واجی',
  'repeated-reading': 'بازخوانی مکرر',
  anagram: 'واژهٔ به‌هم‌ریخته',
  'auditory-word-span': 'دهانهٔ شنیداری واژه',
  'phonemic-synthesis': 'ترکیب واجی',
  'grid-span': 'دهانهٔ شبکه‌ای',
  corsi: 'کورسی',
  mot: 'دنبال‌کردن چند شیء',
  'mental-rotation': 'چرخش ذهنی',
  'mirror-reading': 'بازخوانی آینه‌ای',
  'spatial-estimation': 'برآورد فضایی',
  'change-detection': 'تشخیص تغییر',
  'number-series': 'سری عددی',
  'pattern-completion': 'تکمیل الگو',
  wcst: 'کارت‌بندی ویسکانسین',
  matrices: 'ماتریس پیشرونده',
  'reaction-time': 'زمان واکنش',
  'associative-memory': 'حافظهٔ انجمنی',
}

export function isExerciseFamily(value: string): value is ExerciseFamily {
  return (EXERCISE_FAMILIES as readonly string[]).includes(value)
}
