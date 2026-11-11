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
 * Block Height — استدلال دیداری-فضایی و بازنمایی ذهنی فضایی
 *
 * شکل SVG از ستون‌های بلوکی در «دو ردیف عمقی»: ردیف جلویی (تیره و پهن)
 * جلوی ردیف پشتی (روشن و باریک‌تر) را می‌گیرد. کاربر باید «کل» بلوک‌ها
 * (پیدا + پنهان) را بشمارد و با صفحه‌کلید عددی وارد کند. مهلت زمانی
 * برای مرحله نیست (شمارش نیازمند آرامش است)؛ RT جداگانه ثبت می‌شود.
 *
 * ─── قاعدهٔ استنتاج (تضمین تک‌جوابی) ────────────────────────────────────
 * هر «لَن» (ستون) دقیقاً دو پشته دارد که هر دو از همان زمین شروع می‌شوند:
 *  • پشتهٔ جلویی با ارتفاع f ≥ 1 — هیچ‌چیز جلویش نیست و کاملاً پیدا است.
 *  • پشتهٔ پشتی با ارتفاع b — فقط بخشی که بالاتر از پشتهٔ جلویی است
 *    دیده می‌شود (بیرون‌زدگی p = b − f بلوک).
 * مولد تضمین می‌کند b ≥ f + 1 (هیچ ستون پشتی کاملاً پنهان نیست)، پس:
 *  • بلوک‌های پنهانِ هر لَن دقیقاً f بلوک است (پشت پشتهٔ جلویی که روی
 *    همان زمین ایستاده)؛
 *  • ارتفاع پشتهٔ پشتی از رابطهٔ قطعی b = p + f به‌دست می‌آید؛
 *  • کل = Σ (f_i + b_i) = Σ (2·f_i + p_i).
 * تابع solveTotal همین قاعده را اجرا می‌کند و تست، برابری پاسخ آن با
 * ground-truth را برای «همهٔ» مراحل تولیدشدهٔ همهٔ سطح‌ها/assert می‌کند —
 * یعنی هر شکل با این قاعده دقیقاً یک پاسخ دارد (پازل مبهم تحویل نمی‌شود).
 *
 * اقتباس نرم‌افزاری از الگوی شمارش بلوک/حجم ذهنی در تست‌های فضایی؛
 * ترسیم کاملاً هندسی و انتزاعی، بدون دارایی بصری هیچ محصول تجاری.
 */

/** یک لَن از شکل: دو پشتهٔ هم‌محور روی یک زمین */
export interface BlockColumn {
  /** ارتفاع پشتهٔ جلویی — کاملاً پیدا (۱..maxFront) */
  readonly frontHeight: number
  /** ارتفاع پشتهٔ پشتی — ground truth (frontHeight+1 .. maxBack) */
  readonly backHeight: number
}

export interface BlockHeightConfig extends ExerciseConfig {
  /** تعداد مراحل جلسه */
  readonly totalTrials: number
  /** تعداد لَن‌ها (ستون‌ها) */
  readonly columns: number
  /** بازهٔ هدف مجموع کل بلوک‌ها */
  readonly minTotal: number
  readonly maxTotal: number
  /** سقف ارتفاع پشتهٔ جلویی (سطح پنهان‌کاری) */
  readonly maxFront: number
  /** سقف ارتفاع پشتهٔ پشتی */
  readonly maxBack: number
}

export interface BlockHeightState extends ExerciseState<BlockHeightConfig> {
  readonly currentTrial: BlockHeightTrial | null
}

export interface BlockHeightTrial extends ExerciseTrial {
  readonly columns: readonly BlockColumn[]
  /** ground truth: Σ (front + back) */
  readonly totalBlocks: number
  /** بلوک‌های پنهان: Σ front (پشتهٔ پشتیِ پوشیده‌شده پشت جلویی) */
  readonly hiddenBlocks: number
}

export type BlockHeightAnswer = number

/** آنچه بازیکن از هر لَن «می‌بیند»: ارتفاع جلویی + بیرون‌زدگی پشتی */
export interface VisibleColumn {
  readonly frontHeight: number
  readonly protrusion: number
}

export const BLOCK_HEIGHT_ID = 'block-height'
export const BLOCK_HEIGHT_VERSION = '1.0.0'
export const BLOCK_HEIGHT_CONTENT_VERSION = '1'
const TOTAL_TRIALS = 12

/**
 * سطح‌های دشواری — اعداد طراحی‌اند، نه هنجار جمعیتی.
 * رشد دشواری: لَن بیشتر (۳→۶)، مجموع بزرگ‌تر (۹→۳۰) و پنهان‌کاری بیشتر
 * (نسبت maxFront به maxBack بالا می‌رود ⇒ سهم بلوک پنهان بیشتر می‌شود).
 * در هر سطح: کمینهٔ ممکن هر لَن ۳ بلوک است (f=1، b=2) پس کمینهٔ کل
 * 3×columns ≤ minTotal و بیشینهٔ هر لَن (maxFront+maxBack) ⇒ بازهٔ هدف
 * همیشه قابل‌رسایش است (بازسازیِ تعمیمیافته در repairIntoRange ختم می‌شود).
 */
