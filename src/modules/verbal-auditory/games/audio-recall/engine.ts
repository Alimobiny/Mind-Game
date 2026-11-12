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
import { accuracyPercent, summarizeOutcomes } from '../../../../core/scoring/scoring'

/**
 * یادآوری شنیداری (Audio Recall) — حوزهٔ زبانی-شنیداری؛ موج زبانی.
 *
 * نسخهٔ شنیداریِ توالی: N واژهٔ کوتاه یکی‌یکی ارائه می‌شود (پخش با صدای
 * دستگاه از audio/speech — یا در جبرانِ نمایشی، فلاشِ دیداری) و پس از پایان،
 * بازیابی «به همان ترتیب» با لمس از شبکهٔ 2N گزینه. ساختار دو-فازی
 * مطابق حافظهٔ واژه‌هاست؛ تفاوت در ترتیب‌مندیِ پاسخ است.
 *
 * موتور خالص است: محرک = متن واژه‌ها؛ نحوهٔ ارائه (صدا/نمایش) فقط تصمیم
 * کامپوننت است و در قطعیت و تست‌پذیری اثری ندارد.
 */

/** بانک واژه‌های کوتاه — متمایز و تک‌هجایی/دوهجایی برای شنیدن آسان */
export const AUDIO_WORDS_FA: readonly string[] = [
  'آب', 'برف', 'باد', 'خاک', 'ماه', 'ستاره',
  'کوه', 'دریا', 'رود', 'جنگل', 'گل', 'برگ',
  'سیب', 'انار', 'نان', 'شیر', 'چای', 'نمک',
  'کلید', 'قفل', 'ساعت', 'چتر', 'کفش', 'حلقه',
]

export interface AudioRecallConfig extends ExerciseConfig {
  /** دهانه — تعداد واژه‌های هر مرحله */
  readonly spanCount: number
  /** مدت ارائهٔ هر واژه (ms) — در حالت نمایشی ملاک تایمر است */
  readonly wordDisplayMs: number
  /** فاصلهٔ بین واژه‌ها (ms) */
  readonly gapMs: number
  readonly trials: number
}

export interface AudioRecallState extends ExerciseState<AudioRecallConfig> {
  readonly currentTrial: AudioRecallTrial | null
}

export interface AudioRecallTrial extends ExerciseTrial {
  readonly trialIndex: number
  /** واژه‌های مرحله به ترتیب ارائه */
  readonly studyWords: readonly string[]
  /** گزینه‌های بازیابی: واژه‌های دسته + حواس‌پرتی، به ترتیب نمایش */
  readonly recallOptions: readonly string[]
  /** زمان‌بندی ارائه — کامپوننت ریتم فاز ارائه را با همین می‌راند */
  readonly wordSlotMs: number
}

/** پاسخ: واژه‌های انتخابی به ترتیب لمس */
export type AudioRecallAnswer = readonly string[] | null

export const AUDIO_RECALL_ID = 'audio-recall'
export const AUDIO_RECALL_VERSION = '1.0.0'
export const AUDIO_RECALL_CONTENT_VERSION = '1'

const SPAN_BY_DIFFICULTY: readonly number[] = [3, 4, 5, 6, 7]
const DISPLAY_MS_BY_DIFFICULTY: readonly number[] = [1300, 1200, 1100, 1000, 900]
const GAP_MS = 400
const TOTAL_TRIALS = 6

export function configForDifficulty(difficulty: number): AudioRecallConfig {
  if (difficulty < 1 || difficulty > 5) {
    throw new RangeError('دشواری باید بین ۱ تا ۵ باشد')
  }
  const level = difficulty - 1
  return {
    difficulty,
    spanCount: SPAN_BY_DIFFICULTY[level] as number,
    wordDisplayMs: DISPLAY_MS_BY_DIFFICULTY[level] as number,
    gapMs: GAP_MS,
    trials: TOTAL_TRIALS,
  }
}

export const audioRecallDefinition: ExerciseDefinition<
  AudioRecallConfig,
  AudioRecallState,
  AudioRecallTrial,
  AudioRecallAnswer
> = {
  id: AUDIO_RECALL_ID,
  version: AUDIO_RECALL_VERSION,
  contentVersion: AUDIO_RECALL_CONTENT_VERSION,
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
    const studyWords = rng.sample(AUDIO_WORDS_FA, state.config.spanCount)
    const distractors = rng.sample(
      AUDIO_WORDS_FA.filter((w) => !studyWords.includes(w)),
      state.config.spanCount,
    )
    const recallOptions = rng.shuffle([...studyWords, ...distractors])
    const trial: AudioRecallTrial = {
      trialIndex: state.nextTrialIndex,
      studyWords,
      recallOptions,
      wordSlotMs: state.config.wordDisplayMs + state.config.gapMs,
      // پنجرهٔ پاسخ = کل فاز ارائه + بازیابیِ خودتنظیم (مثل حافظهٔ واژه‌ها،
      // خود کامپوننت فاز ارائه را می‌راند و بازیابی بی‌مهلت است)
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

    const given = answer ?? []
    const exact =
      given.length === trial.studyWords.length &&
      trial.studyWords.every((w, i) => given[i] === w)

    const record: RecordedTrial = {
      trialIndex: trial.trialIndex,
      stimulus: { studyWords: trial.studyWords, recallOptions: trial.recallOptions },
      expected: [...trial.studyWords],
      given: answer === null ? null : given,
      outcome: answer === null ? 'omission' : exact ? 'correct' : 'incorrect',
      correct: answer !== null && exact,
      reactionTimeMs,
    }
    return { ...state, currentTrial: null, results: [...state.results, record] }
  },

  isComplete(state) {
    return state.results.length >= state.config.trials
  },

  getSummary(state): ExerciseSummary {
    const totals = summarizeOutcomes(state.results)

    let positionMatches = 0
    let positionsTotal = 0
    for (const record of state.results) {
      const s = record.stimulus as { studyWords: readonly string[] }
      const given = (record.given as readonly string[] | null) ?? []
      s.studyWords.forEach((word, i) => {
        positionsTotal += 1
        if (given[i] === word) positionMatches += 1
      })
    }
    return {
      exerciseId: AUDIO_RECALL_ID,
      sessionId: state.sessionId,
      exerciseVersion: AUDIO_RECALL_VERSION,
      contentVersion: AUDIO_RECALL_CONTENT_VERSION,
      domain: 'verbal-auditory',
      difficulty: state.config.difficulty,
      ...totals,
      metrics: {
        spanCount: state.config.spanCount,
        positionMatchRate: accuracyPercent(positionMatches, positionsTotal),
        exactSequences: totals.correctTrials,
      },
    }
  },
}
