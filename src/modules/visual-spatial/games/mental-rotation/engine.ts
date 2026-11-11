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
 * Mental Rotation — چرخش ذهنی (حوزه دیداری-فضایی)
 *
 * الگوی کلاسیک چرخش ذهنی: در هر مرحله یک شکل بلوکی نامتقارن (پلی‌ومینو)
 * به‌عنوان «مرجع» نمایش داده می‌شود و کنار آن یک «گزینه»: همان شکلِ
 * چرخیده (کزارش ۹۰°/۱۸۰°/۲۷۰° حول محور عمود بر صفحه) یا تصویر
 * آینه‌ای همان شکل (که خودش هم چرخیده). بازیکن باید داوری کند: «یکسان
 * (چرخیده)» یا «آینه‌ای».
 *
 * شکل‌ها هنگام تولید «نامتقارن کامل»اند: هیچ چرخش یا بازتابی شکل را
 * به خودش نمی‌رساند (هر ۸ تبدیلِ گروه دی‌هدری D4 متمایزند) — وگرنه
 * پاسخ درست اصلاً تعریف‌ نمی‌شد. چرخش‌ها مضرب ۹۰° و حفظ‌کننده شبکه‌اند.
 *
 * اقتباس نرم‌افزاری از پارادایم پژوهشی چرخش ذهنی (شیپارد و متزلر)
 * با محتوای هندسی انتزاعیِ تولیدشده از seed؛ بدون استفاده از نام یا
 * دارایی بصری هیچ محصول تجاری.
 */

/** مختصات یک خانه واحد روی شبکه؛ x = ستون، y = ردیف */
export type PolyominoCell = readonly [number, number]

/**
 * یک شکل بلوکی به فرم استاندارد: همه خانه‌ها به‌هم‌پیوسته، کمینهٔ مختصات
 * (۰,۰) و مرتب (x سپس y) — serialize-friendly و قابل رندر مستقیم با SVG.
 */
export type Polyomino = readonly PolyominoCell[]

/** داوری بازیکن؛ پاسخ درست یکی از همین دو است */
export type MentalRotationVerdict = 'same' | 'mirrored'

/** زاویه چرخش مضرب ۹۰ درجه — حفظ‌کننده شبکه */
export type RotationAngle = 0 | 90 | 180 | 270

export interface MentalRotationConfig extends ExerciseConfig {
  /** تعداد خانه‌های شکل (پیچیدگی) */
  readonly blocks: number
  /** زاویه‌های چرخش مجاز این دشواری */
  readonly allowedAngles: readonly RotationAngle[]
  /** مهلت پاسخ؛ null = بی‌مهلت (سطح ۱ و ۲) */
  readonly responseWindowMs: number | null
  /** تعداد کل مراحل جلسه */
  readonly totalTrials: number
}

export interface MentalRotationTrial extends ExerciseTrial {
  readonly trialIndex: number
  /** شکل مرجع (فرم استاندارد) */
  readonly reference: Polyomino
  /** شکل گزینه — چرخیده (و در آینه‌ای‌ها بازتابیده) همان مرجع */
  readonly candidate: Polyomino
  /** ground truth: آیا گزینه تصویر آینه‌ای است؟ */
  readonly isMirror: boolean
  /** زاویه چرخش اعمال‌شده بر گزینه */
  readonly rotationDegrees: RotationAngle
  readonly blocks: number
}

export interface MentalRotationState extends ExerciseState<MentalRotationConfig> {
  readonly currentTrial: MentalRotationTrial | null
}

/** پاسخ کاربر: داوری؛ null یعنی بی‌پاسخی (انقضای مهلت) */
export type MentalRotationAnswer = MentalRotationVerdict | null

export const MENTAL_ROTATION_ID = 'mental-rotation'
export const MENTAL_ROTATION_VERSION = '1.0.0'
export const MENTAL_ROTATION_CONTENT_VERSION = '1'
const TOTAL_TRIALS = 16
/** سقف تلاش برای تولید شکل نامتقارن — عملاً هرگز پر نمی‌شود */
const MAX_GENERATION_ATTEMPTS = 60
const NEIGHBOR_OFFSETS: readonly (readonly [number, number])[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]

/** سطح‌های دشواری — اعداد طراحی‌اند، نه هنجار جمعیتی */
const LEVELS: readonly {
  blocks: number
  angles: readonly RotationAngle[]
  responseWindowMs: number | null
}[] = [
  // سطح ۱ و ۲: بی‌مهلت؛ چرخش کم و شکل ساده
  { blocks: 5, angles: [0, 90], responseWindowMs: null },
  { blocks: 6, angles: [0, 90, 180], responseWindowMs: null },
  // سطح ۳ به بالا: پنجره پاسخ سخت‌گیرانه‌تر و شکل پیچیده‌تر
  { blocks: 7, angles: [0, 90, 180, 270], responseWindowMs: 8000 },
  { blocks: 8, angles: [0, 90, 180, 270], responseWindowMs: 6500 },
  { blocks: 10, angles: [0, 90, 180, 270], responseWindowMs: 5000 },
]

