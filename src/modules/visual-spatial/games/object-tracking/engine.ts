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
 * دنبال‌کردن اشیا (Object Tracking) — توجه دیداری-فضایی
 *
 * پارادایم ردیابی چند شیء (Multiple Object Tracking):
 *  ۱) هایلایت — N دایره روی بوم، K تای آن‌ها چند لحظه هدف معرفی می‌شوند؛
 *  ۲) حرکت — همه دایره‌ها با سرعت ثابت و بازتاب از دیواره‌ها حرکت می‌کنند؛
 *  ۳) پاسخ — اشیا ثابت و شماره‌گذاری می‌شوند و بازیکن K هدف را انتخاب می‌کند.
 *
 * قطعیت (حیاتی): مسیر حرکت به‌طور کامل از seed مرحله پیش‌محاسبه می‌شود و
 * به‌صورت دادهٔ خالص (آرایهٔ فریم‌ها) در اختیار UI قرار می‌گیرد. کامپوننت
 * فقط فریم‌ها را «نمایش» می‌دهد — seed یکسان ← انیمیشن یکسان. مختصات
 * نرمال‌شده در مربع واحد [0,1]×[0,1] است تا موتور از اندازهٔ بوم مستقل
 * بماند و تست‌ها بدون DOM معنا داشته باشند.
 *
 * مدل مسیر: حرکت خطی با سرعت برداری ثابت + بازتاب کشسان از دیواره‌های
 * [r, 1-r]. برخورد شیء-به-شیء عمداً مدل نمی‌شود (اشیا می‌توانند از کنار
 * هم یا روی هم گذر کنند) — همان سختیِ ذاتی پارادایم MOT.
 */

export interface ObjectTrackingConfig extends ExerciseConfig {
  /** تعداد کل دایره‌ها */
  readonly objectCount: number
  /** تعداد اهداف (دایره‌هایی که در هایلایت معرفی می‌شوند) */
  readonly targetCount: number
  /** سرعت پایه حرکت (واحد نرمال در ثانیه) */
  readonly speed: number
  /** مدت معرفی اهداف (ms) */
  readonly highlightMs: number
  /** مدت حرکت (ms) */
  readonly motionMs: number
  /** پنجرهٔ پاسخ پس از پایان حرکت (ms) */
  readonly answerWindowMs: number
  /** تعداد مراحل جلسه */
  readonly totalTrials: number
}

export interface ObjectTrackingState extends ExerciseState<ObjectTrackingConfig> {
  readonly currentTrial: ObjectTrackingTrial | null
}

/** موقعیت نرمال‌شده در مربع واحد */
export interface Vec2 {
  readonly x: number
  readonly y: number
}

/** پارامترهای سری‌پذیر مسیر — مبنای بازتولید انیمیشن و رکورد خام */
export interface TrajectorySpec {
  readonly startPositions: readonly Vec2[]
  /** سرعت هر شیء (واحد نرمال بر ثانیه) */
  readonly velocities: readonly Vec2[]
  /** شعاع نرمال‌شدهٔ دایره‌ها */
  readonly radius: number
}

export interface ObjectTrackingTrial extends ExerciseTrial {
  readonly objectCount: number
  readonly targetCount: number
  /** اندیس شیءهایی که هدف بودند (0-محور؛ شیء i روی بوم شمارهٔ i+1 دارد) */
  readonly targetIndices: readonly number[]
  readonly highlightMs: number
  readonly motionMs: number
  readonly trajectory: TrajectorySpec
  /**
   * فریم‌های پیش‌محاسبه‌شده: frames[f][i] = مرکز شیء i در فریم f؛
   * فریم f مربوط به لحظهٔ f×FRAME_MS از شروع حرکت است. صرفاً دادهٔ خوانده‌شنی
   * برای UI — کامپوننت هیچ فیزیکی اجرا نمی‌کند.
   */
  readonly frames: readonly (readonly Vec2[])[]
}

/** پاسخ بازیکن: اندیس شیءهای انتخابی (0-محور) */
export type ObjectTrackingAnswer = readonly number[]

export const OBJECT_TRACKING_ID = 'object-tracking'
export const OBJECT_TRACKING_VERSION = '1.0.0'
export const OBJECT_TRACKING_CONTENT_VERSION = '1'
const TOTAL_TRIALS = 8

/** گام زمانی شبیه‌سازی مسیر — ۲۵ فریم بر ثانیه برای این سرعت‌ها روان است */
export const FRAME_MS = 40
/** شعاع نرمال‌شدهٔ دایره‌ها (نسبت به ضلع بوم) */
const RADIUS = 0.045
/** حاشیهٔ اضافی از دیواره هنگام چیدن نقاط شروع */
const START_MARGIN = 1.25
/** کمترین فاصلهٔ مرکز-به-مرکز هنگام چیدن نقاط شروع */
const START_MIN_DISTANCE = 3
/** بیشترین تلاش نمونه‌گیری رد-پذیر قبل از شل‌کردن قید فاصله */
const START_MAX_ATTEMPTS = 240

