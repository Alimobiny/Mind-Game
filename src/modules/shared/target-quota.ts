import { SeededRandom } from '../../core/randomization/seeded-random'

/**
 * سهمیهٔ دقیق جایگاه‌های هدف به‌جای نمونه‌گیری Bernoulli (GAMES-AUDIT §۳-۱).
 *
 * مشکل: با Bernoulliِ نرخ p، جلسهٔ بدون/کم‌هدف ممکن است و شمار hits بین
 * جلسات ناپایدار است (در n=3: P(صفر هدف) ≈ ۱٫۶e-4، اما واریانس شمار هدف
 * بالا). نرم‌افزارهای مرجع quota جایگاه هدف دارند.
 *
 * این کمکی دقیقاً round(rate×total) جایگاه هدف را بدون جای‌گذاری از
 * جایگاه‌های واجدشرط (index ≥ minIndex) برمی‌گزیند و با بذر جلسه بُر
 * می‌خورد — قطعی و بازتولیدپذیر.
 */
export function targetPositionsFor(
  seed: number,
  totalTrials: number,
  minIndex: number,
  targetRate: number,
): ReadonlySet<number> {
  const rng = new SeededRandom(seed)
  const eligible: number[] = []
  for (let i = minIndex; i < totalTrials; i += 1) eligible.push(i)
  const targetCount = Math.max(1, Math.round(targetRate * totalTrials))
  const picked = new Set<number>()
  for (let k = 0; k < targetCount && eligible.length > 0; k += 1) {
    const idx = rng.int(0, eligible.length - 1)
    picked.add(eligible.splice(idx, 1)[0] as number)
  }
  return picked
}