export function configForDifficulty(difficulty: number): MentalRotationConfig {
  if (difficulty < 1 || difficulty > 5) {
    throw new RangeError('دشواری باید بین ۱ تا ۵ باشد')
  }
  const level = LEVELS[difficulty - 1] as {
    blocks: number
    angles: readonly RotationAngle[]
    responseWindowMs: number | null
  }
  return {
    difficulty,
    blocks: level.blocks,
    allowedAngles: level.angles,
    responseWindowMs: level.responseWindowMs,
    totalTrials: TOTAL_TRIALS,
  }
}

// ---------- تبدیل‌های هندسی (خالص، روی فرم استاندارد) ----------

/** جابه‌جایی به مبدا و مرتب‌سازی — فرم استاندارد برای مقایسهٔ دو شکل */
export function canonicalizePolyomino(cells: readonly PolyominoCell[]): Polyomino {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  for (const [x, y] of cells) {
    if (x < minX) minX = x
    if (y < minY) minY = y
  }
  const shifted = cells.map(([x, y]) => [x - minX, y - minY] as PolyominoCell)
  shifted.sort((a, b) => a[0] - b[0] || a[1] - b[1])
  return shifted
}

/** یک چرخش ربع‌دور حول محور عمود بر صفحه: (x, y) → (y, −x) */
export function rotateQuarterTurn(cells: Polyomino): Polyomino {
  return canonicalizePolyomino(cells.map(([x, y]) => [y, -x] as PolyominoCell))
}

/** چرخش به‌اندازهٔ steps ربع‌دور (steps ⊙ ۴) */
export function applyRotation(cells: Polyomino, steps: number): Polyomino {
  let current = cells
  for (let i = 0; i < ((steps % 4) + 4) % 4; i++) {
    current = rotateQuarterTurn(current)
  }
  return current
}

/** بازتاب دربارهٔ محور عمودی: (x, y) → (−x, y) */
export function mirrorPolyomino(cells: Polyomino): Polyomino {
  return canonicalizePolyomino(cells.map(([x, y]) => [-x, y] as PolyominoCell))
}

function polyominoKey(cells: Polyomino): string {
  return cells.map(([x, y]) => `${x},${y}`).join(';')
}

/**
 * نامتقارن کامل: هر ۸ تبدیل گروه D4 (۴ چرخش × عادی/آینه‌ای) فرم قاعadi
 * متمایزی بسازند. این شرط هم‌زمان (۱) عدم تقارن چرخشی و (۲) کیرال‌بودن
 * (آینه ≠ هیچ چرخشی) را تضمین می‌کند — پس «یکسان» و «آینه‌ای» همیشه
 * قابل‌تمایزند.
 */
export function isFullyAsymmetric(cells: Polyomino): boolean {
  const mirrored = mirrorPolyomino(cells)
  const transforms: Polyomino[] = []
  let rotated = cells
  for (let i = 0; i < 4; i++) {
    transforms.push(rotated)
    rotated = rotateQuarterTurn(rotated)
  }
  let mirroredRotated = mirrored
  for (let i = 0; i < 4; i++) {
    transforms.push(mirroredRotated)
    mirroredRotated = rotateQuarterTurn(mirroredRotated)
  }
  const keys = new Set(transforms.map(polyominoKey))
  return keys.size === transforms.length
}

// ---------- تولید شکل از seed ----------

/** رشد تصادفی پلی‌ومینوی به‌هم‌پیوسته از یک خانه اولیه */
function growPolyomino(rng: SeededRandom, blocks: number): Polyomino {
  const cells = new Map<string, PolyominoCell>([['0,0', [0, 0]]])
  while (cells.size < blocks) {
    // مرز: همسایه‌های آزادِ خانه‌های موجود (بدون تکرار)
    const frontier = new Map<string, PolyominoCell>()
    for (const [x, y] of cells.values()) {
      for (const [dx, dy] of NEIGHBOR_OFFSETS) {
        const nx = x + dx
        const ny = y + dy
        const key = `${nx},${ny}`
        if (!cells.has(key)) frontier.set(key, [nx, ny])
      }
    }
    const options = [...frontier.values()]
    const chosen = rng.pick(options)
    cells.set(`${chosen[0]},${chosen[1]}`, chosen)
  }
  return canonicalizePolyomino([...cells.values()])
}

/**
 * تولید پلی‌ومینوی «نامتقارن کامل» از rng جاری — با تلاش مجدد قطعی
 * تا وقتی شرط تقارن برقرار شود (رشد تصادفی تقریباً همیشه نامتقارن است).
 */
