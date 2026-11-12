import type { SessionRecord } from '../types'
import type { ProgramRunRecord, ProgramRunStatus, TrainingPlanItem } from './types'

/**
 * منطق خالص «اجرای زنجیره‌ای برنامهٔ روزانه» — مشتق‌سازی آیتم بعدی،
 * چرخهٔ عمر رکورد اجرا و خلاصهٔ تحلیلی پایان اجرا. هیچ I/O ندارد؛
 * صفحه‌ها مخزن‌ها را می‌خوانند و به همین توابع می‌دهند.
 */

/** نخستین آیتم طرح که هنوز «انجام‌شده» نیست — به همان ترتیب طرح */
export function nextPendingItem(
  items: readonly TrainingPlanItem[],
  doneExerciseIds: ReadonlySet<string>,
): TrainingPlanItem | null {
  return items.find((item) => !doneExerciseIds.has(item.exerciseId)) ?? null
}

/** آخرین اجرای در_حال_اجرا از فهرست اجراهای یک روز — برای ادامه پس از رفرش */
export function findInProgressRun(
  runs: readonly ProgramRunRecord[],
): ProgramRunRecord | null {
  for (let i = runs.length - 1; i >= 0; i -= 1) {
    const run = runs[i] as ProgramRunRecord
    if (run.status === 'in_progress') return run
  }
  return null
}

/** رکورد اجرای تازه — id از تاریخ + لحظهٔ شروع ساخته می‌شود تا یکتا بماند */
export function startRun(date: string, startedAt: number): ProgramRunRecord {
  return {
    id: `${date}-${startedAt}`,
    date,
    startedAt,
    endedAt: null,
    durationMs: null,
    sessionIds: [],
    status: 'in_progress',
  }
}

/** ضمیمهٔ جلسهٔ همین زنجیره — id تکراری دوباره ضمیمه نمی‌شود */
export function withSession(run: ProgramRunRecord, sessionId: string): ProgramRunRecord {
  if (run.sessionIds.includes(sessionId)) return run
  return { ...run, sessionIds: [...run.sessionIds, sessionId] }
}

/**
 * نهایی‌سازی اجرا — پایان کامل یا قطع. مدت دیواری (endedAt − startedAt)
 * همین‌جا محاسبه و در رکورد ذخیره می‌شود تا تحلیل بعدی فقط خواندنی باشد.
 * نهایی‌کردن اجرای از-قبل-نهایی‌شده بی‌اثر است (idempotent).
 */
export function finalizeRun(
  run: ProgramRunRecord,
  status: Exclude<ProgramRunStatus, 'in_progress'>,
  endedAt: number,
): ProgramRunRecord {
  if (run.status !== 'in_progress') return run
  return { ...run, status, endedAt, durationMs: endedAt - run.startedAt }
}

/** خلاصهٔ تحلیلی یک اجرا از جلسات ثبت‌شده در آن */
export interface ProgramRunSummary {
  /** جلسات کامل‌شدهٔ این زنجیره */
  readonly completedSessions: number
  /** جلسات قطع‌شدهٔ این زنجیره */
  readonly abortedSessions: number
  /** مدت دیواری کل زنجیره — اجرای در_حال_اجرا null */
  readonly wallDurationMs: number | null
  /** مجموع زمان فعال جلسات (بدون توقف‌ها) */
  readonly activeMs: number
  /** میانگین دقت جلسات دارای خلاصه — بدون جلسهٔ خلاصه‌دار null */
  readonly meanAccuracy: number | null
}

/**
 * تحلیل اجرا: جلسات بر اساس run.sessionIds جستجو می‌شوند؛ جلسهٔ ناموجود
 * (مثلاً حذف‌شده) نادیده گرفته می‌شود تا تحلیل خراب نشود.
 */
export function summarizeRun(
  run: ProgramRunRecord,
  sessions: readonly SessionRecord[],
): ProgramRunSummary {
  const byId = new Map(sessions.map((s) => [s.id, s]))
  const mine = run.sessionIds
    .map((id) => byId.get(id))
    .filter((s): s is SessionRecord => s !== undefined)
  const completed = mine.filter((s) => s.status === 'completed')
  const withSummary = completed.filter((s) => s.summary !== null)
  const meanAccuracy =
    withSummary.length === 0
      ? null
      : Math.round(
          withSummary.reduce((acc, s) => acc + (s.summary?.accuracy ?? 0), 0) /
            withSummary.length,
        )
  return {
    completedSessions: completed.length,
    abortedSessions: mine.filter((s) => s.status === 'aborted').length,
    wallDurationMs: run.durationMs,
    activeMs: mine.reduce((acc, s) => acc + (s.durationMs ?? 0), 0),
    meanAccuracy,
  }
}
