import type { RecordedTrial, ExerciseState, ExerciseSummary, ExerciseTrial } from '../types'
import { toTrialEventRecord } from '../types'
import { createRandomSeed } from '../randomization/seeded-random'
import type { ExerciseSettingsRepository, SessionRepository, TrialEventRepository } from '../../data/repositories/types'
import type { AnyExerciseDefinition } from '../registry/game-registry'
import { SessionTimer } from '../timer/session-timer'
import type { Clock } from '../timer/session-timer'
import {
  canDispatch as smCanDispatch,
  dispatch as smDispatch,
  initialMachineState,
  type SessionMachineState,
} from './state-machine'

/**
 * Session Manager — هماهنگ‌کننده قرارداد بازی، ماشین حالت، تایمر و ذخیره‌سازی.
 *
 * تضمین‌های کلیدی:
 *  - جلوگیری از ثبت دوباره پاسخ یک مرحله (duplicate submission)
 *  - ثبت TrialEvent خام برای هر پاسخ (نه فقط امتیاز نهایی)
 *  - زمان پاسخ بر اساس تایمر فعال (بدون pause)
 *  - ماندگاری: رکورد جلسه در شروع/پایان، رویدادها در لحظه پاسخ
 *
 * این کلاس framework-agnostic است؛ React از طریق subscribe/getSnapshot
 * (useSyncExternalStore) به آن وصل می‌شود.
 */

export type SubmitRejectionReason =
  | 'wrong_phase'
  | 'no_active_trial'
  | 'already_answered'
  /** ذخیرهٔ رویداد خام در IndexedDB شکست خورد — تلاش مجدد ممکن است */
  | 'persist_failed'

export type SubmitResult =
  | { accepted: true; record: RecordedTrial; sessionCompleted: boolean }
  | { accepted: false; reason: SubmitRejectionReason }

export interface SessionManagerSnapshot {
  readonly machine: SessionMachineState
  readonly sessionId: string | null
  readonly exerciseId: string
  /** مرحله جاری برای رندر؛ null یعنی فعلاً محرکی نمایش داده نمی‌شود */
  readonly currentTrial: ExerciseTrial | null
  /** تعداد مراحل پاسخ‌داده‌شده */
  readonly answeredTrials: number
  /** آخرین نتیجه برای بازخورد فوری UI */
  readonly lastOutcome: RecordedTrial | null
  readonly summary: ExerciseSummary | null
}

export interface SessionManagerDeps {
  readonly definition: AnyExerciseDefinition
  /** config کامل بازی — با configForDifficulty همان بازی ساخته می‌شود */
  readonly config: import('../types').ExerciseConfig
  readonly sessions: SessionRepository
  readonly trialEvents: TrialEventRepository
  readonly settings?: ExerciseSettingsRepository
  readonly timer?: SessionTimer
  readonly clock?: Clock
  /** برای تست: seed قطعی؛ در حالت واقعی از createRandomSeed استفاده می‌شود */
  readonly seed?: number
  /** برای تست: زمان دیواری قابل تزریق */
  readonly wallClock?: () => number
}

export function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `session-${Date.now()}-${Math.floor(Math.random() * 1e9).toString(36)}`
}

export class ExerciseSessionManager {
  private readonly definition: AnyExerciseDefinition
  private readonly sessions: SessionRepository
  private readonly trialEvents: TrialEventRepository
  private readonly settings?: ExerciseSettingsRepository
  private readonly timer: SessionTimer
  private readonly wallClock: () => number

  private machine: SessionMachineState = initialMachineState()
  private sessionId: string | null = null
  private exerciseState: ExerciseState | null = null
  /** start در حال اجرا — قفل همگام ورود دوباره در پنجرهٔ await (StrictMode) */
  private startPromise: Promise<void> | null = null
  private currentTrial: ExerciseTrial | null = null
  private currentTrialAnswered = false
  /** زمان نمایش محرک جاری به ساعت تایمر (برای RT و مهلت پاسخ) */
  private trialShownAtMs = 0
  private lastOutcome: RecordedTrial | null = null
  private summary: ExerciseSummary | null = null
  private readonly listeners = new Set<() => void>()

