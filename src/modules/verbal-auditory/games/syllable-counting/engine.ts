import type {
  ExerciseConfig,
  ExerciseDefinition,
  ExerciseState,
  ExerciseSummary,
  ExerciseTrial,
  RecordedTrial,
  TrialOutcome,
} from '../../../../core/types'
import { outcomeIsCorrect } from '../../../../core/types'
import { SeededRandom } from '../../../../core/randomization/seeded-random'
import { deriveTrialSeed } from '../../../../core/randomization/derive-seed'
import { summarizeOutcomes } from '../../../../core/scoring/scoring'

/**
 * شمارش هجا (Syllable Counting) — حوزهٔ کلامی‑شنوایی
 *
 * یک جملهٔ فارسی نمایش داده می‌شود و کاربر باید تعداد هجاهایش را با
 * صفحه‌کلید عددی وارد کند. هیچ مرحله‌ای مهلت زمانی ندارد؛ سرعت و دقت
 * جداگانه در گزارش ثبت می‌شوند.
 *
 * نکتهٔ مهم زبان‌شناختی: خط فارسی مصوت‌های کوتاه را نمی‌نویسد، پس
 * شمارش هجا از روی املا «قابل‌محاسبه» نیست. به همین دلیل از بانک جملهٔ
 * دست‌ساز با هجای پیش‌شمارش‌شده استفاده شده است؛ شمارش بر پایهٔ تلفظ
 * استاندارد و شمارش هستهٔ مصوت هر واژه انجام شده و برای پرهیز از ابهامِ
 * کسرهٔ اضافهٔ نانوشتنی، ساخت‌های جمله‌ها بدون اضافهٔ پنهان تنظیم شده‌اند
 * (اضافه‌های نوشتنی مثل «ـی» و «ـهای» در شمارش لحاظ شده‌اند).
 */

export interface SyllableSentence {
  readonly text: string
  readonly syllableCount: number
  /** سطح‌بندی ۱..۵ بر اساس طول */
  readonly level: number
}

/**
 * بانک جمله‌های فارسی با هجای پیش‌شمارش‌شده — ۱۰ جمله در هر سطح.
 * هدف هر سطح: L1 = ۳..۵ هجا، L2 = ۶..۸، L3 = ۹..۱۱، L4 = ۱۲..۱۵، L5 = ۱۶..۲۱.
 */
