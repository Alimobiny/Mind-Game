/**
 * تولید seed قطعی برای مرحله n از یک جلسه — بدون نگهداری وضعیت RNG
 * در State بازی. هر مرحله صرفاً از (seed جلسه، شماره مرحله) ساخته می‌شود
 * تا تولید محرک‌ها خالص و بازتولیدپذیر بماند.
 */
export function deriveTrialSeed(sessionSeed: number, trialIndex: number): number {
  // ضرب در ثابت طلایی 32بیتی + xor؛ برای شماره‌های متوالی پراکندگی خوبی دارد
  return (sessionSeed ^ Math.imul(trialIndex + 1, 0x9e3779b9)) >>> 0
}
