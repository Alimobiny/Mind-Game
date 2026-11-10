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
import { accuracyPercent, summarizeOutcomes } from '../../../../core/scoring/scoring'

/**
 * Word Memory (حافظه واژه‌ها) — حوزه کلامی و شنیداری
 *
 * هر مرحله دو فاز دارد:
 *  ۱) مطالعه: N واژه فارسی یکی‌یکی نمایش داده می‌شود؛
 *  ۲) بازخوانی: شبکه‌ای از ۲N واژه (N واژه مطالعه‌شده + N واژه جدید)
 *     نشان داده می‌شود و کاربر باید دقیقاً همان N واژه را انتخاب و تأیید کند.
 *
 * دشواری ۱..۵: تعداد واژه‌ها ۴..۸ و زمان نمایش هر واژه کوتاه‌تر می‌شود.
 * پاسخ درست فقط وقتی است که مجموعه انتخاب‌شده دقیقاً برابر مجموعه واژه‌های
 * مطالعه‌شده باشد (اندازه یکسان + عضویت همه؛ ترتیب بی‌اهمیت است).
 */

/** بانک واژه‌ها: اسم‌های عام و ملموس فارسی، متمایز از نظر معنایی و بصری */
export const WORD_BANK_FA: readonly string[] = [
  'سیب',
  'پرتقال',
  'هندوانه',
  'انگور',
  'انار',
  'کتاب',
  'دفتر',
  'خودکار',
  'مداد',
  'روزنامه',
  'دریا',
  'کوه',
  'رودخانه',
  'جنگل',
  'آبشار',
  'ماهی',
  'پرنده',
  'گربه',
  'سگ',
  'اسب',
  'شتر',
  'گوسفند',
  'خرگوش',
  'سنجاب',
  'روباه',
  'درخت',
  'ستاره',
  'آفتاب',
  'باران',
  'پنجره',
  'صندلی',
  'تابلو',
  'قاشق',
  'چنگال',
  'لیوان',
  'بشقاب',
  'ساعت',
  'عینک',
  'کلاه',
  'کفش',
  'جوراب',
  'پیراهن',
  'چتر',
  'کلید',
  'تلفن',
  'دوربین',
  'آینه',
  'شانه',
  'مسواک',
  'حوله',
  'بالش',
  'پتو',
  'فرش',
  'ماشین',
  'دوچرخه',
  'هواپیما',
  'قطار',
  'بادکنک',
  'جعبه',
  'چمدان',
]

export interface WordMemoryConfig extends ExerciseConfig {
  /** تعداد واژه‌های مطالعه‌شده در هر مرحله */
  readonly studyWordCount: number
  /** مدت نمایش هر واژه (ms) — با دشواری کوتاه می‌شود */
  readonly displayMsPerWord: number
  /** فاصله بین واژه‌ها (ms) */
  readonly gapMs: number
  /** تعداد مراحل ثبت جلسه */
  readonly totalTrials: number
}

export interface WordMemoryTrial extends ExerciseTrial {
  /** واژه‌های هدف (مطالعه‌شده) */
  readonly studyWords: readonly string[]
  /** ۲N گزینه بازخوانی: واژه‌های هدف + واژه‌های جدید، به‌هم‌ریخته */
  readonly recallOptions: readonly string[]
  readonly displayMsPerWord: number
  readonly gapMs: number
}

export interface WordMemoryState extends ExerciseState<WordMemoryConfig> {
  readonly currentTrial: WordMemoryTrial | null
}

/** پاسخ کاربر: واژه‌های انتخاب‌شده (ترتیب مهم نیست) */
export type WordMemoryAnswer = readonly string[]

export const WORD_MEMORY_ID = 'word-memory'
export const WORD_MEMORY_VERSION = '1.0.0'
export const WORD_MEMORY_CONTENT_VERSION = '1'
const TOTAL_TRIALS = 6

/** سطح‌های دشواری — اعداد طراحی‌اند، نه هنجار بالینی */
const STUDY_WORD_COUNTS: readonly number[] = [4, 5, 6, 7, 8]
const DISPLAY_MS_PER_WORD: readonly number[] = [1100, 1000, 900, 800, 700]
const GAP_MS = 300

export function configForDifficulty(difficulty: number): WordMemoryConfig {
  if (difficulty < 1 || difficulty > 5) {
    throw new RangeError('دشواری باید بین ۱ تا ۵ باشد')
  }
  const level = difficulty - 1
  return {
    difficulty,
    studyWordCount: STUDY_WORD_COUNTS[level] as number,
    displayMsPerWord: DISPLAY_MS_PER_WORD[level] as number,
    gapMs: GAP_MS,
    totalTrials: TOTAL_TRIALS,
  }
}

