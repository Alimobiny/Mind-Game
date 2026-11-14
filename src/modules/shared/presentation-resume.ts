/**
 * زمان‌بندی آیتم‌های پلکانیِ ارائه (رقم‌به‌رقم/خانه‌به‌خانه) با پشتیبانی
 * «ادامه از زمان سپری‌شده» برای بازنصبِ پس از مکث (PAUSED=unmount).
 *
 * مشکل اصلی (GAMES-AUDIT §۲-۱): مکث صحنهٔ بازی را unmount می‌کرد و ریمانت
 * کل ارائه را از صفر بازپخش می‌کرد — کاربر محرک را دوبار می‌دید (بایاس
 * صعودی). این کمکی ارائه را از elapsedMs (ساعتِ pause-aware جلسه، از
 * ctx.trialElapsedMs) ادامه می‌دهد:
 *  - آیتم‌هایی که زمانشان گذشته دوباره نشان داده نمی‌شوند؛
 *  - آیتمِ در-وسطِ-نمایش فوری روشن می‌شود و فقط ماندهٔ خودش را می‌گیرد؛
 *  - آیتم‌های آینده با آفستِ درست زمان‌بندی می‌شوند.
 */

export interface CadenceItem {
  /** شروع مطلق آیتم از ابتدای ارائه (ms) */
  readonly startAt: number
  /** مدت نمایش آیتم (ms) */
  readonly displayMs: number
  onShow: () => void
  onHide: () => void
}

/**
 * زمان‌بندی آیتم‌ها؛ در elapsedMs >= totalMs مستقیماً onDone صدا زده می‌شود
 * (پیش از این ارائه تمام بوده — مثلاً مکث در فاز پاسخ). شناسهٔ تایمرها
 * برمی‌گردد تا با useTrialGuards.setTrackedTimeout / پاک‌سازی دستی مصرف شود.
 */
export function scheduleCadence(
  items: readonly CadenceItem[],
  totalMs: number,
  onDone: () => void,
  elapsedMs = 0,
): number[] {
  const timers: number[] = []
  if (elapsedMs >= totalMs) {
    onDone()
    return timers
  }
  for (const item of items) {
    if (elapsedMs >= item.startAt + item.displayMs) continue // گذشته — بدون بازپخش
    if (elapsedMs <= item.startAt) {
      timers.push(window.setTimeout(item.onShow, item.startAt - elapsedMs))
      timers.push(window.setTimeout(item.onHide, item.startAt + item.displayMs - elapsedMs))
    } else {
      // میان نمایش بود — همین حالا روشن و فقط ماندهٔ همین آیتم
      item.onShow()
      timers.push(window.setTimeout(item.onHide, item.startAt + item.displayMs - elapsedMs))
    }
  }
  timers.push(window.setTimeout(onDone, totalMs - elapsedMs))
  return timers
}
