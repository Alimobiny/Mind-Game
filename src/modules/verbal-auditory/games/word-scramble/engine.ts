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
import { normalizePersian } from '../../../../utils/persian'

/**
 * واژهٔ به‌هم‌ریخته (Word Scramble) — حوزهٔ زبانی-شنیداری؛ موج زبانی.
 *
 * حروف یک واژهٔ فارسی جابه‌جا شده‌اند؛ کاربر با لمس حروف به ترتیب، واژه را
 * بازسازی می‌کند. در سطح‌های ۴ و ۵ یک «حرف فریب» هم میان حروف است که
 * نباید استفاده شود — تشخیص حرف زائد، بار شناختی بیشتری می‌افزاید.
 *
 * بانک واژه‌ها دست‌چین است: ۴ تا ۷ حرفی، بدون نیم‌فاصله، بدون اعراب و بدون
 * فاصله. داوری با نرمال‌ساز فارسی (utils/persian) انجام می‌شود تا variantهای
 * نویسه‌ای (ی/ک عربی و…) نتیجه را تغییر ندهند.
 */

/**
 * بانک واژه‌ها — اسم‌های ملموس و آشنا؛ طول هر واژه در بازهٔ ۴..۷ است
 * (تست، طول/یکتایی/نبودِ نیم‌فاصله و اعراب را تضمین می‌کند).
 */
export const SCRAMBLE_BANK_FA: readonly string[] = [
  // ۴ حرفی
  'کتاب', 'مادر', 'آباد', 'پنبه', 'ماهی', 'پرده', 'گربه', 'ساعت',
  'کلاس', 'قاشق', 'چراغ', 'دریا', 'تلفن', 'شانه',
  // ۵ حرفی
  'مدرسه', 'شلوار', 'گلدان', 'پنجره', 'ستاره', 'پرنده', 'فرشته', 'زنجیر',
  'تصویر', 'سماور', 'پالتو', 'تاکسی',
  // ۶ حرفی
  'پرتقال', 'دوچرخه', 'نردبان', 'گوسفند', 'بادکنک', 'مبارزه', 'گلخانه', 'شیرینی',
  'خورشید', 'مهربان', 'نارگیل', 'خرمالو',
  // ۷ حرفی
  'هواپیما', 'هندوانه', 'شهربازی', 'ماهواره', 'کارخانه', 'پرچمدار', 'سنگفرش', 'شاهنامه',
]

export interface WordScrambleConfig extends ExerciseConfig {
  /** بازهٔ طول واژهٔ هدف */
  readonly minLength: number
  readonly maxLength: number
  /** آیا یک حرف فریب اضافه می‌شود (سطح ۴ و ۵) */
  readonly decoyLetter: boolean
  readonly trials: number
}

export interface WordScrambleState extends ExerciseState<WordScrambleConfig> {
  readonly currentTrial: WordScrambleTrial | null
}

export interface WordScrambleTrial extends ExerciseTrial {
  readonly trialIndex: number
  /** واژهٔ هدف */
  readonly target: string
  /** حروف نمایشی — جابه‌جاشدهٔ حروف هدف (+ حرف فریب) */
  readonly letters: readonly string[]
}

export type WordScrambleAnswer = string | null

export const WORD_SCRAMBLE_ID = 'word-scramble'
export const WORD_SCRAMBLE_VERSION = '1.0.0'
export const WORD_SCRAMBLE_CONTENT_VERSION = '2' // v2: چیدمان «فریب + بقیهٔ مرتب» هم رد می‌شود — معمای حل‌شده نمایش داده نمی‌شد

const TOTAL_TRIALS = 12

/** نردبان: طول واژه ۴..۷، حرف فریب فقط در سطح ۴ و ۵ */
const MIN_LENGTH_BY_DIFFICULTY: readonly number[] = [4, 4, 5, 5, 6]
const MAX_LENGTH_BY_DIFFICULTY: readonly number[] = [5, 6, 6, 7, 7]
const DECOY_BY_DIFFICULTY: readonly boolean[] = [false, false, false, true, true]

export function configForDifficulty(difficulty: number): WordScrambleConfig {
  if (difficulty < 1 || difficulty > 5) {
    throw new RangeError('دشواری باید بین ۱ تا ۵ باشد')
  }
  const level = difficulty - 1
  return {
    difficulty,
    minLength: MIN_LENGTH_BY_DIFFICULTY[level] as number,
    maxLength: MAX_LENGTH_BY_DIFFICULTY[level] as number,
    decoyLetter: DECOY_BY_DIFFICULTY[level] as boolean,
    trials: TOTAL_TRIALS,
  }
}