export const SENTENCE_BANK_FA: readonly SyllableSentence[] = [
  // ── سطح ۱: ۳ تا ۵ هجا ───────────────────────────────────────────
  // برف(۱) آمد(۲) = ۳
  { text: 'برف آمد.', syllableCount: 3, level: 1 },
  // او(۱) دوستم(۲) است(۱) = ۴
  { text: 'او دوستم است.', syllableCount: 4, level: 1 },
  // آب(۱) سرد(۱) است(۱) = ۳
  { text: 'آب سرد است.', syllableCount: 3, level: 1 },
  // درخت(۲) بلند(۲) است(۱) = ۵
  { text: 'درخت بلند است.', syllableCount: 5, level: 1 },
  // چای(۱) گرم(۱) بود(۱) = ۳
  { text: 'چای گرم بود.', syllableCount: 3, level: 1 },
  // در(۱) بسته(۲) است(۱) = ۴
  { text: 'در بسته است.', syllableCount: 4, level: 1 },
  // ماه(۱) بالا(۲) آمد(۲) = ۵
  { text: 'ماه بالا آمد.', syllableCount: 5, level: 1 },
  // نان(۱) تازه(۲) است(۱) = ۴
  { text: 'نان تازه است.', syllableCount: 4, level: 1 },
  // شب(۱) آرام(۲) بود(۱) = ۴
  { text: 'شب آرام بود.', syllableCount: 4, level: 1 },
  // گل‌ها(۲) شکفتند(۳) = ۵
  { text: 'گل‌ها شکفتند.', syllableCount: 5, level: 1 },
  // ── سطح ۲: ۶ تا ۸ هجا ───────────────────────────────────────────
  // دیروز(۲) کتاب(۲) خریدم(۳) = ۷
  { text: 'دیروز کتاب خریدم.', syllableCount: 7, level: 2 },
  // مادر(۲) از(۱) بازار(۲) نان(۱) خرید(۲) = ۸
  { text: 'مادر از بازار نان خرید.', syllableCount: 8, level: 2 },
  // او(۱) دانش‌آموز(۴) است(۱) = ۶
  { text: 'او دانش‌آموز است.', syllableCount: 6, level: 2 },
  // بچه‌ها(۳) بازی(۲) کردند(۲) = ۷
  { text: 'بچه‌ها بازی کردند.', syllableCount: 7, level: 2 },
  // امروز(۲) هوا(۲) خوب(۱) است(۱) = ۶
  { text: 'امروز هوا خوب است.', syllableCount: 6, level: 2 },
  // من(۱) به(۱) مدرسه(۳) می‌روم(۳) = ۸
  { text: 'من به مدرسه می‌روم.', syllableCount: 8, level: 2 },
  // گربه(۲) روی(۲) زمین(۲) خوابید(۲) = ۸
  { text: 'گربه روی زمین خوابید.', syllableCount: 8, level: 2 },
  // در(۱) سبد(۲) سیب(۱) داریم(۲) = ۶
  { text: 'در سبد سیب داریم.', syllableCount: 6, level: 2 },
  // اتوبوس(۳) در(۱) ایستگاه(۲) ایستاد(۲) = ۸
  { text: 'اتوبوس در ایستگاه ایستاد.', syllableCount: 8, level: 2 },
  // پدرم(۳) فوتبال(۲) دوست(۱) دارد(۲) = ۸
  { text: 'پدرم فوتبال دوست دارد.', syllableCount: 8, level: 2 },
  // ── سطح ۳: ۹ تا ۱۱ هجا ──────────────────────────────────────────
  // صبح(۱) زود(۱) از(۱) خانه(۲) بیرون(۲) رفتم(۲) = ۹
  { text: 'صبح زود از خانه بیرون رفتم.', syllableCount: 9, level: 3 },
  // برادرم(۴) فوتبال(۲) دوست(۱) دارد(۲) = ۹
  { text: 'برادرم فوتبال دوست دارد.', syllableCount: 9, level: 3 },
  // ما(۱) پیش(۱) از(۱) ظهر(۱) به(۱) شیراز(۲) سفر(۲) کردیم(۲) = ۱۱
  { text: 'ما پیش از ظهر به شیراز سفر کردیم.', syllableCount: 11, level: 3 },
  // معلممان(۴) داستانی(۳) تعریف(۲) کرد(۱) = ۱۰
  { text: 'معلممان داستانی تعریف کرد.', syllableCount: 10, level: 3 },
  // دیشب(۲) باران(۲) بارید(۲) و(۱) هوا(۲) سرد(۱) شد(۱) = ۱۱
  { text: 'دیشب باران بارید و هوا سرد شد.', syllableCount: 11, level: 3 },
  // خواهرم(۳) آشپزی(۳) بلد(۲) است(۱) = ۹
  { text: 'خواهرم آشپزی بلد است.', syllableCount: 9, level: 3 },
  // قطار(۲) با(۱) تأخیر(۲) ایستگاه(۲) را(۱) ترک(۱) کرد(۱) = ۱۰
  { text: 'قطار با تأخیر ایستگاه را ترک کرد.', syllableCount: 10, level: 3 },
  // پدربزرگ(۴) قصه(۲) می‌گوید(۳) = ۹
  { text: 'پدربزرگ قصه می‌گوید.', syllableCount: 9, level: 3 },
  // ماشین(۲) در(۱) پارکینگ(۲) ایستاده(۳) است(۱) = ۹
  { text: 'ماشین در پارکینگ ایستاده است.', syllableCount: 9, level: 3 },
  // بچه‌ها(۳) صبح(۱) زود(۱) بیدار(۲) شدند(۲) = ۹
  { text: 'بچه‌ها صبح زود بیدار شدند.', syllableCount: 9, level: 3 },
  // ── سطح ۴: ۱۲ تا ۱۵ هجا ─────────────────────────────────────────
  // پدربزرگ(۴) قصه‌های(۴) قدیمی(۳) می‌گوید(۳) = ۱۴
  { text: 'پدربزرگ قصه‌های قدیمی می‌گوید.', syllableCount: 14, level: 4 },
  // ما(۱) هفته‌ی(۳) گذشته(۳) به(۱) شیراز(۲) سفر(۲) کردیم(۲) = ۱۴
  { text: 'ما هفته‌ی گذشته به شیراز سفر کردیم.', syllableCount: 14, level: 4 },
  // معلممان(۴) درباره‌ی(۴) تاریخ(۲) صحبت(۲) کرد(۱) = ۱۳
  { text: 'معلممان درباره‌ی تاریخ صحبت کرد.', syllableCount: 13, level: 4 },
  // دیروز(۲) بعد(۱) از(۱) مدرسه(۳) با(۱) دوستم(۲) بازی(۲) کردم(۲) = ۱۴
  { text: 'دیروز بعد از مدرسه با دوستم بازی کردم.', syllableCount: 14, level: 4 },
  // مادرم(۳) هر(۱) روز(۱) صبح(۱) زود(۱) به(۱) نانوایی(۳) می‌رود(۳) = ۱۴
  { text: 'مادرم هر روز صبح زود به نانوایی می‌رود.', syllableCount: 14, level: 4 },
  // ما(۱) امسال(۲) تابستان(۳) را(۱) در(۱) روستا(۲) گذراندیم(۴) = ۱۴
  { text: 'ما امسال تابستان را در روستا گذراندیم.', syllableCount: 14, level: 4 },
  // دیشب(۲) وقتی(۲) به(۱) خانه(۲) رسیدم(۳)، همه(۲) خواب(۱) بودند(۲) = ۱۵
  { text: 'دیشب وقتی به خانه رسیدم، همه خواب بودند.', syllableCount: 15, level: 4 },
  // خاله‌ام(۳) بیست(۱) سال(۱) است(۱) که(۱) در(۱) دبستان(۳) درس(۱) می‌دهد(۳) = ۱۵
  { text: 'خاله‌ام بیست سال است که در دبستان درس می‌دهد.', syllableCount: 15, level: 4 },
  // امروز(۲) کتاب‌هایم(۴) را(۱) در(۱) جعبه(۲) گذاشتم(۳) = ۱۳
  { text: 'امروز کتاب‌هایم را در جعبه گذاشتم.', syllableCount: 13, level: 4 },
  // ما(۱) هر(۱) شب(۱) بعد(۱) از(۱) شام(۱) در(۱) پارک(۱) قدم(۲) می‌زنیم(۳) = ۱۳
  { text: 'ما هر شب بعد از شام در پارک قدم می‌زنیم.', syllableCount: 13, level: 4 },
  // ── سطح ۵: ۱۶ تا ۲۱ هجا ─────────────────────────────────────────
  // دانش‌آموزان(۵) صبح(۱) زود(۱) برای(۳) امتحان(۳) آماده(۳) شدند(۲) = ۱۸
  { text: 'دانش‌آموزان صبح زود برای امتحان آماده شدند.', syllableCount: 18, level: 5 },
  // مسافران(۴) دیروز(۲) صبح(۱) با(۱) تأخیر(۲) به(۱) ایستگاه(۲) رسیدند(۳) = ۱۶
  { text: 'مسافران دیروز صبح با تأخیر به ایستگاه رسیدند.', syllableCount: 16, level: 5 },
  // پزشک(۲) به(۱) من(۱) توصیه(۳) کرد(۱) هر(۱) روز(۱) پیاده‌روی(۵) کنم(۲) = ۱۷
  { text: 'پزشک به من توصیه کرد هر روز پیاده‌روی کنم.', syllableCount: 17, level: 5 },
  // دیروز(۲) کتابخانه‌ای(۵) در(۱) شهر(۱) ما(۱) با(۱) حضور(۲) مهمانان(۳) افتتاح(۳) شد(۱) = ۲۰
  { text: 'دیروز کتابخانه‌ای در شهر ما با حضور مهمانان افتتاح شد.', syllableCount: 20, level: 5 },
  // معلم(۳) از(۱) ما(۱) خواست(۱) متن(۱) را(۱) با(۱) صدای(۳) بلند(۲) بخوانیم(۳) = ۱۷
  { text: 'معلم از ما خواست متن را با صدای بلند بخوانیم.', syllableCount: 17, level: 5 },
  // دیروز(۲) بعد(۱) از(۱) باران(۲)، هوای(۳) شهر(۱) کمی(۲) خنک‌تر(۳) شد(۱) = ۱۶
  { text: 'دیروز بعد از باران، هوای شهر کمی خنک‌تر شد.', syllableCount: 16, level: 5 },
  // کارشناسان(۴) هشدار(۲) دادند(۲) که(۱) جنگل‌های(۴) شمال(۲) در(۱) خطر(۲) هستند(۲) = ۲۰
  { text: 'کارشناسان هشدار دادند که جنگل‌های شمال در خطر هستند.', syllableCount: 20, level: 5 },
  // مادر(۲) سفره(۲) را(۱) روی(۲) زمین(۲) پهن(۲) کرد(۱) و(۱) همه(۲) دور(۱) هم(۱) نشستند(۳) = ۲۰
  { text: 'مادر سفره را روی زمین پهن کرد و همه دور هم نشستند.', syllableCount: 20, level: 5 },
  // کودکانی(۴) که(۱) زودتر(۲) به(۱) مدرسه(۳) رسیدند(۳)، جایزه(۳) گرفتند(۳) = ۲۰
  { text: 'کودکانی که زودتر به مدرسه رسیدند، جایزه گرفتند.', syllableCount: 20, level: 5 },
  // صبح‌ها(۲) پدرها(۳) بچه‌ها(۳) را(۱) با(۱) ماشین(۲) به(۱) مدرسه(۳) می‌رسانند(۴) = ۲۰
  { text: 'صبح‌ها پدرها بچه‌ها را با ماشین به مدرسه می‌رسانند.', syllableCount: 20, level: 5 },
]

