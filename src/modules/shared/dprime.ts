/**
 * d′ (حساسیت) با تصحیح loglinear — برای خانوادهٔ n-back (GAMES-AUDIT §۳-۲).
 *
 * با N کوچک جلسه‌ای و نرخ‌های حدی (۰/۱)، d′ خام بی‌نهایت می‌شود؛ تصحیح
 * استاندارد Hautus (1995): هر نرخ با شمارش ۰٫۵ و مخرج +۱ هموار می‌شود.
 * مقادیر خام hit/FA باید کنارش منتشر بمانند (انتخاب محافظه‌کارانهٔ پروژه).
 */

/** معکوس CDF نرمال (probit) — تقریب Acklam با خطای < ۱٫۱۵e-9 */
function probit(p: number): number {
  // ضرایب تقریب Acklam
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239]
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1]
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783]
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416]
  const plow = 0.02425
  const phigh = 1 - plow
  if (p <= 0 || p >= 1) throw new RangeError('probit فقط روی (۰،۱) تعریف شده است')

  /** مقدار چندجمله‌ای هورنر: ((e₀x+e₁)x+…)x+آخرین */
  const horner = (coeffs: readonly number[], x: number): number => {
    let acc = 0
    for (const co of coeffs) acc = acc * x + co
    return acc
  }

  if (p < plow) {
    const q = Math.sqrt(-2 * Math.log(p))
    return horner(c, q) / horner([...d, 1], q)
  }
  if (p <= phigh) {
    const q = p - 0.5
    const r = q * q
    return (horner(a, r) * q) / horner([...b, 1], r)
  }
  const q = Math.sqrt(-2 * Math.log(1 - p))
  return -horner(c, q) / horner([...d, 1], q)
}

/**
 * d′ تصحیح‌شدهٔ loglinear از شمارش‌های خام — همیشه متناهی است؛
 * خروجی با دو رقم اعشار گرد می‌شود.
 */
export function dPrimeLoglinear(
  hits: number,
  nTargets: number,
  falseAlarms: number,
  nNonTargets: number,
): number {
  if (nTargets < 0 || nNonTargets < 0) throw new RangeError('شمارش‌ها منفی نمی‌توانند باشند')
  if (hits < 0 || hits > nTargets || falseAlarms < 0 || falseAlarms > nNonTargets) {
    throw new RangeError('شمارش‌ها با مخرج ناسازگارند')
  }
  const hitRate = (hits + 0.5) / (nTargets + 1)
  const faRate = (falseAlarms + 0.5) / (nNonTargets + 1)
  return Math.round((probit(hitRate) - probit(faRate)) * 100) / 100
}
