import type {
  ExerciseConfig,
  ExerciseDefinition,
  ExerciseState,
  ExerciseSummary,
  ExerciseTrial,
  RecordedTrial,
} from '../../../../core/types'
import { SeededRandom } from '../../../../core/randomization/seeded-random'
import { deriveTrialSeed } from '../../../../core/randomization/derive-seed'
import { summarizeOutcomes } from '../../../../core/scoring/scoring'

/**
 * ترکیب واژه (Word Blend) — حوزهٔ زبانی-شنیداری؛ موج زبانی؛ نخستین بازیِ
 * ساخته‌شده روی زیرساخت صدای محلی (audio/speech).
 *
 * قطعات یک واژه (هجا/واحد معنایی) یکی‌یکی شنیده می‌شوند — یا در جبرانِ
 * نمایشی، یکی‌یکی دیده — و کاربر واژهٔ ساخته‌شده از آن قطعات را از میان
 * چهار گزینه انتخاب می‌کند: تمرین «ترکیب واجی»، پایهٔ خواندن و املای فارسی.
 *
 * هجاشکنی فارسی خودکار خطاپذیر است (صداهای کوتاه نوشته نمی‌شوند)، پس بانک
 * { word, parts } دست‌ساز و کامنت‌گذاری‌شده است — الگوی «بانک اعتبارسنجی‌شدهٔ»
 * شمارش هجا. موتور خالص است؛ پخش صدا فقط در کامپوننت.
 */

/** یک مدخل بانک: واژه + قطعاتش (به ترتیب خوانده‌شدن) */
export interface BlendEntry {
  readonly word: string
  readonly parts: readonly string[]
  readonly level: number
}

/**
 * بانک ۴۰ مدخل — ۸ در هر سطح؛ همهٔ واژه‌ها دو قطعه دارند و اتصال قطعات
 * (پس از حذف اعراب) دوباره همان واژه را می‌سازد — تست تضمین می‌کند.
 * نردبان: قطعه‌بندی ساده → واژهٔ مرکب → مرکب‌های طولانی‌تر.
 */
