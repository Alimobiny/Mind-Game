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
 * Sequence Logic (منطق توالی) — حوزه استدلال
 *
 * یک توالی عددی با قاعده پنهان نمایش داده می‌شود و کاربر باید جمله
 * بعدی را از میان ۴ گزینه انتخاب کند. پنج خانواده قاعده وجود دارد:
 *   ۱. حسابی        a, a+k, a+2k, …            (k>0)
 *   ۲. هندسی        a, a·q, a·q², …            (q ∈ {2,3} و مقادیر < ۵۰۰)
 *   ۳. متناوب       +k1, −k2 به‌صورت تکرارشونده (مثل ۲،۷،۴،۹،۶ → +۵،−۳)
 *   ۴. درجه‌دومی     اختلاف‌ها خطی زیاد می‌شوند   (+۱، +۲، +۳، …)
 *   ۵. فیبوناچی‌گونه هر جمله = مجموع دو جمله قبل
 *
 * پاسخ هر مرحله همیشه با «ساخت» تعریف می‌شود (well-defined) و همه
 * مقادیر اعداد صحیح مثبتِ کوچک‌تر از ۵۰۰ هستند. هیچ مرحله مهلت
 * زمانی ندارد (بازی غیرزمانی مثل Calculation × 20).
 */

/** خانواده‌های قاعده پنهان — ترتیب، ترتیب باز شدن در سطوح دشواری است */
export type SequenceFamily = 'arithmetic' | 'geometric' | 'alternating' | 'quadratic' | 'fibonacci'

const ALL_FAMILIES: readonly SequenceFamily[] = [
  'arithmetic',
  'geometric',
  'alternating',
  'quadratic',
  'fibonacci',
]

export interface SequenceLogicConfig extends ExerciseConfig {
  readonly totalTrials: number
  /** خانواده‌های مجاز این سطح — با بالا رفتن سطح، خانواده تازه اضافه می‌شود */
  readonly families: readonly SequenceFamily[]
  /** تعداد جمله‌های نمایش‌داده‌شده از توالی (پیشوند) */
  readonly shownLength: number
  /** سطح ۵ اعداد بزرگ‌تر به کار می‌گیرد */
  readonly bigNumbers: boolean
}

export interface SequenceLogicState extends ExerciseState<SequenceLogicConfig> {
  readonly currentTrial: SequenceLogicTrial | null
}

export interface SequenceLogicTrial extends ExerciseTrial {
  /** پیشوند نمایش‌داده‌شده توالی */
  readonly shown: readonly number[]
  /** جمله درست بعدی */
  readonly answer: number
  /** ۴ گزینه شامل پاسخ — به‌هم‌ریخته */
  readonly options: readonly number[]
}

export type SequenceLogicAnswer = number

export const SEQUENCE_LOGIC_ID = 'sequence-logic'
export const SEQUENCE_LOGIC_VERSION = '1.0.0'
export const SEQUENCE_LOGIC_CONTENT_VERSION = '1'
const TOTAL_TRIALS = 12

/** کف و سقف همه مقادیر (جمله‌ها، پاسخ و گزینه‌ها) */
const MIN_VALUE = 1
const MAX_VALUE = 499

export function configForDifficulty(difficulty: number): SequenceLogicConfig {
  if (difficulty < 1 || difficulty > 5) {
    throw new RangeError('دشواری باید بین ۱ تا ۵ باشد')
  }
  return {
    difficulty,
    totalTrials: TOTAL_TRIALS,
    // هر سطح یک خانواده تازه باز می‌کند: ۱→حسابی، ۲→هندسی، ۳→متناوب، ۴→درجه‌دومی، ۵→فیبوناچی
    families: ALL_FAMILIES.slice(0, difficulty),
    // ۵ جمله در سطوح ۱ تا ۴ و ۶ جمله در سطح ۵
    shownLength: difficulty === 5 ? 6 : 5,
    bigNumbers: difficulty === 5,
  }
}

/** خروجی مولد خانواده: پیشوند + پاسخ + گامِ مشخصه (برای گزینه‌های انحرافی) */
export interface FamilySequence {
  readonly shown: readonly number[]
  readonly answer: number
  readonly step: number
}

/**
 * مولد مستقیم یک خانواده — صرفاً بر پایه rng و پیکربندی؛
 * صادرشده تا تست‌ها بتوانند قاعده هر خانواده را مستقیم بازرسی کنند.
 */