export interface SyllableCountingConfig extends ExerciseConfig {
  /** سطح بانک جمله‌ها (برابر difficulty) */
  readonly bankLevel: number
  /** تعداد جمله‌های ثابت جلسه */
  readonly totalTrials: number
}

export interface SyllableCountingTrial extends ExerciseTrial {
  /** متن جمله — تنها بخشی که UI نمایش می‌دهد */
  readonly text: string
  /** فقط برای داوری موتور؛ UI نباید این عدد را نمایش دهد */
  readonly syllableCount: number
}

export interface SyllableCountingState extends ExerciseState<SyllableCountingConfig> {
  readonly currentTrial: SyllableCountingTrial | null
  /** اندیس جمله‌های استفاده‌شدهٔ این جلسه — تا تخلیهٔ زیربانک، تکرار ممنوع */
  readonly usedSentenceIds: readonly number[]
}

export type SyllableCountingAnswer = number

export const SYLLABLE_COUNTING_ID = 'syllable-counting'
export const SYLLABLE_COUNTING_VERSION = '1.0.0'
export const SYLLABLE_COUNTING_CONTENT_VERSION = '1'
const TOTAL_TRIALS = 12

/** تنظیمات سطح دشواری — جمله‌ها از زیربانکِ همان سطح کشیده می‌شوند */
export function configForDifficulty(difficulty: number): SyllableCountingConfig {
  if (difficulty < 1 || difficulty > 5) {
    throw new RangeError('دشواری باید بین ۱ تا ۵ باشد')
  }
  return { difficulty, bankLevel: difficulty, totalTrials: TOTAL_TRIALS }
}