export const BLEND_BANK_FA: readonly BlendEntry[] = [
  // ─── سطح ۱ — قطعه‌بندی هجایی ساده ───
  { word: 'کتاب', parts: ['کت', 'اب'], level: 1 }, // کت + اب
  { word: 'پنبه', parts: ['پن', 'به'], level: 1 }, // پن + به
  { word: 'ماهی', parts: ['ما', 'هی'], level: 1 }, // ما + هی
  { word: 'درخت', parts: ['دَر', 'خت'], level: 1 }, // دَر + خت
  { word: 'پرده', parts: ['پُر', 'ده'], level: 1 }, // پُر + ده
  { word: 'خانه', parts: ['خا', 'نه'], level: 1 }, // خا + نه
  { word: 'شیرین', parts: ['شی', 'رین'], level: 1 }, // شی + رین
  { word: 'آبشار', parts: ['آب', 'شار'], level: 1 }, // آب + شار
  // ─── سطح ۲ — دو قطعه، واژهٔ طولانی‌تر ───
  { word: 'پنجره', parts: ['پن', 'جره'], level: 2 }, // پن + جره
  { word: 'مدرسه', parts: ['مدر', 'سه'], level: 2 }, // مدر + سه
  { word: 'فرشته', parts: ['فرش', 'ته'], level: 2 }, // فرش + ته
  { word: 'ستاره', parts: ['ستا', 'ره'], level: 2 }, // ستا + ره
  { word: 'گلدان', parts: ['گل', 'دان'], level: 2 }, // گل + دان
  { word: 'خورشید', parts: ['خور', 'شید'], level: 2 }, // خور + شید
  { word: 'دوچرخه', parts: ['دو', 'چرخه'], level: 2 }, // دو + چرخه
  { word: 'سماور', parts: ['سما', 'ور'], level: 2 }, // سما + ور
  // ─── سطح ۳ — قطعهٔ ترکیبی سخت‌تر ───
  { word: 'پرتقال', parts: ['پُرَت', 'قال'], level: 3 }, // پُرَت + قال
  { word: 'گوسفند', parts: ['گو', 'سفند'], level: 3 }, // گو + سفند
  { word: 'هواپیما', parts: ['هوا', 'پیما'], level: 3 }, // هوا + پیما
  { word: 'کارخانه', parts: ['کار', 'خانه'], level: 3 }, // کار + خانه
  { word: 'دریاچه', parts: ['دریا', 'چه'], level: 3 }, // دریا + چه
  { word: 'نردبان', parts: ['نَرد', 'بان'], level: 3 }, // نَرد + بان
  { word: 'بادکنک', parts: ['باد', 'کنک'], level: 3 }, // باد + کنک
  { word: 'یخچال', parts: ['یَخ', 'چال'], level: 3 }, // یَخ + چال
  // ─── سطح ۴ — واژهٔ مرکب (دو واحد معنایی) ───
  { word: 'گلخانه', parts: ['گل', 'خانه'], level: 4 }, // گل + خانه
  { word: 'کتابخانه', parts: ['کتاب', 'خانه'], level: 4 }, // کتاب + خانه
  { word: 'ماهواره', parts: ['ماه', 'واره'], level: 4 }, // ماه + واره
  { word: 'آبمیوه', parts: ['آب', 'میوه'], level: 4 }, // آب + میوه
  { word: 'شهربازی', parts: ['شهر', 'بازی'], level: 4 }, // شهر + بازی
  { word: 'سنگفرش', parts: ['سنگ', 'فرش'], level: 4 }, // سنگ + فرش
  { word: 'پرچمدار', parts: ['پرچم', 'دار'], level: 4 }, // پرچم + دار
  { word: 'هندوانه', parts: ['هندو', 'انه'], level: 4 }, // هندو + انه
  // ─── سطح ۵ — مرکب‌های طولانی و کمتر رایج ───
  { word: 'چراغ‌دان', parts: ['چراغ', 'دان'], level: 5 }, // چراغ + دان
  { word: 'پنبه‌زن', parts: ['پنبه', 'زن'], level: 5 }, // پنبه + زن
  { word: 'چای‌دان', parts: ['چای', 'دان'], level: 5 }, // چای + دان
  { word: 'شتربان', parts: ['شتر', 'بان'], level: 5 }, // شتر + بان
  { word: 'کفشدوزن', parts: ['کفش', 'دوزن'], level: 5 }, // کفش + دوزن
  { word: 'دریانوردی', parts: ['دریا', 'نوردی'], level: 5 }, // دریا + نوردی
  { word: 'آتش‌نشانی', parts: ['آتش', 'نشانی'], level: 5 }, // آتش + نشانی
  { word: 'دستمال‌کاغذی', parts: ['دستمال', 'کاغذی'], level: 5 }, // دستمال + کاغذی
]

export interface WordBlendConfig extends ExerciseConfig {
  /** سطح زیربانک */
  readonly blendLevel: number
  /** سرعت گفتار قطعات (نسبت) — در سطوح بالا تندتر */
  readonly speechRate: number
  /** فاصلهٔ بین قطعات (ms) */
  readonly partGapMs: number
  /** تعداد گزینه‌ها */
  readonly choiceCount: number
  readonly trials: number
}

export interface WordBlendState extends ExerciseState<WordBlendConfig> {
  readonly currentTrial: WordBlendTrial | null
}

export interface WordBlendTrial extends ExerciseTrial {
  readonly trialIndex: number
  /** مدخل هدف */
  readonly entry: BlendEntry
  /** گزینه‌ها — عنصر correctIndex درست است */
  readonly choices: readonly string[]
  readonly correctIndex: number
  readonly partGapMs: number
  /** سرعت گفتار قطعات از config — کامپوننت TTS از همین می‌خواند (v2) */
  readonly speechRate: number
}

export type WordBlendAnswer = number | null

export const WORD_BLEND_ID = 'word-blend'
export const WORD_BLEND_VERSION = '1.0.0'
export const WORD_BLEND_CONTENT_VERSION = '2' // v2: املای درست مرکب‌ها با نیم‌فاصله + سیم‌کشی speechRate به کامپوننت

const TOTAL_TRIALS = 12
const PART_GAP_MS_BY_DIFFICULTY: readonly number[] = [1200, 1000, 900, 800, 700]

export function configForDifficulty(difficulty: number): WordBlendConfig {
  if (difficulty < 1 || difficulty > 5) {
    throw new RangeError('دشواری باید بین ۱ تا ۵ باشد')
  }
  const level = difficulty - 1
  return {
    difficulty,
    blendLevel: difficulty,
    speechRate: 0.8 + 0.05 * level,
    partGapMs: PART_GAP_MS_BY_DIFFICULTY[level] as number,
    choiceCount: 4,
    trials: TOTAL_TRIALS,
  }
}