const LEVELS: readonly {
  columns: number
  minTotal: number
  maxTotal: number
  maxFront: number
  maxBack: number
}[] = [
  { columns: 3, minTotal: 9, maxTotal: 13, maxFront: 2, maxBack: 4 },
  { columns: 4, minTotal: 14, maxTotal: 19, maxFront: 3, maxBack: 5 },
  { columns: 4, minTotal: 16, maxTotal: 22, maxFront: 3, maxBack: 6 },
  { columns: 5, minTotal: 20, maxTotal: 26, maxFront: 4, maxBack: 7 },
  { columns: 6, minTotal: 25, maxTotal: 30, maxFront: 5, maxBack: 8 },
]

export function configForDifficulty(difficulty: number): BlockHeightConfig {
  if (difficulty < 1 || difficulty > 5) {
    throw new RangeError('دشواری باید بین ۱ تا ۵ باشد')
  }
  const level = LEVELS[difficulty - 1] as {
    columns: number
    minTotal: number
    maxTotal: number
    maxFront: number
    maxBack: number
  }
  return {
    difficulty,
    totalTrials: TOTAL_TRIALS,
    columns: level.columns,
    minTotal: level.minTotal,
    maxTotal: level.maxTotal,
    maxFront: level.maxFront,
    maxBack: level.maxBack,
  }
}

/** استخراج «دیده‌شده» از مرحله — ورودی solveTotal (همان چیزی که چشم می‌بیند) */
export function visibleFromTrial(trial: BlockHeightTrial): VisibleColumn[] {
  return trial.columns.map((c) => ({
    frontHeight: c.frontHeight,
    protrusion: c.backHeight - c.frontHeight,
  }))
}

/**
 * حل‌کنندهٔ قاعدهٔ مستند: از اطلاعات دیداری (f و p) کل بلوک‌ها را می‌سازد.
 * تابعی خالص است ⇒ برای هر شکل دقیقاً یک پاسخ تولید می‌کند.
 */
export function solveTotal(visible: readonly VisibleColumn[]): number {
  // هر لَن: جلویی f + پشتی (p + f)
  return visible.reduce((sum, v) => sum + 2 * v.frontHeight + v.protrusion, 0)
}

/** پیش‌نویس قابل‌تغییر برای تولید/بازسازی (فقط داخلی) */
interface DraftColumn {
  front: number
  back: number
}

function draftTotal(lanes: readonly DraftColumn[]): number {
  return lanes.reduce((sum, c) => sum + c.front + c.back, 0)
}

/** قرعهٔ یک لَن: f ∈ [1..maxFront] و b ∈ [f+1..maxBack] (قاعدهٔ b ≥ f+1) */
function drawLanes(rng: SeededRandom, config: BlockHeightConfig): DraftColumn[] {
  return Array.from({ length: config.columns }, () => {
    const front = rng.int(1, config.maxFront)
    const back = rng.int(front + 1, config.maxBack)
    return { front, back }
  })
}

/**
 * بازسازی قطعی به بازهٔ هدف — فقط وقتی صدا زده شود که قرعه‌ها (به‌احتمال
 * نزدیک به یک، بی‌نتیجه مانده باشند) خارج از بازه باشند. پله‌ای و با
 * حفظ قاعدهٔ b ≥ f+1 و سقف‌ها؛ چون کمینهٔ کل (3×columns) ≤ minTotal و
 * بیشینهٔ کل (columns×(maxFront+maxBack)) ≥ maxTotal است، همیشه ختم می‌شود.
 */
function repairIntoRange(lanes: readonly DraftColumn[], config: BlockHeightConfig): DraftColumn[] {
  const cols = lanes.map((c) => ({ front: c.front, back: c.back }))
  let total = draftTotal(cols)
  while (total < config.minTotal) {
    const idx = cols.findIndex((c) => c.back < config.maxBack)
    if (idx !== -1) {
      cols[idx] = { ...cols[idx]!, back: cols[idx]!.back + 1 }
      total += 1
      continue
    }
    const fi = cols.findIndex((c) => c.front < config.maxFront && c.front + 2 <= c.back)
    if (fi === -1) break
    cols[fi] = { ...cols[fi]!, front: cols[fi]!.front + 1 }
    total += 1
  }
  while (total > config.maxTotal) {
    const fi = cols.findIndex((c) => c.front > 1)
    if (fi !== -1) {
      cols[fi] = { ...cols[fi]!, front: cols[fi]!.front - 1 }
      total -= 1
      continue
    }
    const bi = cols.findIndex((c) => c.back - 1 >= c.front + 1)
    if (bi === -1) break
    cols[bi] = { ...cols[bi]!, back: cols[bi]!.back - 1 }
    total -= 1
  }
  return cols
}

/** قرعهٔ کامل یک شکل: تازه‌کشی تا ورود به بازهٔ هدف؛ در بدترین حالت بازسازی */
function drawFigure(rng: SeededRandom, config: BlockHeightConfig): DraftColumn[] {
  let lanes = drawLanes(rng, config)
  for (let attempt = 0; attempt < 400; attempt += 1) {
    const total = draftTotal(lanes)
    if (total >= config.minTotal && total <= config.maxTotal) return lanes
    lanes = drawLanes(rng, config)
  }
  return repairIntoRange(lanes, config)
}