/** اندیس جمله‌های یک سطح از بانک */
function bankIndicesForLevel(level: number): readonly number[] {
  const indices: number[] = []
  SENTENCE_BANK_FA.forEach((sentence, index) => {
    if (sentence.level === level) indices.push(index)
  })
  return indices
}

/**
 * انتخاب جمله از زیربانک سطح؛ تا پیش از تخلیه، جملهٔ تکراری انتخاب
 * نمی‌شود. با تخلیهٔ زیربانک، فهرست استفاده‌شده‌ها از نو شروع می‌شود
 * تا تکرار در جلسه‌های بلندتر ممکن بماند.
 */
function drawSentence(
  rng: SeededRandom,
  level: number,
  usedIds: readonly number[],
): { index: number; sentence: SyllableSentence; usedIdsAfter: readonly number[] } {
  const subBank = bankIndicesForLevel(level)
  const remaining = subBank.filter((index) => !usedIds.includes(index))
  const freshStart = remaining.length === 0
  const pool = freshStart ? subBank : remaining
  const index = rng.pick(pool)
  return {
    index,
    sentence: SENTENCE_BANK_FA[index] as SyllableSentence,
    usedIdsAfter: freshStart ? [index] : [...usedIds, index],
  }
}

export const syllableCountingDefinition: ExerciseDefinition<
  SyllableCountingConfig,
  SyllableCountingState,
  SyllableCountingTrial,
  SyllableCountingAnswer