export function generateAsymmetricPolyomino(rng: SeededRandom, blocks: number): Polyomino {
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const shape = growPolyomino(rng, blocks)
    if (isFullyAsymmetric(shape)) return shape
  }
  throw new Error(`تولید شکل نامتقارن با ${blocks} خانه از ${MAX_GENERATION_ATTEMPTS} تلاش نشد`)
}

// ---------- تعریف تمرین ----------

export const mentalRotationDefinition: ExerciseDefinition<
  MentalRotationConfig,
  MentalRotationState,
  MentalRotationTrial,
  MentalRotationAnswer
> = {
  id: MENTAL_ROTATION_ID,
  version: MENTAL_ROTATION_VERSION,
  contentVersion: MENTAL_ROTATION_CONTENT_VERSION,
  domain: 'visual-spatial',

  createSession(sessionId, config, seed) {
    return { sessionId, config, seed, nextTrialIndex: 0, currentTrial: null, results: [] }
  },

  nextTrial(state) {
    if (state.nextTrialIndex >= state.config.totalTrials) {
      throw new Error('همه مراحل تولید شده‌اند')
    }
    const trialIndex = state.nextTrialIndex
    const rng = new SeededRandom(deriveTrialSeed(state.seed, trialIndex))
    const reference = generateAsymmetricPolyomino(rng, state.config.blocks)
    const isMirror = rng.bool()
    const rotationDegrees = rng.pick(state.config.allowedAngles)
    // آینه‌ای‌ها هم چرخیده عرضه می‌شوند (چون تقارن آینه‌ای صرف با زاویهٔ
    // صفر ممکن است خیلی بدیهی باشد) — بازتاب اول، سپس چرخش
    const base = isMirror ? mirrorPolyomino(reference) : reference
    const candidate = applyRotation(base, rotationDegrees / 90)
    const trial: MentalRotationTrial = {
      trialIndex,
      reference,
      candidate,
      isMirror,
      rotationDegrees,
      blocks: state.config.blocks,
      responseWindowMs: state.config.responseWindowMs,
    }
    return { state: { ...state, nextTrialIndex: trialIndex + 1, currentTrial: trial }, trial }
  },

  submitAnswer(state, answer, reactionTimeMs) {
    const trial = state.currentTrial
    if (!trial) throw new Error('مرحله فعالی برای ثبت پاسخ وجود ندارد')
    const expected: MentalRotationVerdict = trial.isMirror ? 'mirrored' : 'same'
    // stimulus خام شامل ground truth کامل است تا تحلیل بعدی ممکن بماند
    const stimulus = {
      reference: trial.reference,
      candidate: trial.candidate,
      isMirror: trial.isMirror,
      rotationDegrees: trial.rotationDegrees,
      blocks: trial.blocks,
    }
    const outcome: TrialOutcome =
      answer === null ? 'omission' : answer === expected ? 'correct' : 'incorrect'
    const record: RecordedTrial = {
      trialIndex: trial.trialIndex,
      stimulus,
      expected,
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
    // میانگین RT روی مراحل پاسخ‌داده‌شده (بی‌پاسخی RT ندارد)
    const reactionTimes = state.results
      .map((r) => r.reactionTimeMs)
      .filter((rt): rt is number => rt !== null)
    const meanReactionTimeMs =
      reactionTimes.length === 0
        ? 0
        : Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
    // دقت تفکیک‌شده بر باند زاویه چرخش (اثر کلاسیک چرخش ذهنی: زاویهٔ
    // بیشتر → سخت‌تر). باند خالی از متریک حذف می‌شود تا میانگین‌گیری کاذب نشود.
    const bandStats = { low: { correct: 0, total: 0 }, high: { correct: 0, total: 0 } }
    for (const record of state.results) {
      const angle = (record.stimulus as { rotationDegrees: RotationAngle }).rotationDegrees
      const band = angle <= 90 ? bandStats.low : bandStats.high
      band.total += 1
      if (record.correct) band.correct += 1
    }
    const metrics: Record<string, number> = { meanReactionTimeMs }
    if (bandStats.low.total > 0) {
      metrics['accuracyLowAngleBand'] =
        Math.round((bandStats.low.correct / bandStats.low.total) * 1000) / 10
    }
    if (bandStats.high.total > 0) {
      metrics['accuracyHighAngleBand'] =
        Math.round((bandStats.high.correct / bandStats.high.total) * 1000) / 10
    }
    return {
      exerciseId: MENTAL_ROTATION_ID,
      sessionId: state.sessionId,
      exerciseVersion: MENTAL_ROTATION_VERSION,
      contentVersion: MENTAL_ROTATION_CONTENT_VERSION,
      domain: 'visual-spatial',
      difficulty: state.config.difficulty,
      ...totals,
      metrics,
    }
  },
}