/** سطح‌های دشواری — اعداد طراحی‌اند، نه هنجار جمعیتی */
const LEVELS: readonly {
  objectCount: number
  targetCount: number
  speed: number
  highlightMs: number
  motionMs: number
  answerWindowMs: number
}[] = [
  { objectCount: 4, targetCount: 2, speed: 0.1, highlightMs: 1800, motionMs: 4000, answerWindowMs: 9000 },
  { objectCount: 5, targetCount: 2, speed: 0.13, highlightMs: 1700, motionMs: 5000, answerWindowMs: 10000 },
  { objectCount: 6, targetCount: 3, speed: 0.16, highlightMs: 1600, motionMs: 6000, answerWindowMs: 11000 },
  { objectCount: 7, targetCount: 3, speed: 0.19, highlightMs: 1500, motionMs: 7000, answerWindowMs: 12000 },
  { objectCount: 8, targetCount: 4, speed: 0.22, highlightMs: 1400, motionMs: 8000, answerWindowMs: 13000 },
]

export function configForDifficulty(difficulty: number): ObjectTrackingConfig {
  if (difficulty < 1 || difficulty > 5) {
    throw new RangeError('دشواری باید بین ۱ تا ۵ باشد')
  }
  const level = LEVELS[difficulty - 1] as (typeof LEVELS)[number]
  return {
    difficulty,
    objectCount: level.objectCount,
    targetCount: level.targetCount,
    speed: level.speed,
    highlightMs: level.highlightMs,
    motionMs: level.motionMs,
    answerWindowMs: level.answerWindowMs,
    totalTrials: TOTAL_TRIALS,
  }
}

/**
 * امتیاز هم‌پوشانی: نسبت اهداف درست به تعداد اهداف (۰..۱).
 * پاسخ خالی یا با اندیس تکراری بیش از حد هدف، هم‌پوشانی ناقص می‌سازد.
 */
export function targetOverlapRate(targetIndices: readonly number[], given: readonly number[]): number {
  if (targetIndices.length === 0) return 0
  const targets = new Set(targetIndices)
  const hits = new Set(given.filter((i) => targets.has(i))).size
  return hits / targetIndices.length
}

/** چیدن نقاط شروع بدون هم‌پوشانی — نمونه‌گیری رد-پذیر قطعی از rng */
function sampleStartPositions(rng: SeededRandom, count: number, radius: number): Vec2[] {
  const lo = radius * START_MARGIN
  const hi = 1 - radius * START_MARGIN
  const positions: Vec2[] = []
  let minDistance = radius * START_MIN_DISTANCE
  for (let placed = 0; placed < count; placed++) {
    let candidate: Vec2 | null = null
    for (let attempt = 0; attempt < START_MAX_ATTEMPTS; attempt++) {
      // هر ۶۰ تلاش ناموفق، قید فاصله کمی شل می‌شود تا الگوریتم همیشه خروجی دهد
      if (attempt > 0 && attempt % 60 === 0) minDistance *= 0.8
      const p = { x: lo + rng.next() * (hi - lo), y: lo + rng.next() * (hi - lo) }
      const tooClose = positions.some(
        (q) => Math.hypot(p.x - q.x, p.y - q.y) < minDistance,
      )
      if (!tooClose) {
        candidate = p
        break
      }
    }
    // احتمال عملی صفر (چیدمان با شعاع کمتر از نصف کف مربع)؛ فقط برای نوع‌ها
    positions.push(candidate ?? { x: lo, y: lo })
  }
  return positions
}

/**
 * شبیه‌سازی خالص مسیر: حرکت خطی + بازتاب کشسان از دیواره‌ها.
 * فریم f ↔ لحظهٔ f×FRAME_MS. جابه‌جایی هر فریم (~۰٫۰۱) بسیار کوچک‌تر از
 * شعاع است، پس پسِ بازتاب همیشه داخل کادر می‌ماند؛ برای اطمینان، به
 * بازهٔ [r, 1-r] کلمپ می‌شود (قطعی و بدون وابستگی به مرز).
 */