export const wordMemoryDefinition: ExerciseDefinition<
  WordMemoryConfig,
  WordMemoryState,
  WordMemoryTrial,
  WordMemoryAnswer
> = {
  id: WORD_MEMORY_ID,
  version: WORD_MEMORY_VERSION,
  contentVersion: WORD_MEMORY_CONTENT_VERSION,
  domain: 'verbal-auditory',

  createSession(sessionId, config, seed) {
    return { sessionId, config, seed, nextTrialIndex: 0, currentTrial: null, results: [] }
  },

  nextTrial(state) {
    if (state.nextTrialIndex >= state.config.totalTrials) {
      throw new Error('همه مراحل تولید شده‌اند')
    }
    const trialIndex = state.nextTrialIndex
    const rng = new SeededRandom(deriveTrialSeed(state.seed, trialIndex))
    // نمونه‌گیری N واژه مطالعه از بانک، سپس N واژه جدید از باقی‌مانده بانک
    const studyWords = rng.sample(WORD_BANK_FA, state.config.studyWordCount)
    const studySet = new Set(studyWords)
    const remaining = WORD_BANK_FA.filter((word) => !studySet.has(word))
    const distractors = rng.sample(remaining, state.config.studyWordCount)
    const trial: WordMemoryTrial = {
      trialIndex,
      studyWords,
      recallOptions: rng.shuffle([...studyWords, ...distractors]),
      displayMsPerWord: state.config.displayMsPerWord,
      gapMs: state.config.gapMs,
      responseWindowMs: null,
    }
    return { state: { ...state, nextTrialIndex: trialIndex + 1, currentTrial: trial }, trial }
  },

  submitAnswer(state, answer, reactionTimeMs) {
    const trial = state.currentTrial
    if (!trial) throw new Error('مرحله فعالی برای ثبت پاسخ وجود ندارد')
    const given = answer
    // درست فقط اگر اندازه یکی باشد و همه واژه‌های مطالعه حاضر باشند
    // (با اندازه برابر و حضور همه، تکراری بودن هم ممکن نیست)
    const isCorrect =
      given !== null &&
      given.length === trial.studyWords.length &&
      trial.studyWords.every((word) => given.includes(word))
    const outcome: TrialOutcome = given === null ? 'omission' : isCorrect ? 'correct' : 'incorrect'
    const record: RecordedTrial = {
      trialIndex: trial.trialIndex,
      stimulus: { studyWords: trial.studyWords },
      expected: [...trial.studyWords].sort(),
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
    let hits = 0
    let falseAlarms = 0
    let missedWords = 0
    let totalStudyWords = 0
    for (const record of state.results) {
      const studyWords = readStudyWords(record)
      const given = Array.isArray(record.given) ? (record.given as readonly string[]) : []
      const studySet = new Set(studyWords)
      const trialHits = given.filter((word) => studySet.has(word)).length
      hits += trialHits
      falseAlarms += given.length - trialHits
      missedWords += studyWords.length - trialHits
      totalStudyWords += studyWords.length
    }
    return {
      exerciseId: WORD_MEMORY_ID,
      sessionId: state.sessionId,
      exerciseVersion: WORD_MEMORY_VERSION,
      contentVersion: WORD_MEMORY_CONTENT_VERSION,
      domain: 'verbal-auditory',
      difficulty: state.config.difficulty,
      ...totals,
      metrics: {
        /** مجموع واژه‌های درست انتخاب‌شده در کل جلسه */
        hits,
        /** مجموع واژه‌های جدید (مزاحم) انتخاب‌شده */
        falseAlarms,
        /** مجموع واژه‌های هدفی که انتخاب نشدند */
        missedWords,
        /** درصد بازخوانی: کل واژه‌های درست / کل واژه‌های هدف × ۱۰۰ */
        meanRecallRate: accuracyPercent(hits, totalStudyWords),
      },
    }
  },
}

/** استخراج واژه‌های هدف از stimulus رکورد — داده خام serialize-friendly است */
function readStudyWords(record: RecordedTrial): readonly string[] {
  if (record.stimulus === null || typeof record.stimulus !== 'object') return []
  const words = (record.stimulus as { studyWords?: unknown }).studyWords
  return Array.isArray(words) ? (words as readonly string[]) : []
}