  constructor(private readonly deps: SessionManagerDeps) {
    this.definition = deps.definition
    this.sessions = deps.sessions
    this.trialEvents = deps.trialEvents
    this.settings = deps.settings
    this.timer = deps.timer ?? new SessionTimer(deps.clock)
    this.wallClock = deps.wallClock ?? Date.now
  }

  // ---------- subscription (برای useSyncExternalStore) ----------

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = (): SessionManagerSnapshot => ({
    machine: this.machine,
    sessionId: this.sessionId,
    exerciseId: this.definition.id,
    currentTrial: this.currentTrial,
    answeredTrials: this.exerciseState?.results.length ?? 0,
    lastOutcome: this.lastOutcome,
    summary: this.summary,
  })

  private emit(): void {
    for (const listener of this.listeners) listener()
  }

  // ---------- lifecycle ----------

  /**
   * شروع جلسه: ساخت state با seed، ذخیرهٔ رکورد in_progress (تا جلسات
   * ناتمام قابل شناسایی باشند) و سپس انتقال به READY.
   *
   * ترتیب مهم است: اگر PREPARE پیش از persist زده شود و ذخیره شکست بخورد،
   * جلسه در READY می‌ماند و GameShell کارت خطا را فقط در IDLE نشان می‌دهد —
   * جلسهٔ «شفاف» بدون هیچ رکورد DB ساخته می‌شد. با این ترتیب، خطای
   * ذخیره‌سازی حالت را در IDLE نگه می‌دارد و مسیر تلاش مجدد باز می‌ماند.
   *
   * قفل in-flight: چون PREPARE دیگر همگام نیست، در پنجرهٔ await فاز هنوز
   * IDLE است — فراخوانی دوم (الگوی دوباراجرای افکت در StrictModeِ dev که
   * start را روی mount صدا می‌زند) باید همان‌جا رد شود وگرنه هر مونت دو
   * رکورد جلسه می‌سازد (رگرسیونی که e2eهای qa-refresh گرفتند).
   */
  async start(): Promise<void> {
    if (this.machine.phase !== 'IDLE' || this.startPromise !== null) {
      throw new Error('جلسه قبلاً شروع شده است')
    }
    const run = this.startInternal()
    this.startPromise = run
    try {
      await run
    } finally {
      this.startPromise = null
    }
  }

  private async startInternal(): Promise<void> {
    const sessionId = generateSessionId()
    const seed = this.deps.seed ?? createRandomSeed()
    this.sessionId = sessionId
    this.exerciseState = this.definition.createSession(sessionId, this.deps.config, seed)
    await this.sessions.create({
      id: sessionId,
      exerciseId: this.definition.id,
      exerciseVersion: this.definition.version,
      contentVersion: this.definition.contentVersion,
      domain: this.definition.domain,
      difficulty: this.deps.config.difficulty,
      seed,
      status: 'in_progress',
      startedAt: this.wallClock(),
      endedAt: null,
      durationMs: null,
      trialCount: 0,
      summary: null,
    })
    await this.settings?.put({
      exerciseId: this.definition.id,
      lastDifficulty: this.deps.config.difficulty,
    })
    this.machine = smDispatch(this.machine, 'PREPARE')
    this.emit()
  }

  /** شروع شمارش معکوس آمادگی */
  beginCountdown(): void {
    this.machine = smDispatch(this.machine, 'BEGIN_COUNTDOWN')
    this.emit()
  }

  /** ورود به فاز ACTIVE: شروع تایمر و تولید اولین مرحله */
  beginActive(): ExerciseTrial {
    this.machine = smDispatch(this.machine, 'START_ACTIVE')
    this.timer.start()
    const trial = this.advanceTrialInternal()
    this.emit()
    return trial
  }