export function generateFamilySequence(
  rng: SeededRandom,
  family: SequenceFamily,
  config: SequenceLogicConfig,
): FamilySequence {
  const big = config.bigNumbers
  switch (family) {
    case 'arithmetic': {
      const a = big ? rng.int(10, 60) : rng.int(1, 25)
      const k = big ? rng.int(6, 15) : rng.int(2, 9)
      const values = Array.from({ length: config.shownLength + 1 }, (_, i) => a + i * k)
      return { shown: values.slice(0, -1), answer: values[values.length - 1] as number, step: k }
    }
    case 'geometric': {
      const q = rng.pick([2, 3])
      // با نسبت ۳، پاسخِ بیش از ۵ جمله از سقف ۴۹۹ عبور می‌کند؛
      // بنابراین پیشوند نمایشِ خانواده هندسی حداکثر ۵ جمله است
      const shownLength = q === 3 ? Math.min(config.shownLength, 5) : config.shownLength
      const aMax = Math.max(MIN_VALUE, Math.floor(MAX_VALUE / q ** shownLength))
      const a = rng.int(MIN_VALUE, aMax)
      const values = Array.from({ length: shownLength + 1 }, (_, i) => a * q ** i)
      return { shown: values.slice(0, -1), answer: values[values.length - 1] as number, step: q }
    }
    case 'alternating': {
      const k1 = big ? rng.int(5, 15) : rng.int(2, 9)
      let k2 = big ? rng.int(5, 15) : rng.int(2, 9)
      // برابری دو گام یعنی نوسان بین دو مقدار و نقض تمایز جمله‌ها
      if (k2 === k1) k2 = k1 + 1
      const a = big ? rng.int(30, 80) : rng.int(10, 40)
      const values: number[] = [a]
      // گام‌های فرد +k1 و گام‌های زوج −k2؛ جمله آخر (پاسخ) هم از همین ریتم می‌آید
      for (let i = 1; i <= config.shownLength; i++) {
        values.push(values[i - 1] as number + (i % 2 === 1 ? k1 : -k2))
      }
      return { shown: values.slice(0, -1), answer: values[values.length - 1] as number, step: k1 }
    }
    case 'quadratic': {
      const a = big ? rng.int(10, 60) : rng.int(1, 20)
      const startDiff = big ? rng.int(4, 10) : rng.int(1, 5)
      const values: number[] = [a]
      // اختلاف‌ها خطی زیاد می‌شوند: d, d+1, d+2, … (مثل اعداد مثلثی)
      for (let i = 1; i <= config.shownLength; i++) {
        values.push((values[i - 1] as number) + startDiff + (i - 1))
      }
      return {
        shown: values.slice(0, -1),
        answer: values[values.length - 1] as number,
        step: startDiff + config.shownLength - 1,
      }
    }
    case 'fibonacci': {
      const maxValue = big ? 12 : 9
      const a = rng.int(MIN_VALUE, maxValue)
      let b = rng.int(MIN_VALUE, maxValue)
      // a=b یعنی دو جمله اول تکراری؛ جمله‌های نمایش‌داده‌شده باید متمایز باشند
      if (b === a) b = (b % maxValue) + 1
      const values: number[] = [a, b]
      // هر جمله = مجموع دو جمله قبل
      for (let i = 2; i <= config.shownLength; i++) {
        values.push((values[i - 1] as number) + (values[i - 2] as number))
      }
      return { shown: values.slice(0, -1), answer: values[values.length - 1] as number, step: b }
    }
  }
}

/**
 * اعتبارسنجی توالی ساخته‌شده: همه مقادیر صحیح و در بازه [۱، ۴۹۹] و
 * تماماً متمایز (جمله‌ها + پاسخ). اکثر خانواده‌ها ذاتاً معتبرند؛
 * فقط «متناوب» به‌طور کمیاب می‌تواند مقادیر تکراری یا منفی بسازد.
 */
function isValidSequence(seq: FamilySequence): boolean {
  const all = [...seq.shown, seq.answer]
  return (
    all.every((v) => Number.isInteger(v) && v >= MIN_VALUE && v <= MAX_VALUE) &&
    new Set(all).size === all.length
  )
}

/**
 * سه گزینه انحرافیِ «تقریباً درست»: ±۱، ±گامِ مشخصه، نصف/دوبرابر.
 * همه متمایز از پاسخ، از هم و از جمله‌های نمایش‌داده‌شده؛ مثبت.
 */
function makeDistractors(rng: SeededRandom, seq: FamilySequence): number[] {
  const forbidden = new Set<number>([...seq.shown, seq.answer])
  const picked: number[] = []
  const push = (value: number): void => {
    if (!Number.isInteger(value) || value < MIN_VALUE || value > MAX_VALUE) return
    if (forbidden.has(value)) return
    forbidden.add(value)
    picked.push(value)
  }
  // ترتیب تصادفی روی کاندیدها تا الگوی جایگاه پاسخ قابل حدس نباشد
  const nearMisses = rng.shuffle([
    seq.answer - 1,
    seq.answer + 1,
    seq.answer - seq.step,
    seq.answer + seq.step,
    Math.round(seq.answer / 2),
    seq.answer * 2,
  ])
  for (const candidate of nearMisses) {
    if (picked.length === 3) break
    push(candidate)
  }
  // پشتیبان قطعی (عملاً غیرقابل‌رسیدن): جابه‌جایی‌های رشدیافته
  for (let offset = 2; picked.length < 3 && offset <= MAX_VALUE; offset++) {
    push(seq.answer - offset)
    if (picked.length < 3) push(seq.answer + offset)
  }
  if (picked.length < 3) {
    throw new Error('تولید گزینه‌های انحرافی شکست خورد')
  }
  return picked
}

