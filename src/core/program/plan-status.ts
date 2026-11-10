import type { SessionRecord } from '../types'
import { toLocalIsoDate } from '../difficulty/adaptive-difficulty'

/**
 * استخراج وضعیت آیتم‌های برنامه از رکوردهای جلسه — «بدون دفترداری دوباره»:
 * وضعیت انجام‌شده هرگز در استور برنامه ذخیره نمی‌شود؛ هر بار از جلسات
 * همان روز مشتق می‌شود. یک آیتم «انجام‌شده» است اگر همان روز، دست‌کم یک
 * جلسه کامل‌شده (status === 'completed') برای همان بازی وجود داشته باشد.
 */
export function deriveCompletedExerciseIds(
  sessions: readonly SessionRecord[],
  dateIso: string,
): ReadonlySet<string> {
  const done = new Set<string>()
  for (const session of sessions) {
    if (session.status === 'completed' && toLocalIsoDate(session.startedAt) === dateIso) {
      done.add(session.exerciseId)
    }
  }
  return done
}