  /**
   * تولید مرحله بعدی. فقط وقتی مجاز است که مرحله جاری پاسخ داده شده
   * باشد (یا هنوز مرحله‌ای تولید نشده باشد).
   */
  advanceTrial(): ExerciseTrial {
    if (this.machine.phase !== 'ACTIVE') {
      throw new Error(`advanceTrial در فاز ${this.machine.phase} مجاز نیست`)
    }
    if (this.currentTrial !== null && !this.currentTrialAnswered) {
      throw new Error('ابتدا باید پاسخ مرحله جاری ثبت شود (submitAnswer یا انقضای مهلت)')
    }
    const trial = this.advanceTrialInternal()
    this.emit()
    return trial
  }

  private advanceTrialInternal(): ExerciseTrial {
    if (!this.exerciseState) throw new Error('state جلسه موجود نیست')
    const { state, trial } = this.definition.nextTrial(this.exerciseState)
    this.exerciseState = state
    this.currentTrial = trial
    this.currentTrialAnswered = false
    this.trialShownAtMs = this.timer.now()
    return trial
  }

  /**
   * ثبت پاسخ مرحله جاری. جلوگیری از پاسخ تکراری: اگر مرحله‌ای فعال
   * نیست یا قبلاً پاسخ داده شده، نتیجه rejected برمی‌گردد (بدون خطا).
   */
  async submitAnswer(answer: unknown): Promise<SubmitResult> {
    if (this.machine.phase !== 'ACTIVE') return { accepted: false, reason: 'wrong_phase' }
    if (this.currentTrial === null || this.exerciseState === null) {
      return { accepted: false, reason: 'no_active_trial' }
    }
    if (this.currentTrialAnswered) return { accepted: false, reason: 'already_answered' }

    const reactionTimeMs = Math.max(0, Math.round(this.timer.now() - this.trialShownAtMs))
    // برای rollback در صورت خطای ذخیره‌سازی — وضعیت قبلی حفظ می‌شود
    const prevState = this.exerciseState
    const prevOutcome = this.lastOutcome
    const newState = this.definition.submitAnswer(this.exerciseState, answer, reactionTimeMs)
    this.exerciseState = newState
    this.currentTrialAnswered = true
    const record = newState.results[newState.results.length - 1] as RecordedTrial
    this.lastOutcome = record

    // ذخیره رویداد خام — id یکتا idempotency را در DB تضمین می‌کند.
    // خطای ذخیره‌سازی (مثلاً سهمیهٔ پر): rollback تا همان پاسخ دوباره
    // قابل ثبت باشد و جلسه قفل نشود
    try {
      await this.trialEvents.append(
        toTrialEventRecord(
          this.sessionId as string,
          this.deps.config.difficulty,
          this.definition.version,
          record,
          this.wallClock(),
        ),
      )
    } catch (err) {
      this.exerciseState = prevState
      this.currentTrialAnswered = false
      this.lastOutcome = prevOutcome
      console.error('ثبت رویداد مرحله در ذخیره‌سازی محلی ناموفق بود', err)
      return { accepted: false, reason: 'persist_failed' }
    }

    if (this.definition.isComplete(newState)) {
      await this.completeInternal()
      return { accepted: true, record, sessionCompleted: true }
    }
    this.emit()
    return { accepted: true, record, sessionCompleted: false }
  }

  /** باقی‌مانده مهلت پاسخ مرحله جاری (ms)؛ null یعنی بدون مهلت */
  timeRemainingMs(): number | null {
    if (this.currentTrial === null || this.currentTrial.responseWindowMs === null) return null
    const elapsed = this.timer.now() - this.trialShownAtMs
    return Math.max(0, this.currentTrial.responseWindowMs - elapsed)
  }

  pause(): void {
    this.machine = smDispatch(this.machine, 'PAUSE')
    if (this.timer.isRunning) this.timer.pause()
    this.emit()
  }