/** ساخت یک مرحله کامل: انتخاب خانواده، توالی، گزینه‌ها و به‌هم‌ریختن */
function makeTrial(rng: SeededRandom, config: SequenceLogicConfig, trialIndex: number): SequenceLogicTrial {
  const family = rng.pick(config.families)
  let seq = generateFamilySequence(rng, family, config)
  // در حالت کمیاب نامعتبر (مثل برخورد مقادیر در توالی متناوب) دوباره ساخته می‌شود؛
  // جریان rng قطعی است پس خروجی هم قطعی می‌ماند
  for (let attempt = 0; !isValidSequence(seq) && attempt < 32; attempt++) {
    seq = generateFamilySequence(rng, family, config)
  }
  if (!isValidSequence(seq)) {
    throw new Error('تولید توالی معتبر شکست خورد')
  }
  const distractors = makeDistractors(rng, seq)
  const options = rng.shuffle([seq.answer, ...distractors])
  return { trialIndex, shown: seq.shown, answer: seq.answer, options, responseWindowMs: null }
}

export const sequenceLogicDefinition: ExerciseDefinition<
  SequenceLogicConfig,
  SequenceLogicState,
  SequenceLogicTrial,
  SequenceLogicAnswer
> = {
  id: SEQUENCE_LOGIC_ID,
  version: SEQUENCE_LOGIC_VERSION,
  contentVersion: SEQUENCE_LOGIC_CONTENT_VERSION,
  domain: 'reasoning',

  createSession(sessionId, config, seed) {
    return { sessionId, config, seed, nextTrialIndex: 0, currentTrial: null, results: [] }
  },

  nextTrial(state) {
    if (state.nextTrialIndex >= state.config.totalTrials) {
      throw new Error('همه مراحل تولید شده‌اند')
    }
    const trialIndex = state.nextTrialIndex
    const rng = new SeededRandom(deriveTrialSeed(state.seed, trialIndex))
    const trial = makeTrial(rng, state.config, trialIndex)
    return { state: { ...state, nextTrialIndex: trialIndex + 1, currentTrial: trial }, trial }
  },

  submitAnswer(state, answer, reactionTimeMs) {
    const trial = state.currentTrial
    if (!trial) throw new Error('مرحله فعالی برای ثبت پاسخ وجود ندارد')
    const isCorrect = answer !== null && answer === trial.answer
    const outcome: TrialOutcome = answer === null ? 'omission' : isCorrect ? 'correct' : 'incorrect'
    const record: RecordedTrial = {
      trialIndex: trial.trialIndex,
      stimulus: { shown: trial.shown },
      expected: trial.answer,
      given: answer,
      outcome,
      correct: outcomeIsCorrect(outcome),
      reactionTimeMs: answer === null ? null : reactionTimeMs,
    }
    return { ...state, currentTrial: null, results: [...state.results, record] }
  },

  isComplete(state) {
    return state.results.length >= state.config.totalTrials
  },

  getSummary(state): ExerciseSummary {
    const totals = summarizeOutcomes(state.results)
    // امتیاز وزن‌دار: هر پاسخ درست به‌اندازه سطح دشواری امتیاز دارد
    const difficultyWeightedScore = state.results.reduce(
      (sum, r) => sum + (r.correct ? state.config.difficulty : 0),
      0,
    )
    // میانگین طول پیشوند نمایش‌داده‌شده (مثلاً هندسی با نسبت ۳ یکی کوتاه‌تر است)
    const shownLengths = state.results.map(
      (r) => (r.stimulus as { shown?: readonly number[] } | null)?.shown?.length ?? 0,
    )
    const avgShownLength =
      shownLengths.length > 0
        ? Math.round((shownLengths.reduce((sum, n) => sum + n, 0) / shownLengths.length) * 10) / 10
        : 0
    return {
      exerciseId: SEQUENCE_LOGIC_ID,
      sessionId: state.sessionId,
      exerciseVersion: SEQUENCE_LOGIC_VERSION,
      contentVersion: SEQUENCE_LOGIC_CONTENT_VERSION,
      domain: 'reasoning',
      difficulty: state.config.difficulty,
      ...totals,
      metrics: { difficultyWeightedScore, avgShownLength },
    }
  },
}
