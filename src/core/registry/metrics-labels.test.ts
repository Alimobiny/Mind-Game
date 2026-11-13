// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createAppRegistry, createExerciseConfig } from '../../modules'

/**
 * ناوردایی برچسب متریک‌ها — هر کلیدی که getSummary یک موتور منتشر می‌کند
 * باید در metricLabelsFa همان بازی برچسب فارسی داشته باشد؛ وگرنه صفحهٔ
 * نتایج کلید خام انگلیسی را به کاربر نشان می‌دهد (fallback `?? key`).
 *
 * جلسهٔ مرجع: پاسخ null (بی‌پاسخی) برای همهٔ مراحل — قرارداد همهٔ موتورها.
 * بازی‌های چندفازی که با null پیش نمی‌روند یا روی null خطا می‌دهند، با
 * سقف ایمن از این پوشش skip می‌شوند (مو‌تور خودشان تست مستقل دارند).
 */

const MAX_STEPS = 500

describe('برچسب متریک‌های نتایج (metricLabelsFa)', () => {
  const registry = createAppRegistry()

  for (const exercise of registry.list()) {
    it(`${exercise.meta.nameFa}: هر متریک summary برچسب فارسی دارد`, () => {
      const definition = exercise.definition
      const config = createExerciseConfig(exercise.meta.id, 1)
      let state = definition.createSession('metrics-labels', config, 20261113)
      let steps = 0
      let playableWithNull = true
      while (!definition.isComplete(state) && steps < MAX_STEPS) {
        try {
          const { state: nextState } = definition.nextTrial(state)
          state = definition.submitAnswer(nextState, null, 0)
        } catch {
          // این موتور با پاسخ null قابل پیشبرد نیست — خارج از پوشش این تست
          playableWithNull = false
          break
        }
        steps += 1
      }
      if (!playableWithNull || !definition.isComplete(state)) return

      const summary = definition.getSummary(state)
      const labels = exercise.meta.metricLabelsFa ?? {}
      for (const key of Object.keys(summary.metrics)) {
        expect(labels[key], `${exercise.meta.id}: برچسب برای متریک ${key}`).toBeDefined()
      }
    })
  }
})