  resume(): void {
    this.machine = smDispatch(this.machine, 'RESUME')
    if (this.timer.currentStatus === 'paused') this.timer.resume()
    // ریشه‌یابی بن‌بست مکث: اگر پاسخ مرحله ثبت شده ولی (به‌دلیل مکث میان
    // submit و advance) پیشروی رخ نداده، همین‌جا جلو برو — کامپوننت با
    // ریمانت، مرحلهٔ بعدی را می‌بیند نه مرحلهٔ پاسخ‌داده‌شدهٔ قفل‌شده را.
    // این کار کلاس whole بن‌بست را در همهٔ بازی‌ها می‌بندد (حتی بازی‌های
    // فاقد بلوک بازیابی محلی).
    if (
      this.machine.phase === 'ACTIVE' &&
      this.currentTrial !== null &&
      this.currentTrialAnswered &&
      this.exerciseState !== null &&
      !this.definition.isComplete(this.exerciseState)
    ) {
      this.advanceTrialInternal()
    }
    this.emit()
  }

  /** پایان جلسه توسط کاربر یا اختلال */
  async abort(): Promise<void> {
    const durationMs = this.timer.currentStatus === 'running' ? this.timer.stop() : this.timer.elapsedMs()
    // ابتدا ثبت قطع در DB، بعد تغییر فاز — وگرنه re-renderِ همان کلیک
    // صفحهٔ ABORTED را پیش از commit دیتابیس می‌کشد (و رفرشِ همان لحظه
    // جلسه را هنوز in_progress می‌بیند). اگر هم‌زمان جلسه COMPLETE شده
    // باشد، ABORT دیگر مجاز نیست و فقط emit می‌کنیم. خطای ذخیره‌سازی
    // مسیر خروج را قفل نمی‌کند (جلسهٔ یتیم در بوت بعدی سالم می‌شود).
    await this.persistFinal('aborted', durationMs).catch((err) => {
      console.error('ذخیرهٔ وضعیت قطع جلسه ناموفق بود', err)
    })
    if (smCanDispatch(this.machine, 'ABORT')) {
      this.machine = smDispatch(this.machine, 'ABORT')
    }
    this.emit()
  }

  private async completeInternal(): Promise<void> {
    this.machine = smDispatch(this.machine, 'COMPLETE')
    const durationMs = this.timer.stop()
    if (this.exerciseState) {
      this.summary = this.definition.getSummary(this.exerciseState)
    }
    // خطای ذخیره‌سازی صفحهٔ نتایج را قفل نمی‌کند؛ رکورد in_progress در
    // بوت بعدی aborted می‌شود (تخریب محتاطانه، بهتر از جلسهٔ زندهٔ قفل‌شده)
    await this.persistFinal('completed', durationMs, this.summary).catch((err) => {
      console.error('ذخیرهٔ نتیجهٔ جلسه ناموفق بود', err)
    })
    this.emit()
  }

  private async persistFinal(
    status: 'completed' | 'aborted',
    durationMs: number,
    summary: ExerciseSummary | null = null,
  ): Promise<void> {
    if (!this.sessionId) return
    const existing = await this.sessions.get(this.sessionId)
    if (!existing) return
    await this.sessions.update({
      ...existing,
      status,
      endedAt: this.wallClock(),
      durationMs,
      trialCount: this.exerciseState?.results.length ?? 0,
      summary,
    })
  }

  get timerRef(): SessionTimer {
    return this.timer
  }
}

/**
 * در بوت اپ: هر جلسه in_progress از اجرای قبلی (refresh/بستن tab)
 * قطع شده است — با برچسب صریح aborted ثبت می‌شوند تا گزارش‌ها سالم بمانند.
 */
export async function abortStaleSessions(sessions: SessionRepository): Promise<number> {
  const stale = await sessions.listByStatus('in_progress')
  for (const record of stale) {
    await sessions.update({
      ...record,
      status: 'aborted',
      endedAt: record.startedAt,
      durationMs: null,
    })
  }
  return stale.length
}
