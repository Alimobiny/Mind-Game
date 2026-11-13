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
import { accuracyPercent, countOutcome, median, summarizeOutcomes } from '../../../../core/scoring/scoring'

/**
 * Simon Task — تداخل مکانی (توجه و مهار)
 *
 * دایرهٔ رنگی در سمت چپ یا راست نقطهٔ ثابت ظاهر می‌شود؛ بازیکن فقط به
 * «رنگ» پاسخ می‌دهد (آبی = دکمهٔ آبی، قرمز = دکمهٔ قرمز) و باید «مکان» را
 * نادیده بگیرد. مرحلهٔ سازگار: محرک همان سمتی است که دکمهٔ رنگ آن است؛
 * ناسازگار: مقابل. «اثر سایمون» = کندیِ ناسازگار نسبت به سازگار.
 * سطح ۵: نگاشت رنگ↔مکان دکمه‌ها در میانهٔ بلوک وارونه می‌شود.
 *
 * اقتباس از تکلیف شناخته‌شدهٔ سایمون در ادبیات توجه؛ بدون دارایی بصری
 * هیچ محصول تجاری.
 */

export type SimonColor = 'blue' | 'red'
export type SimonSide = 'left' | 'right'

export interface SimonConfig extends ExerciseConfig {
  /** تعداد کل مراحل */
  readonly totalTrials: number
  /** نسبت مراحل ناسازگار */
  readonly incongruentRatio: number
  /** مدت نمایش محرک (ms) — پنجره پاسخ = محرک + فاصله */
  readonly stimulusMs: number
  /** فاصله بین محرک‌ها (ms) */
  readonly interStimulusMs: number
  /** سطح ۵: وارونه‌شدن نگاشت رنگ↔مکان دکمه‌ها در میانهٔ بلوک */
  readonly invertMappingMidBlock: boolean
}

export interface SimonState extends ExerciseState<SimonConfig> {
  readonly currentTrial: SimonTrial | null
}

export interface SimonTrial extends ExerciseTrial {
  readonly color: SimonColor
  readonly side: SimonSide
  /** آیا محرک همان سمتِ دکمهٔ رنگ خودش است؟ */
  readonly congruent: boolean
  /** آیا نگاشت رنگ↔مکان در این مرحله وارونه است؟ (فقط سطح ۵، نیمهٔ دوم) */
  readonly mappingInverted: boolean
  readonly stimulusMs: number
  readonly interStimulusMs: number
}

/** پاسخ کاربر: دکمهٔ رنگی؛ null یعنی انقضای مهلت */
export type SimonAnswer = SimonColor | null

export const SIMON_ID = 'simon-task'
export const SIMON_VERSION = '1.0.0'
export const SIMON_CONTENT_VERSION = '1'
const TOTAL_TRIALS = 40

/** نگاشت پایهٔ رنگ → سمت دکمه (فیزیکی، مستقل از RTL) */
const BASE_SIDE: Record<SimonColor, SimonSide> = { blue: 'left', red: 'right' }

/** سمتِ دکمهٔ پاسخِ یک رنگ زیر نگاشت جاری */
export function mappedSide(color: SimonColor, mappingInverted: boolean): SimonSide {
  const base = BASE_SIDE[color]
  if (!mappingInverted) return base
  return base === 'left' ? 'right' : 'left'
}

/** تنظیمات سطح دشواری: ناسازگاری بیشتر، پنجره و فاصلهٔ کوتاه‌تر */
export function configForDifficulty(difficulty: number): SimonConfig {
  if (difficulty < 1 || difficulty > 5) {
    throw new RangeError('دشواری باید بین ۱ تا ۵ باشد')
  }
  return {
    difficulty,
    totalTrials: TOTAL_TRIALS,
    // دشواری ۱ → ۳۵٪ ناسازگار؛ دشواری ۵ → ۵۰٪
    incongruentRatio: 0.35 + (difficulty - 1) * 0.0375,
    // هم‌خانوادهٔ برو/نرو: دشواری ۱ → ۱۰۳۰/۸۱۰ms؛ دشواری ۵ → ۵۵۰/۴۵۰ms
    stimulusMs: 1150 - difficulty * 120,
    interStimulusMs: 900 - difficulty * 90,
    invertMappingMidBlock: difficulty === 5,
  }
}