export function buildFrames(spec: TrajectorySpec, motionMs: number): Vec2[][] {
  const frameCount = Math.max(1, Math.ceil(motionMs / FRAME_MS))
  const dt = FRAME_MS / 1000
  const r = spec.radius
  const xs = spec.startPositions.map((p) => p.x)
  const ys = spec.startPositions.map((p) => p.y)
  const vx = spec.velocities.map((v) => v.x)
  const vy = spec.velocities.map((v) => v.y)
  const lo = r
  const hi = 1 - r
  const frames: Vec2[][] = []
  for (let f = 0; f < frameCount; f++) {
    frames.push(Array.from({ length: xs.length }, (_, i) => ({ x: xs[i] as number, y: ys[i] as number })))
    if (f === frameCount - 1) break
    for (let i = 0; i < xs.length; i++) {
      let x = (xs[i] as number) + (vx[i] as number) * dt
      let y = (ys[i] as number) + (vy[i] as number) * dt
      if (x < lo) {
        x = 2 * lo - x
        vx[i] = -(vx[i] as number)
      } else if (x > hi) {
        x = 2 * hi - x
        vx[i] = -(vx[i] as number)
      }
      if (y < lo) {
        y = 2 * lo - y
        vy[i] = -(vy[i] as number)
      } else if (y > hi) {
        y = 2 * hi - y
        vy[i] = -(vy[i] as number)
      }
      xs[i] = Math.min(hi, Math.max(lo, x))
      ys[i] = Math.min(hi, Math.max(lo, y))
    }
  }
  return frames
}

/** ساخت کامل مشخصات یک مرحله از rng مرحله — خالص و قطعی */
function buildTrial(trialIndex: number, config: ObjectTrackingConfig, rng: SeededRandom): ObjectTrackingTrial {
  const targetIndices = rng.sample(
    Array.from({ length: config.objectCount }, (_, i) => i),
    config.targetCount,
  )
  const startPositions = sampleStartPositions(rng, config.objectCount, RADIUS)
  const velocities = startPositions.map(() => {
    const angle = rng.next() * Math.PI * 2
    const speed = config.speed * (0.85 + 0.3 * rng.next())
    return { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed }
  })
  const trajectory: TrajectorySpec = { startPositions, velocities, radius: RADIUS }
  return {
    trialIndex,
    objectCount: config.objectCount,
    targetCount: config.targetCount,
    targetIndices: [...targetIndices].sort((a, b) => a - b),
    highlightMs: config.highlightMs,
    motionMs: config.motionMs,
    trajectory,
    frames: buildFrames(trajectory, config.motionMs),
    // مهلت کل مرحله = معرفی + حرکت + پنجرهٔ پاسخ؛ از آن برای انقضای
    // بی‌پاسخی و برای بازسازی فاز پس از pause استفاده می‌شود
    responseWindowMs: config.highlightMs + config.motionMs + config.answerWindowMs,
  }
}

export const objectTrackingDefinition: ExerciseDefinition<
  ObjectTrackingConfig,
  ObjectTrackingState,
  ObjectTrackingTrial,
  ObjectTrackingAnswer
> = {
  id: OBJECT_TRACKING_ID,
  version: OBJECT_TRACKING_VERSION,
  contentVersion: OBJECT_TRACKING_CONTENT_VERSION,
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
    const trial = buildTrial(trialIndex, state.config, rng)
    return { state: { ...state, nextTrialIndex: trialIndex + 1, currentTrial: trial }, trial }
  },

  submitAnswer(state, answer, reactionTimeMs) {
    const trial = state.currentTrial
    if (!trial) throw new Error('مرحله فعلی برای ثبت پاسخ وجود ندارد')
    const given = answer
    // تطابق کامل = همان تعداد، بدون تکرار، و همه در مجموعهٔ اهداف
    const isFullMatch =
      given !== null &&
      given.length === trial.targetIndices.length &&
      new Set(given).size === given.length &&
      targetOverlapRate(trial.targetIndices, given) === 1
    const outcome: TrialOutcome = given === null ? 'omission' : isFullMatch ? 'correct' : 'incorrect'
    const record: RecordedTrial = {
      trialIndex: trial.trialIndex,
      stimulus: {
        objectCount: trial.objectCount,
        targetCount: trial.targetCount,
        targetIndices: trial.targetIndices,
        motionMs: trial.motionMs,
      },
      expected: trial.targetIndices,
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
    const overlaps = state.results.map((r) =>
      Array.isArray(r.expected) && Array.isArray(r.given)
        ? targetOverlapRate(r.expected as number[], r.given as number[])
        : 0,
    )
    const meanOverlap = overlaps.length === 0 ? 0 : overlaps.reduce((a, b) => a + b, 0) / overlaps.length
    return {
      exerciseId: OBJECT_TRACKING_ID,
      sessionId: state.sessionId,
      exerciseVersion: OBJECT_TRACKING_VERSION,
      contentVersion: OBJECT_TRACKING_CONTENT_VERSION,
      domain: 'visual-spatial',
      difficulty: state.config.difficulty,
      ...totals,
      metrics: {
        /** میانگین درصد اهداف درست‌انتخاب‌شده (۰..۱۰۰) — حساس‌تر از دقت ۰/۱ */
        targetOverlapRate: Math.round(meanOverlap * 1000) / 10,
        objectCount: state.config.objectCount,
        targetCount: state.config.targetCount,
      },
    }
  },
}
