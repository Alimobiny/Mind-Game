import { useCallback, useEffect, useMemo, useRef } from 'react'
import type { ActiveGameContext } from './GameShell'
import type { SubmitResult } from '../../core/session/session-manager'

/** نتیجهٔ پذیرفته‌شدهٔ submit — برای بازخورد فوری بازی */
export type AcceptedSubmitResult = Extract<SubmitResult, { accepted: true }>

export interface SubmitOnceOptions {
  /** پس از پذیرش صدا زده می‌شود (نمایش بازخورد و مانند آن) */
  onAccepted?: (result: AcceptedSubmitResult) => void
  /**
   * پیشروی خودکار پس از پذیرش (پیش‌فرض true). بازی‌های دارای بازخورد
   * تأخیری (مثل حافظهٔ شبکه که پس از نمایش نتیجه advance می‌زند) false بدهند
   * و خودشان در تایمر خودشان advance کنند.
   */
  autoAdvance?: boolean
}

/** پنجرهٔ تلاش مجدد مهلت پس از rollback ذخیره (persist_failed) */
const DEADLINE_RETRY_MS = 3000
/** سقف re-arm مهلت — پس از آن قفل باز می‌ماند و تلاش با کاربر است */
const DEADLINE_MAX_RETRIES = 2

/**
 * سه‌گاردِ قراردادی هر بازی، یک‌جا:
 *
 *  ۱. قفل پاسخ (submittedRef): دوبل‌تپ/دوبل‌submit ثبت دومی نمی‌سازد؛ روی
 *     submit ردشده (persist_failed که مدیر rollback کرده) باز می‌شود.
 *  ۲. advance امن: فقط وقتی جلسه کامل نشده و داخل try/catch (جلسهٔ
 *     هم‌زمان قطع/تکمیل شده خطا نمی‌سازد).
 *  ۳. تایمرهای ردیابی‌شده: همه در تغییر مرحله و unmount پاک می‌شوند.
 *
 * به‌علاوه بدهی «re-arm مهلت» (GAMES-AUDIT §۲): مهلتِ انقضا پس از rollback
 * ذخیره با پنجرهٔ کوتاه دوباره مسلح می‌شود تا جلسه بدون مهلت نماند —
 * تا سقف DEADLINE_MAX_RETRIES (حلقهٔ بی‌نهایت روی خطای پایدار IDB نمی‌سازد).
 *
 * همهٔ شناسه‌های توابع برای عمر کامپوننت پایدارند (ctx از ref خوانده
 * می‌شود) — گذاشتنشان در وابستگی افکت‌ها مرحله را عمداً re-run نمی‌کند.
 */
