// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { createAppRegistry, createExerciseConfig } from '../../modules'
import { standardStageCount } from '../difficulty/stage-counts'

/**
 * ناوردایی‌های متا↔موتور — رجیستری فقط id/exerciseType/effects را اعتبارسنجی
 * می‌کند؛ این تست هم‌راستایی بقیهٔ فیلدها را برای هر ۳۷ بازی قفل می‌کند:
 *  ۱. دامنه/نسخه/نسخهٔ محتوای متا همان مقادیر موتور است (پیشگیری از drift
 *     متادیتای درون‌خطی موج ۱ از موتورها).
 *  ۲. هرجا config موتور totalTrials دارد، با meta.plannedTrials هم‌خوان است —
 *     باگ «plannedTrials ثابت ۸ در برابر ۱۸-۲۴ مرحلهٔ واقعی حافظهٔ انجمنی»
 *     (نشست ۱۳) دقیقاً از همین نبودِ گارد زنده بود.
 */
describe('ناوردایی‌های متا ↔ موتور', () => {
  const registry = createAppRegistry()
  const exercises = registry.list()

  it('هر تمرین: دامنه/نسخه/نسخهٔ محتوای متا = موتور', () => {
    expect(exercises.length).toBe(37)
    for (const exercise of exercises) {
      const { meta, definition } = exercise
      expect(meta.domain, `${meta.id}: domain`).toBe(definition.domain)
      expect(meta.version, `${meta.id}: version`).toBe(definition.version)
      expect(meta.contentVersion, `${meta.id}: contentVersion`).toBe(definition.contentVersion)
    }
  })

  it('هرجا config موتور totalTrials دارد، با meta.plannedTrials هم‌خوان است (کف = سطح اول)', () => {
    for (const exercise of exercises) {
      const { meta } = exercise
      const planned = meta.plannedTrials
      expect(planned, `${meta.id}: plannedTrials مثبت`).toBeGreaterThan(0)
      // برای بازی‌هایی که تعداد مرحله به سطح وابسته است (حافظهٔ انجمنی)،
      // متا کفِ سطح اول را گزارش می‌کند؛ GameShell در اجرا از config.totalTrials
      // همان سطح می‌خواند (ترجیح بر متا)
      const baseDifficulty = meta.difficultyLevels[0] as number
      const config = createExerciseConfig(meta.id, baseDifficulty) as { totalTrials?: number }
      if (config.totalTrials === undefined) continue
      expect(
        config.totalTrials,
        `${meta.id} سطح ${baseDifficulty}: config.totalTrials باید = meta.plannedTrials باشد`,
      ).toBe(planned)
    }
  })

  it('تعداد مرحلهٔ config در هر سطح = نردبان سیاست (سطح بالاتر = مراحل بیشتر)', () => {
    for (const exercise of exercises) {
      const { meta } = exercise
      for (const level of meta.difficultyLevels) {
        const config = createExerciseConfig(meta.id, level) as {
          totalTrials?: number
          trials?: number
          trialCount?: number
        }
        const count = config.totalTrials ?? config.trials ?? config.trialCount
        if (count === undefined) continue
        expect(
          count,
          `${meta.id} سطح ${level}: تعداد مرحلهٔ config باید = نردبان سیاست باشد`,
        ).toBe(standardStageCount(meta.id, level, meta.plannedTrials))
      }
    }
  })
})