function sameFigure(a: readonly DraftColumn[], b: readonly DraftColumn[]): boolean {
  return (
    a.length === b.length &&
    a.every((c, i) => c.front === b[i]!.front && c.back === b[i]!.back)
  )
}

/** seed جایگزین برای تازه‌کشی وقتی شکل عین مرحلهٔ قبل درآمد */
function altSeed(sessionSeed: number, alt: number, trialIndex: number): number {
  return deriveTrialSeed(sessionSeed ^ Math.imul(alt, 0x9e3779b1), trialIndex)
}

/**
 * شکل نهایی مرحلهٔ index — با «بازپخش قطعی از صفر» تا زنجیرهٔ تفاوت با
 * مرحلهٔ قبل حفظ شود. خالص و فقط تابع (config, seed, index)؛ برای جلسهٔ
 * ۱۲ مرحله‌ای حداکثر ~۷۸ قرعه می‌کشد (ناچیز). تضمین تکلیفی: هیچ دو شکل
 * پشت‌سرهمی عین هم نیستند تا جلسه یکنواخت نشود (الگوی Calculation × 100).
 */
function figureAt(config: BlockHeightConfig, sessionSeed: number, index: number): DraftColumn[] {
  let prev: readonly DraftColumn[] | null = null
  let lanes: readonly DraftColumn[] = []
  for (let i = 0; i <= index; i += 1) {
    lanes = drawFigure(new SeededRandom(deriveTrialSeed(sessionSeed, i)), config)
    let alt = 0
    while (prev !== null && sameFigure(lanes, prev) && alt < 64) {
      alt += 1
      lanes = drawFigure(new SeededRandom(altSeed(sessionSeed, alt, i)), config)
    }
    prev = lanes
  }
  return lanes.map((c) => ({ front: c.front, back: c.back }))
}

export const blockHeightDefinition: ExerciseDefinition<
  BlockHeightConfig,
  BlockHeightState,
  BlockHeightTrial,
  BlockHeightAnswer
> = {
  id: BLOCK_HEIGHT_ID,
  version: BLOCK_HEIGHT_VERSION,
  contentVersion: BLOCK_HEIGHT_CONTENT_VERSION,
  domain: 'visual-spatial',

  createSession(sessionId, config, seed) {
    return { sessionId, config, seed, nextTrialIndex: 0, currentTrial: null, results: [] }
  },

  nextTrial(state) {
    if (state.nextTrialIndex >= state.config.totalTrials) {
      throw new Error('همه مراحل تولید شده‌اند')
    }
    const trialIndex = state.nextTrialIndex
    const config = state.config
    const lanes = figureAt(config, state.seed, trialIndex)
    const columns: BlockColumn[] = lanes.map((c) => ({
      frontHeight: c.front,
      backHeight: c.back,
    }))
    const totalBlocks = draftTotal(lanes)
    const hiddenBlocks = lanes.reduce((sum, c) => sum + c.front, 0)
    const trial: BlockHeightTrial = {
      trialIndex,
      columns,
      totalBlocks,
      hiddenBlocks,
      responseWindowMs: null,
    }
    return { state: { ...state, nextTrialIndex: trialIndex + 1, currentTrial: trial }, trial }
  },

  submitAnswer(state, answer, reactionTimeMs) {
    const trial = state.currentTrial
    if (!trial) throw new Error('مرحله فعلی برای ثبت پاسخ وجود ندارد')
    const correct = answer !== null && answer === trial.totalBlocks
    const outcome: TrialOutcome = answer === null ? 'omission' : correct ? 'correct' : 'incorrect'
    const record: RecordedTrial = {
      trialIndex: trial.trialIndex,
      stimulus: { columns: trial.columns },
      expected: trial.totalBlocks,
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
    // خطای مطلق فقط روی مراحل پاسخ‌داده‌شده (omission خطای عددی ندارد)
    const absErrors = state.results
      .filter((r) => typeof r.given === 'number')
      .map((r) => Math.abs((r.given as number) - (r.expected as number)))
    const meanAbsoluteError =
      absErrors.length === 0 ? 0 : absErrors.reduce((a, b) => a + b, 0) / absErrors.length
    return {
      exerciseId: BLOCK_HEIGHT_ID,
      sessionId: state.sessionId,
      exerciseVersion: BLOCK_HEIGHT_VERSION,
      contentVersion: BLOCK_HEIGHT_CONTENT_VERSION,
      domain: 'visual-spatial',
      difficulty: state.config.difficulty,
      ...totals,
      metrics: {
        /** درصد پاسخ‌های دقیقاً درست (۰..۱۰۰، یک رقم اعشار) */
        exactAnswerRate: totals.accuracy,
        /** میانگین فاصلهٔ مطلق پاسخ از کل واقعی — بر حسب بلوک */
        meanAbsoluteError: Math.round(meanAbsoluteError * 100) / 100,
      },
    }
  },
}
