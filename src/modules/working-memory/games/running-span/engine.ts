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
 * Running Span — دهانهٔ جاری (حافظهٔ کاری)
 *
 * ارقام یکی‌یکی و سریع نمایش داده می‌شوند و بازیکن نمی‌داند جریان کی
 * تمام می‌شود؛ به‌محض پایانِ بی‌اعلان باید «چند رقم آخر» را به ترتیب
 * وارد کند — سنجش تقریباً خالص «به‌روزرسانی» بدون امکان مرور ذهنی.
 * طول جریان از روی بذر قطعی تعیین می‌شود (۷ تا ۱۲ رقم) پس بازتولید
 * تست‌ها تضمین است.
 *
 * اقتباس از پارادایم running span (Bunting 2006) در ادبیات حافظهٔ کاری؛
 * بدون دارایی بصری هیچ محصول تجاری.
 */

export interface RunningSpanConfig extends ExerciseConfig {
  /** تعداد مراحل (جریان‌ها) در جلسه */
  readonly totalTrials: number
  /** عمق یادآوری — چند رقم آخر باید وارد شود */
  readonly recallDepth: number
  /** کف طول جریان (ناقطعیت طول بخشی از تکلیف است) */
  readonly minLength: number
  /** سقف طول جریان */
  readonly maxLength: number
  /** مدت نمایش هر رقم (ms) */
  readonly displayMsPerDigit: number
}

export interface RunningSpanState extends ExerciseState<RunningSpanConfig> {
  readonly currentTrial: RunningSpanTrial | null
}

export interface RunningSpanTrial extends ExerciseTrial {
  /** جریان کامل — ارقام با تکرارِ غیرمجاور */
  readonly digits: readonly number[]
  readonly recallDepth: number
  readonly displayMsPerDigit: number
  /** فاصله بین رقم‌ها (ms) */
  readonly gapMs: number
}

export type RunningSpanAnswer = readonly number[]

export const RUNNING_SPAN_ID = 'running-span'
export const RUNNING_SPAN_VERSION = '1.0.0'
export const RUNNING_SPAN_CONTENT_VERSION = '1'
const TOTAL_TRIALS = 10
const GAP_MS = 250

/** تنظیمات سطح دشواری — اعداد طراحی‌اند، نه هنجار بالینی */
export function configForDifficulty(difficulty: number): RunningSpanConfig {
  if (difficulty < 1 || difficulty > 5) {
    throw new RangeError('دشواری باید بین ۱ تا ۵ باشد')
  }
  return {
    difficulty,
    totalTrials: TOTAL_TRIALS,
    // عمق یادآوری ۳ تا ۵: دشواری ۱-۲ → ۳، ۳-۴ → ۴، ۵ → ۵
    recallDepth: difficulty <= 2 ? 3 : difficulty <= 4 ? 4 : 5,
    minLength: 7,
    maxLength: 12,
    // دشواری ۱ → ۷۰۰ms هر رقم؛ دشواری ۵ → ۴۲۰ms
    displayMsPerDigit: 700 - (difficulty - 1) * 70,
  }
}

/** دنبالهٔ مورد انتظار: recallDepth رقم آخر به ترتیب */
export function expectedTail(digits: readonly number[], recallDepth: number): number[] {
  return digits.slice(-recallDepth)
}

/**
 * نسبت موقعیت‌های درست در یادآوریِ دنبالهٔ انتظار (۰ تا ۱) —
 * همان قرارداد توالی اعداد، محدود به دنبالهٔ انتظار.
 */
export function tailMatchRate(expected: readonly number[], given: readonly number[]): number {
  let matches = 0
  const len = Math.min(expected.length, given.length)
  for (let i = 0; i < len; i += 1) {
    if (expected[i] === given[i]) matches += 1
  }
  return expected.length === 0 ? 0 : matches / expected.length
}

/** تولید ارقام جریان: تکرار مجاور ممنوع، تکرار غیرمجاور آزاد */
function makeDigits(rng: SeededRandom, length: number): number[] {
  const digits: number[] = []
  while (digits.length < length) {
    const d = rng.int(0, 9)
    if (digits.length > 0 && digits[digits.length - 1] === d) continue
    digits.push(d)
  }
  return digits
}

