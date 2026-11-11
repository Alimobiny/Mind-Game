/**
 * طبقه‌بندی عرضی تمرین‌ها — مستقل از «حوزهٔ شناختی».
 *
 * «نوع تمرین» جنس تکلیف را توصیف می‌کند (عددی؟ کلامی؟ دیداری؟ ...)؛
 * «اثر شناختی» همان حوزه‌های شناختی هستند که این تمرین تقویت می‌کند
 * (عنصر اول effects = اثر اصلی — مبنای گروه‌بندی نمای «اثر» در فهرست).
 */
export const EXERCISE_TYPES = [
  'numeric',
  'verbal',
  'visual',
  'spatial',
  'reaction',
  'logic',
] as const

export type ExerciseType = (typeof EXERCISE_TYPES)[number]

export function isExerciseType(value: string): value is ExerciseType {
  return (EXERCISE_TYPES as readonly string[]).includes(value)
}
