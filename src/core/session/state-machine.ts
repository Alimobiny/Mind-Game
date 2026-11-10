/**
 * ماشین حالت جلسه — هسته مشترک همه بازی‌ها.
 *
 * سطوح حالت:
 *  - سطح جلسه (همین فایل): IDLE → READY → COUNTDOWN → ACTIVE → COMPLETED/ABORTED
 *  - سطح مرحله (داخل هر بازی): بازخورد و رفتن به مرحله بعد زیرمجموعه فاز ACTIVE
 *    است، چون بازی‌هایی مثل Go/No-Go جریان پیوسته بدون بازخورد بین‌مرحله‌ای
 *    دارند و تحمیل حالت FEEDBACK سراسری الگوی تعاملی آن‌ها را می‌شکند.
 *
 * این ماژول یک reducer خالص است: نه DOM دارد، نه تایمر واقعی؛
 * بنابراین بدون مرورگر هم تست می‌شود.
 */

export type SessionPhase =
  /** قبل از آماده‌سازی جلسه */
  | 'IDLE'
  /** دستورالعمل نمایش داده شده؛ منتظر تأیید کاربر */
  | 'READY'
  /** شمارش معکوس آمادگی */
  | 'COUNTDOWN'
  /** اجرای مراحل تمرین */
  | 'ACTIVE'
  /** توقف موقت (مثلاً با مخفی‌دیدن صفحه) */
  | 'PAUSED'
  /** پایان موفق جلسه */
  | 'COMPLETED'
  /** قطع جلسه توسط کاربر یا اختلال */
  | 'ABORTED'

export type SessionEvent =
  | 'PREPARE'
  | 'BEGIN_COUNTDOWN'
  | 'START_ACTIVE'
  | 'PAUSE'
  | 'RESUME'
  | 'COMPLETE'
  | 'ABORT'
  | 'RESET'

export interface SessionMachineState {
  readonly phase: SessionPhase
  /** فازی که PAUSE از آن رخ داده؛ برای بازگشت صحیح با RESUME */
  readonly phaseBeforePause: SessionPhase | null
  /** تعداد دفعات PAUSE — برای تحلیل کیفیت جلسه */
  readonly pauseCount: number
}

export function initialMachineState(): SessionMachineState {
  return { phase: 'IDLE', phaseBeforePause: null, pauseCount: 0 }
}

/** آیا رویداد در فاز فعلی مجاز است؟ */
export function canDispatch(state: SessionMachineState, event: SessionEvent): boolean {
  switch (event) {
    case 'PREPARE':
      return state.phase === 'IDLE'
    case 'BEGIN_COUNTDOWN':
      return state.phase === 'READY'
    case 'START_ACTIVE':
      return state.phase === 'COUNTDOWN'
    case 'PAUSE':
      return state.phase === 'ACTIVE' || state.phase === 'COUNTDOWN'
    case 'RESUME':
      return state.phase === 'PAUSED'
    case 'COMPLETE':
      return state.phase === 'ACTIVE'
    case 'ABORT':
      return (
        state.phase === 'READY' ||
        state.phase === 'COUNTDOWN' ||
        state.phase === 'ACTIVE' ||
        state.phase === 'PAUSED'
      )
    case 'RESET':
      return state.phase === 'COMPLETED' || state.phase === 'ABORTED'
  }
}

/**
 * اعمال رویداد روی حالت. رویداد غیرمجاز خطا می‌دهد (نه بی‌صدا نادیده
 * گرفته می‌شود) تا باگ‌های جریان در توسعه و تست زود آشکار شوند.
 */
export function dispatch(state: SessionMachineState, event: SessionEvent): SessionMachineState {
  if (!canDispatch(state, event)) {
    throw new Error(`رویداد ${event} در فاز ${state.phase} مجاز نیست`)
  }
  switch (event) {
    case 'PREPARE':
      return { ...state, phase: 'READY' }
    case 'BEGIN_COUNTDOWN':
      return { ...state, phase: 'COUNTDOWN' }
    case 'START_ACTIVE':
      return { ...state, phase: 'ACTIVE' }
    case 'PAUSE':
      return {
        ...state,
        phase: 'PAUSED',
        phaseBeforePause: state.phase,
        pauseCount: state.pauseCount + 1,
      }
    case 'RESUME': {
      const backTo = state.phaseBeforePause ?? 'ACTIVE'
      return { ...state, phase: backTo, phaseBeforePause: null }
    }
    case 'COMPLETE':
      return { ...state, phase: 'COMPLETED', phaseBeforePause: null }
    case 'ABORT':
      return { ...state, phase: 'ABORTED', phaseBeforePause: null }
    case 'RESET':
      return initialMachineState()
  }
}

export function isTerminal(phase: SessionPhase): boolean {
  return phase === 'COMPLETED' || phase === 'ABORTED'
}

/** اجرای دنباله‌ای رویدادها — برای تست و اسکریپت‌های قطعی */
export function dispatchAll(state: SessionMachineState, events: readonly SessionEvent[]): SessionMachineState {
  return events.reduce((current, event) => dispatch(current, event), state)
}