export const runningSpanDefinition: ExerciseDefinition<
  RunningSpanConfig,
  RunningSpanState,
  RunningSpanTrial,
  RunningSpanAnswer
> = {
  id: RUNNING_SPAN_ID,
  version: RUNNING_SPAN_VERSION,
  contentVersion: RUNNING_SPAN_CONTENT_VERSION,
  domain: 'working-memory',

  createSession(sessionId, config, seed) {
    return { sessionId, config, seed, nextTrialIndex: 0, currentTrial: null, results: [] }
  },

  nextTrial(state) {
    if (state.nextTrialIndex >= state.config.totalTrials) {
      throw new Error('همه جریان‌ها تولید شده‌اند')
    }
    const trialIndex = state.nextTrialIndex
    const rng = new SeededRandom(deriveTrialSeed(state.seed, trialIndex))
    // طول جریان از روی بذر — نقطهٔ پایان برای بازیکن پیش‌بینی‌ناپذیر
    const length = rng.int(state.config.minLength, state.config.maxLength)
    const digits = makeDigits(rng, length)
    const trial: RunningSpanTrial = {
      trialIndex,
      digits,
      recallDepth: state.config.recallDepth,
      displayMsPerDigit: state.config.displayMsPerDigit,
      gapMs: GAP_MS,
      responseWindowMs: null,
    }
    return { state: { ...state, nextTrialIndex: trialIndex + 1, currentTrial: trial }, trial }
  },

  submitAnswer(state, answer, reactionTimeMs) {
    const trial = state.currentTrial
    if (!trial) throw new Error('جریان فعالی برای ثبت پاسخ وجود ندارد')
    const tail = expectedTail(trial.digits, trial.recallDepth)
    const given = answer
    const isCorrect = given !== null && given.length === tail.length && tailMatchRate(tail, given) === 1
    const outcome: TrialOutcome = given === null ? 'omission' : isCorrect ? 'correct' : 'incorrect'
    const record: RecordedTrial = {
      trialIndex: trial.trialIndex,
      stimulus: { digits: trial.digits, recallDepth: trial.recallDepth, streamLength: trial.digits.length },
      expected: tail,
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
    let itemErrors = 0
    let orderErrors = 0
    let intrusions = 0
    let givenCount = 0
    let matchSum = 0
    let partialSum = 0
    for (const r of state.results) {
      const expected = r.expected as readonly number[] | null
      const digits = (r.stimulus as { digits: readonly number[] }).digits
      const given = r.given as readonly number[] | null
      if (!expected || !given) continue
      const expectedSet = new Set(expected)
      givenCount += given.length
      matchSum += tailMatchRate(expected, given)
      partialSum +=
        given.length === 0 ? 0 : given.filter((d) => expectedSet.has(d)).length / given.length
      for (let i = 0; i < given.length; i += 1) {
        const d = given[i] as number
        if (expectedSet.has(d)) {
          if (expected[i] !== d) orderErrors += 1
        } else {
          itemErrors += 1
          // رقم متعلق به بخش قدیمیِ فهرست (نه دنبالهٔ انتظار) = تهاجم آغازین
          if (digits.includes(d)) intrusions += 1
        }
      }
    }
    const trials = state.results.length
    const mean = (sum: number) => (trials === 0 ? 0 : Math.round((sum / trials) * 1000) / 10)
    return {
      exerciseId: RUNNING_SPAN_ID,
      sessionId: state.sessionId,
      exerciseVersion: RUNNING_SPAN_VERSION,
      contentVersion: RUNNING_SPAN_CONTENT_VERSION,
      domain: 'working-memory',
      difficulty: state.config.difficulty,
      ...totals,
      metrics: {
        /** میانگین ارقامِ در جای درست از دنبالهٔ انتظار (٪) */
        lastNInOrderRate: mean(matchSum),
        /** امتیاز اعتبار جزئی: سهم ارقام پاسخِ حاضر در دنبالهٔ انتظار (٪) */
        partialCreditScore: mean(partialSum),
        itemErrors,
        orderErrors,
        /** نرخ تهاجم آغازین: سهم ارقامِ بخش قدیمی فهرست در کل پاسخ‌ها (٪) */
        primacyIntrusionRate: givenCount === 0 ? 0 : Math.round((intrusions / givenCount) * 1000) / 10,
        recallDepth: state.config.recallDepth,
      },
    }
  },
}
