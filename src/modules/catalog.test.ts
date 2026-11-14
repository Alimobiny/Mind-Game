// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { ALL_EXERCISE_IDS, GAME_CATALOG, catalogById, listCatalog } from './catalog'
import { createAppRegistry } from './index'
import { EXERCISE_FAMILIES, FAMILY_LABELS_FA, isExerciseFamily } from '../core/types'

/**
 * تست‌های کاتالوگ متادیتا — نگهبان دو لایهٔ «کاتالوگ بدون موتور» و
 * «کاتالوگ ↔ رجیستری»: هر سه باید همیشه یک مجموعهٔ ۳۷تایی یکسان باشند.
 */
describe('کاتالوگ متادیتا (بدون موتور)', () => {
  it('۳۷ تمرین با شناسهٔ یکتا دارد', () => {
    expect(GAME_CATALOG).toHaveLength(37)
    expect(new Set(GAME_CATALOG.map((m) => m.id)).size).toBe(37)
  })

  it('فهرست اجرایی ALL_EXERCISE_IDS با کاتالوگ دوطرفه یکی است', () => {
    const catalogIds = GAME_CATALOG.map((m) => m.id).sort()
    expect([...ALL_EXERCISE_IDS].sort()).toEqual(catalogIds)
  })

  it('idهای کاتالوگ دقیقاً همان idهای رجیستری کامل است (نگهبان drift دو لایه)', () => {
    const registry = createAppRegistry()
    const registryIds = registry.list().map((e) => e.meta.id).sort()
    expect(GAME_CATALOG.map((m) => m.id).sort()).toEqual(registryIds)
  })

  it('هر متا خانواده/نوع/اثرهای معتبر و نام انگلیسی غیرخالی دارد', () => {
    for (const meta of GAME_CATALOG) {
      expect(isExerciseFamily(meta.family), `${meta.id} family`).toBe(true)
      expect(meta.nameEn.trim().length, `${meta.id} nameEn`).toBeGreaterThan(0)
      expect(meta.effects.length, `${meta.id} effects`).toBeGreaterThan(0)
    }
  })

  it('listCatalog و catalogById درست کار می‌کنند', () => {
    expect(listCatalog()).toBe(GAME_CATALOG)
    expect(catalogById('pasat')?.nameFa).toBe('جمع زنجیره‌ای گام‌دار')
    expect(catalogById('no-such-game')).toBeUndefined()
  })

  it('هر خانوادهٔ اعلان‌شده در تاکسونومی برچسب فارسی دارد و دست‌کم یک بازی دارد', () => {
    for (const family of EXERCISE_FAMILIES) {
      expect(FAMILY_LABELS_FA[family], `label ${family}`).toBeTruthy()
      expect(
        GAME_CATALOG.some((m) => m.family === family),
        `game for ${family}`,
      ).toBe(true)
    }
  })
})