export function useTrialGuards(ctx: ActiveGameContext, trialIndex: number) {
  const ctxRef = useRef(ctx)
  ctxRef.current = ctx

  const submittedRef = useRef(false)
  const timersRef = useRef<number[]>([])
  const deadlineTimerRef = useRef<number | null>(null)
  const deadlineRetriesRef = useRef(0)

  const clearTrackedTimeouts = useCallback(() => {
    for (const t of timersRef.current) window.clearTimeout(t)
    timersRef.current = []
  }, [])

  const clearDeadline = useCallback(() => {
    if (deadlineTimerRef.current !== null) {
      window.clearTimeout(deadlineTimerRef.current)
      deadlineTimerRef.current = null
    }
  }, [])

  // تغییر مرحله: بازکردن قفل + صفرکردن شمارندهٔ re-arm + پاک‌کردن همهٔ
  // تایمرها؛ cleanup همان کار را در unmount می‌کند. افکت این هوک پیش از
  // افکت‌های خود بازی اجرا می‌شود (ترتیب تعریف) — تایمرهای تازه سالم می‌مانند
  useEffect(() => {
    submittedRef.current = false
    deadlineRetriesRef.current = 0
    clearTrackedTimeouts()
    clearDeadline()
    return () => {
      clearTrackedTimeouts()
      clearDeadline()
    }
  }, [trialIndex, clearTrackedTimeouts, clearDeadline])

  const advanceSafely = useCallback(() => {
    const current = ctxRef.current
    try {
      current.advance()
    } catch {
      // جلسه هم‌زمان قطع/تکمیل شده — بی‌اثر
    }
  }, [])

  const submitOnce = useCallback(
    async (answer: unknown, opts: SubmitOnceOptions = {}): Promise<void> => {
      if (submittedRef.current) return
      submittedRef.current = true
      const result = await ctxRef.current.submit(answer)
      if (!result.accepted) {
        // persist_failed: مدیر rollback کرده — قفل باز بماند تا تلاش مجدد
        // ممکن باشد (وگرنه جلسه تا abort قفل می‌شد)
        submittedRef.current = false
        return
      }
      opts.onAccepted?.(result)
      // آخرین پاسخ جلسه را کامل کرد → advanceی برای مرحله بعدی وجود ندارد
      if (result.sessionCompleted) return
      if (opts.autoAdvance !== false) advanceSafely()
    },
    [advanceSafely],
  )

  const fireDeadline = useCallback(
    async (getAnswer: () => unknown, opts: SubmitOnceOptions): Promise<void> => {
      if (submittedRef.current) return
      submittedRef.current = true
      const result = await ctxRef.current.submit(getAnswer())
      if (result.accepted) {
        opts.onAccepted?.(result)
        if (!result.sessionCompleted && opts.autoAdvance !== false) advanceSafely()
        return
      }
      // قفل باز بماند؛ فقط روی خطای ذخیره‌سازی re-arm می‌شویم — ردِ دیگر
      // (wrong_phase/already_answered) یعنی مسیر دیگری جلو برده
      submittedRef.current = false
      if (result.reason !== 'persist_failed') return
      if (deadlineRetriesRef.current >= DEADLINE_MAX_RETRIES) return
      deadlineRetriesRef.current += 1
      deadlineTimerRef.current = window.setTimeout(() => {
        deadlineTimerRef.current = null
        void fireDeadline(getAnswer, opts)
      }, DEADLINE_RETRY_MS)
    },
    [advanceSafely],
  )

  /**
   * مهلت پاسخ مرحله: در انقضا، پاسخِ getAnswer (پیش‌فرض بازی null=omission
   * را با () => null می‌دهد) ثبت و (مگر خلافش خواسته شده) advance می‌زند.
   * تایمر مهلت جدا از تایمرهای ردیابی‌شده است تا پاک‌کردن آن‌ها مهلت نکشد.
   */
  const armDeadline = useCallback(
    (getAnswer: () => unknown, ms: number, opts: SubmitOnceOptions = {}): void => {
      clearDeadline()
      deadlineTimerRef.current = window.setTimeout(() => {
        deadlineTimerRef.current = null
        void fireDeadline(getAnswer, opts)
      }, ms)
    },
    [clearDeadline, fireDeadline],
  )

  const setTrackedTimeout = useCallback((callback: () => void, ms: number): number => {
    const id = window.setTimeout(callback, ms)
    timersRef.current.push(id)
    return id
  }, [])

  /** ثبت شناسهٔ تایمرِ ساخته‌شده بیرون از هوک (مثل scheduleCadence) برای پاک‌سازی */
  const trackTimeoutId = useCallback((id: number): void => {
    timersRef.current.push(id)
  }, [])

  return useMemo(
    () => ({
      /** قفل پاسخ مرحلهٔ جاری — true تا وقتی ثبت در جریان/پذیرفته است */
      isSubmitted: (): boolean => submittedRef.current,
      submitOnce,
      armDeadline,
      setTrackedTimeout,
      trackTimeoutId,
      clearTrackedTimeouts,
      clearDeadline,
    }),
    [submitOnce, armDeadline, setTrackedTimeout, trackTimeoutId, clearTrackedTimeouts, clearDeadline],
  )
}

export type TrialGuards = ReturnType<typeof useTrialGuards>