/** کشیدن مدخل‌های جلسه از زیربانک سطح — بدون تکرار پشت‌سرهم (الگوی بانک هجا) */
function drawEntries(config: WordBlendConfig, seed: number): BlendEntry[] {
  const rng = new SeededRandom(seed)
  const levelBank = BLEND_BANK_FA.filter((e) => e.level === config.blendLevel)
  if (levelBank.length === 0) {
    throw new Error(`مدخلی برای سطح ${config.blendLevel} در بانک نیست`)
  }
  const drawn: BlendEntry[] = []
  let bag = rng.shuffle(levelBank)
  let cursor = 0
  while (drawn.length < config.trials) {
    if (cursor >= bag.length) {
      bag = rng.shuffle(levelBank)
      cursor = 0
    }
    const entry = bag[cursor] as BlendEntry
    cursor += 1
    if (drawn[drawn.length - 1]?.word === entry.word) continue
    drawn.push(entry)
  }
  return drawn
}

export const wordBlendDefinition: ExerciseDefinition<
  WordBlendConfig,
  WordBlendState,
  WordBlendTrial,
  WordBlendAnswer
> = {
  id: WORD_BLEND_ID,
  version: WORD_BLEND_VERSION,
  contentVersion: WORD_BLEND_CONTENT_VERSION,
  domain: 'verbal-auditory',

  createSession(sessionId, config, seed) {
    return {
      sessionId,
      config,
      seed,
      nextTrialIndex: 0,
      currentTrial: null,
      results: [],
    }
  },

  nextTrial(state) {
    if (state.nextTrialIndex >= state.config.trials) {
      throw new Error('همه مراحل جلسه تولید شده‌اند')
    }
    const rng = new SeededRandom(deriveTrialSeed(state.seed, state.nextTrialIndex))
    const entries = drawEntries(state.config, state.seed)
    const entry = entries[state.nextTrialIndex] as BlendEntry
    // گزینه‌های فریب: واژه‌های دیگرِ بانک، ترجیحاً هم‌سطح
    const sameLevel = BLEND_BANK_FA.filter((e) => e.level === entry.level && e.word !== entry.word)
    const elsewhere = BLEND_BANK_FA.filter((e) => e.level !== entry.level)
    const distractors = rng
      .sample([...sameLevel, ...elsewhere], state.config.choiceCount - 1)
      .map((e) => e.word)
    const choices = rng.shuffle([entry.word, ...distractors])
    const trial: WordBlendTrial = {
      trialIndex: state.nextTrialIndex,
      entry,
      choices,
      correctIndex: choices.indexOf(entry.word),
      partGapMs: state.config.partGapMs,
      speechRate: state.config.speechRate,
      responseWindowMs: null,
    }
    return {
      state: { ...state, nextTrialIndex: trial.trialIndex + 1, currentTrial: trial },
      trial,
    }
  },

  submitAnswer(state, answer, reactionTimeMs) {
    const trial = state.currentTrial
    if (!trial) throw new Error('مرحله فعلی برای ثبت پاسخ وجود ندارد')
    const correct = answer === trial.correctIndex
    const record: RecordedTrial = {
      trialIndex: trial.trialIndex,
      stimulus: { word: trial.entry.word, parts: trial.entry.parts, choices: trial.choices },
      expected: trial.correctIndex,
      given: answer,
      outcome: answer === null ? 'omission' : correct ? 'correct' : 'incorrect',
      correct,
      reactionTimeMs,
    }
    return { ...state, currentTrial: null, results: [...state.results, record] }
  },

  isComplete(state) {
    return state.results.length >= state.config.trials
  },

  getSummary(state): ExerciseSummary {
    const totals = summarizeOutcomes(state.results)
    const answered = state.results.filter((r) => r.given !== null)
    const meanMs =
      answered.length === 0
        ? 0
        : Math.round(
            answered.reduce((acc, r) => acc + (r.reactionTimeMs ?? 0), 0) / answered.length,
          )
    return {
      exerciseId: WORD_BLEND_ID,
      sessionId: state.sessionId,
      exerciseVersion: WORD_BLEND_VERSION,
      contentVersion: WORD_BLEND_CONTENT_VERSION,
      domain: 'verbal-auditory',
      difficulty: state.config.difficulty,
      ...totals,
      metrics: {
        meanAnswerTimeMs: meanMs,
      },
    }
  },
}