> = {
  id: SYLLABLE_COUNTING_ID,
  version: SYLLABLE_COUNTING_VERSION,
  contentVersion: SYLLABLE_COUNTING_CONTENT_VERSION,
  domain: 'verbal-auditory',

  createSession(sessionId, config, seed) {
    return {
      sessionId,
      config,
      seed,
      nextTrialIndex: 0,
      currentTrial: null,
      results: [],
      usedSentenceIds: [],
    }
  },

  nextTrial(state) {
    if (state.nextTrialIndex >= state.config.totalTrials) {
      throw new Error('همه جمله‌ها تولید شده‌اند')
    }
    const trialIndex = state.nextTrialIndex
    const rng = new SeededRandom(deriveTrialSeed(state.seed, trialIndex))
    const drawn = drawSentence(rng, state.config.bankLevel, state.usedSentenceIds)
    const trial: SyllableCountingTrial = {
      trialIndex,
      text: drawn.sentence.text,
      syllableCount: drawn.sentence.syllableCount,
      responseWindowMs: null,
    }
    return {
      state: {
        ...state,
        nextTrialIndex: trialIndex + 1,
        currentTrial: trial,
        usedSentenceIds: drawn.usedIdsAfter,
      },
      trial,
    }
  },

  submitAnswer(state, answer, reactionTimeMs) {
    const trial = state.currentTrial
    if (!trial) throw new Error('جملهٔ فعالی برای ثبت پاسخ وجود ندارد')
    const given = answer
    const isCorrect = given !== null && given === trial.syllableCount
    const outcome: TrialOutcome = given === null ? 'omission' : isCorrect ? 'correct' : 'incorrect'
    const record: RecordedTrial = {
      trialIndex: trial.trialIndex,
      // محرک فقط متن است؛ شمار هجا هرگز به UI داده نمی‌شود
      stimulus: { text: trial.text },
      expected: trial.syllableCount,
      given,
      outcome,
      correct: outcomeIsCorrect(outcome),
      reactionTimeMs: given === null ? null : reactionTimeMs,
    }
    return { ...state, currentTrial: null, results: [...state.results, record] }
  },

  isComplete(state) {
    return state.results.length >= state.config.totalTrials
  },

  getSummary(state): ExerciseSummary {
    const totals = summarizeOutcomes(state.results)
    const answered = state.results.filter((r) => typeof r.given === 'number')
    const absoluteErrors = answered.map((r) => Math.abs((r.given as number) - (r.expected as number)))
    /** میانگین خطای مطلق مراحل پاسخداده‌شده با یک رقم اعشار */
    const meanAbsoluteError =
      absoluteErrors.length > 0
        ? Math.round((absoluteErrors.reduce((sum, e) => sum + e, 0) / absoluteErrors.length) * 10) / 10
        : 0
    /** درصد پاسخ‌های دقیقاً درست در بین مراحل پاسخداده‌شده */
    const exactCount = answered.filter((r) => r.given === r.expected).length
    const exactAnswerRate =
      answered.length > 0 ? Math.round((exactCount / answered.length) * 1000) / 10 : 0
    return {
      exerciseId: SYLLABLE_COUNTING_ID,
      sessionId: state.sessionId,
      exerciseVersion: SYLLABLE_COUNTING_VERSION,
      contentVersion: SYLLABLE_COUNTING_CONTENT_VERSION,
      domain: 'verbal-auditory',
      difficulty: state.config.difficulty,
      ...totals,
      metrics: {
        meanAbsoluteError,
        exactAnswerRate,
      },
    }
  },
}