export const simonDefinition: ExerciseDefinition<SimonConfig, SimonState, SimonTrial, SimonAnswer> = {
  id: SIMON_ID,
  version: SIMON_VERSION,
  contentVersion: SIMON_CONTENT_VERSION,
  domain: 'attention-control',

  createSession(sessionId, config, seed) {
    return { sessionId, config, seed, nextTrialIndex: 0, currentTrial: null, results: [] }
  },

  nextTrial(state) {
    if (state.nextTrialIndex >= state.config.totalTrials) {
      throw new Error('همه مراحل تولید شده‌اند')
    }
    const trialIndex = state.nextTrialIndex
    const rng = new SeededRandom(deriveTrialSeed(state.seed, trialIndex))
    const mappingInverted =
      state.config.invertMappingMidBlock && trialIndex >= state.config.totalTrials / 2
    const color: SimonColor = rng.bool() ? 'blue' : 'red'
    const responseSide = mappedSide(color, mappingInverted)
    const incongruent = rng.bool(state.config.incongruentRatio)
    const side: SimonSide = incongruent
      ? responseSide === 'left'
        ? 'right'
        : 'left'
      : responseSide
    const trial: SimonTrial = {
      trialIndex,
      color,
      side,
      congruent: !incongruent,
      mappingInverted,
      stimulusMs: state.config.stimulusMs,
      interStimulusMs: state.config.interStimulusMs,
      // پنجره پاسخ = کل بازه محرک + فاصله تا محرک بعد (مثل برو/نرو)
      responseWindowMs: state.config.stimulusMs + state.config.interStimulusMs,
    }
    return { state: { ...state, nextTrialIndex: trialIndex + 1, currentTrial: trial }, trial }
  },

  submitAnswer(state, answer, reactionTimeMs) {
    const trial = state.currentTrial
    if (!trial) throw new Error('محرک فعالی برای ثبت پاسخ وجود ندارد')
    const outcome: TrialOutcome =
      answer === null ? 'omission' : answer === trial.color ? 'correct' : 'incorrect'
    const record: RecordedTrial = {
      trialIndex: trial.trialIndex,
      stimulus: {
        color: trial.color,
        side: trial.side,
        congruent: trial.congruent,
        mappingInverted: trial.mappingInverted,
      },
      expected: trial.color,
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
    const stimulusOf = (r: RecordedTrial) => r.stimulus as { congruent: boolean }
    const rtsOf = (congruent: boolean) =>
      state.results
        .filter((r) => r.correct && r.reactionTimeMs !== null && stimulusOf(r).congruent === congruent)
        .map((r) => r.reactionTimeMs as number)
    const rtCongruent = median(rtsOf(true))
    const rtIncongruent = median(rtsOf(false))

    // اثر توالی تجانس: ناسازگارِ درستِ پس از سازگار منهای پس از ناسازگار
    const afterCongruent: number[] = []
    const afterIncongruent: number[] = []
    for (let i = 1; i < state.results.length; i += 1) {
      const prev = state.results[i - 1] as RecordedTrial
      const cur = state.results[i] as RecordedTrial
      if (!cur.correct || cur.reactionTimeMs === null || !stimulusOf(cur).congruent) continue
      const bucket = stimulusOf(prev).congruent ? afterCongruent : afterIncongruent
      bucket.push(cur.reactionTimeMs)
    }
    const seqAfterCongruent = median(afterCongruent)
    const seqAfterIncongruent = median(afterIncongruent)

    const congruentResults = state.results.filter((r) => stimulusOf(r).congruent)
    const incongruentResults = state.results.filter((r) => !stimulusOf(r).congruent)
    // متریک‌های زمانی فقط با دادهٔ واقعی منتشر می‌شوند — باکت خالی یعنی کلید
    // حذف می‌شود (کارتش در صفحهٔ نتایج رندر نمی‌شود)، نه میانهٔ ۰ جعلی
    const metrics: Record<string, number> = {
      congruentTrials: congruentResults.length,
      incongruentTrials: incongruentResults.length,
      accuracyCongruent: accuracyPercent(
        congruentResults.filter((r) => r.correct).length,
        congruentResults.length,
      ),
      accuracyIncongruent: accuracyPercent(
        incongruentResults.filter((r) => r.correct).length,
        incongruentResults.length,
      ),
      omissionErrors: countOutcome(state.results, 'omission'),
    }
    if (rtCongruent !== null) metrics['rtCongruentMs'] = Math.round(rtCongruent)
    if (rtIncongruent !== null) metrics['rtIncongruentMs'] = Math.round(rtIncongruent)
    if (rtCongruent !== null && rtIncongruent !== null) {
      metrics['simonEffectMs'] = Math.round(rtIncongruent - rtCongruent)
    }
    if (seqAfterCongruent !== null && seqAfterIncongruent !== null) {
      metrics['congruencySequenceEffectMs'] = Math.round(seqAfterCongruent - seqAfterIncongruent)
    }
    return {
      exerciseId: SIMON_ID,
      sessionId: state.sessionId,
      exerciseVersion: SIMON_VERSION,
      contentVersion: SIMON_CONTENT_VERSION,
      domain: 'attention-control',
      difficulty: state.config.difficulty,
      ...totals,
      metrics,
    }
  },
}
