// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createAppRegistry } from '../../modules'
import { EXERCISE_TYPES, isExerciseType } from '../types'
import { isCognitiveDomain } from '../types'
import { EXERCISE_FAMILIES, FAMILY_LABELS_FA, isExerciseFamily } from '../types'

/**
 * تست‌های طبقه‌بندی — هر تمرین ثبت‌شده باید «نوع تمرین» معتبر،
 * «اثرهای شناختی» غیرخالی (با اعضای معتبر) و «خانوادهٔ پارادایمی»
 * معتبر با برچسب داشته باشد.
 */
describe('طبقه‌بندی تمرین‌ها (نوع تمرین / اثر شناختی / خانواده)', () => {
  const registry = createAppRegistry()
  const exercises = registry.list()

  it('هر تمرین خانوادهٔ پارادایمی معتبر با برچسب فارسی دارد', () => {
    for (const exercise of exercises) {
      expect(isExerciseFamily(exercise.meta.family), `${exercise.meta.id}: ${exercise.meta.family}`).toBe(true)
      expect(FAMILY_LABELS_FA[exercise.meta.family], `label ${exercise.meta.id}`).toBeTruthy()
    }
  })

  it('هر خانوادهٔ اعلان‌شده در تاکسونومی دست‌کم یک بازی دارد (بدون خانوادهٔ مرده)', () => {
    for (const family of EXERCISE_FAMILIES) {
      const count = exercises.filter((e) => e.meta.family === family).length
      expect(count, `خانواده ${family}`).toBeGreaterThanOrEqual(1)
    }
  })

  it('گروه‌بندی بر اساس خانواده، همهٔ بازی‌ها را دقیقاً یک‌بار پوشش می‌دهد', () => {
    const grouped = new Map<string, number>()
    for (const exercise of exercises) {
      const key = exercise.meta.family
      grouped.set(key, (grouped.get(key) ?? 0) + 1)
    }
    const total = [...grouped.values()].reduce((a, b) => a + b, 0)
    expect(total).toBe(exercises.length)
  })

  it('هر تمرین نوع معتبر دارد', () => {
    for (const exercise of exercises) {
      expect(
        isExerciseType(exercise.meta.exerciseType),
        `${exercise.meta.id}: ${exercise.meta.exerciseType}`,
      ).toBe(true)
    }
  })

  it('هر تمرین حداقل یک اثر معتبر دارد (اولین = اثر اصلی)', () => {
    for (const exercise of exercises) {
      const { effects } = exercise.meta
      expect(effects.length, exercise.meta.id).toBeGreaterThan(0)
      for (const effect of effects) {
        expect(isCognitiveDomain(effect), `${exercise.meta.id}: ${effect}`).toBe(true)
      }
    }
  })

  it('اثرهای هر تمرین بدون تکرارند', () => {
    for (const exercise of exercises) {
      const unique = new Set(exercise.meta.effects)
      expect(unique.size, exercise.meta.id).toBe(exercise.meta.effects.length)
    }
  })

  it('هر نوع تمرین حداقل دو بازی دارد (نماها خالی نمی‌مانند)', () => {
    const counts = new Map(EXERCISE_TYPES.map((t) => [t, 0]))
    for (const exercise of exercises) {
      counts.set(exercise.meta.exerciseType, (counts.get(exercise.meta.exerciseType) ?? 0) + 1)
    }
    for (const [type, count] of counts) {
      expect(count, `نوع ${type}`).toBeGreaterThanOrEqual(2)
    }
  })

  it('گروه‌بندی بر اساس اثر اصلی، همهٔ بازی‌ها را دقیقاً یک‌بار پوشش می‌دهد', () => {
    const grouped = new Map<string, number>()
    for (const exercise of exercises) {
      const key = exercise.meta.effects[0] as string
      grouped.set(key, (grouped.get(key) ?? 0) + 1)
    }
    const total = [...grouped.values()].reduce((a, b) => a + b, 0)
    expect(total).toBe(exercises.length)
    expect([...grouped.keys()].every((k) => isCognitiveDomain(k))).toBe(true)
  })
})