/**
 * آیا چیدمان «به‌سختی حل‌شده» است؟ فقط تکرارِ خود واژه در جایگاه‌های اصلی
 * نیست: اگر حذف یک حرف (در هر جایگاه — مثلاً فریبِ ابتدا) باقی‌مانده را
 * به ترتیبِ خود واژه بگذارد، معما عملاً حل‌شده نمایش داده می‌شود.
 */
function isTrivialLayout(shuffled: readonly string[], word: string): boolean {
  if (shuffled.slice(0, word.length).join('') === word) return true
  for (let skip = 0; skip < shuffled.length; skip += 1) {
    const rest = shuffled.filter((_, i) => i !== skip).join('')
    if (rest === word) return true
  }
  return false
}

/**
 * حروف به‌هم‌ریختهٔ تضمینی: چیدمان نباید خود واژه را در جایگاه‌های اصلی
 * بنشاند و نه با حذف یک حرف (فریب در ابتدا/انتها/وسط) به ترتیب واژه
 * برسد (v2 — در v1 فریبِ ابتدا + بقیهٔ مرتب پاس می‌شد).
 */
function scrambleLetters(rng: SeededRandom, word: string, decoy: string | null): string[] {
  const letters = [...word]
  if (decoy !== null) letters.push(decoy)
  for (let attempt = 0; attempt < 64; attempt += 1) {
    const shuffled = rng.shuffle(letters)
    if (!isTrivialLayout(shuffled, word)) return shuffled
  }
  // واژه‌ای با حروف کاملاً یکسان که هیچ چیدمان متفاوتی ندارد — عملاً رخ
  // نمی‌دهد؛ چیدمان نهایی به‌هرحال بازگردانده می‌شود
  return rng.shuffle(letters)
}

/** انتخاب حرف فریب — حرفی که در واژه نیست */
function pickDecoy(rng: SeededRandom, word: string): string {
  const alphabet = 'ابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی'
  const candidates = [...alphabet].filter((ch) => !word.includes(ch))
  return rng.pick(candidates)
}

/** کشیدن واژه‌های جلسه از بذر نشست — بازتولیدپذیر (مثل figureAt بلوک‌ها) */
function drawWords(config: WordScrambleConfig, seed: number): string[] {
  const rng = new SeededRandom(seed)
  const pool = SCRAMBLE_BANK_FA.filter(
    (w) => w.length >= config.minLength && w.length <= config.maxLength,
  )
  // دو نسخه از استخر برای جلسهٔ ۱۲تایی؛ تکرار پشت‌سرهم ممنوع
  const bag = rng.shuffle([...pool, ...pool])
  const drawn: string[] = []
  for (const word of bag) {
    if (drawn.length >= config.trials) break
    if (drawn[drawn.length - 1] === word) continue
    drawn.push(word)
  }
  return drawn
}

export const wordScrambleDefinition: ExerciseDefinition<
  WordScrambleConfig,
  WordScrambleState,
  WordScrambleTrial,
  WordScrambleAnswer
> = {
  id: WORD_SCRAMBLE_ID,
  version: WORD_SCRAMBLE_VERSION,
  contentVersion: WORD_SCRAMBLE_CONTENT_VERSION,
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
    const words = drawWords(state.config, state.seed)
    const target = words[state.nextTrialIndex] as string
    const decoy = state.config.decoyLetter ? pickDecoy(rng, target) : null
    const trial: WordScrambleTrial = {
      trialIndex: state.nextTrialIndex,
      target,
      letters: scrambleLetters(rng, target, decoy),
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
    // داوری با نرمال‌ساز تا variantهای نویسه‌ای نتیجه را عوض نکنند
    const correct = answer !== null && normalizePersian(answer) === normalizePersian(trial.target)
    const record: RecordedTrial = {
      trialIndex: trial.trialIndex,
      stimulus: { target: trial.target, letters: trial.letters },
      expected: trial.target,
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
      exerciseId: WORD_SCRAMBLE_ID,
      sessionId: state.sessionId,
      exerciseVersion: WORD_SCRAMBLE_VERSION,
      contentVersion: WORD_SCRAMBLE_CONTENT_VERSION,
      domain: 'verbal-auditory',
      difficulty: state.config.difficulty,
      ...totals,
      metrics: {
        meanAnswerTimeMs: meanMs,
        decoyTrials: state.config.decoyLetter ? state.config.trials : 0,
      },
    }
  },
}
