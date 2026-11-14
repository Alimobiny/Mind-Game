import { describe, expect, it } from 'vitest'
import { GAME_CATALOG } from '../modules/catalog'
import { activeCatalogDomains, groupCatalog, searchCatalog } from './home-catalog'

/**
 * منطق خالص فهرست خانگی — گروه‌بندی چهارنما و جست‌وجوی گسترش‌یافته
 * (نام انگلیسی/شناسه/خانواده/کلیدواژه) مستقیماً روی کاتالوگ واقعی.
 */
describe('groupCatalog — چهار نمای گروه‌بندی', () => {
  it('در هر نما هر تمرین دقیقاً یک‌بار ظاهر می‌شود', () => {
    for (const mode of ['domain', 'type', 'effect', 'family'] as const) {
      const all = groupCatalog(GAME_CATALOG, mode).flatMap((g) => g.list.map((m) => m.id))
      expect(all, mode).toHaveLength(GAME_CATALOG.length)
      expect(new Set(all).size, mode).toBe(GAME_CATALOG.length)
    }
  })

  it('نمای خانواده: بخش‌ها برچسب خانواده دارند و ان-بک‌ها زیر یک سقف‌اند', () => {
    const familyGroups = groupCatalog(GAME_CATALOG, 'family')
    expect(familyGroups.every((g) => g.kind === 'family')).toBe(true)
    const dualGroup = familyGroups.find((g) => g.key === 'dual-n-back')
    expect(dualGroup?.list.map((m) => m.id).sort()).toEqual(['dual-n-back', 'dual-n-back-auditory'])
    // دهانهٔ مرکب دو عضو دارد (ospan + symspan) — در دو حوزهٔ متفاوت
    const spanGroup = familyGroups.find((g) => g.key === 'complex-span')
    expect(spanGroup?.list).toHaveLength(2)
  })

  it('نمای نوع: هر بخش فقط بازی‌های همان جنس تکلیف دارد', () => {
    const typeGroups = groupCatalog(GAME_CATALOG, 'type')
    const numeric = typeGroups.find((g) => g.key === 'numeric')
    expect(numeric?.list.every((m) => m.exerciseType === 'numeric')).toBe(true)
  })

  it('activeCatalogDomains فقط حوزه‌های دارای بازی را به ترتیب استاندارد می‌دهد', () => {
    const domains = activeCatalogDomains(GAME_CATALOG)
    expect(domains).toHaveLength(8)
    expect(domains[0]).toBe('working-memory')
  })
})

describe('searchCatalog — جست‌وجوی گسترش‌یافته', () => {
  it('عبارت لاتین n-back هر دو ان-بک را می‌یابد', () => {
    const ids = searchCatalog(GAME_CATALOG, 'n-back').map((m) => m.id)
    expect(ids).toContain('n-back')
    expect(ids).toContain('dual-n-back')
  })

  it('شناسهٔ لاتین pasat پیدا می‌شود (نام فارسی «جمع زنجیره‌ای گام‌دار» است)', () => {
    expect(searchCatalog(GAME_CATALOG, 'pasat').map((m) => m.id)).toEqual(['pasat'])
  })

  it('کلیدواژهٔ فارسی مترادف (پاسات) هم پیدا می‌شود', () => {
    expect(searchCatalog(GAME_CATALOG, 'پاسات').map((m) => m.id)).toEqual(['pasat'])
  })

  it('برچسب خانواده (کورسی) به توالی مکانی می‌رسد', () => {
    expect(searchCatalog(GAME_CATALOG, 'کورسی').map((m) => m.id)).toEqual(['spatial-sequence'])
  })

  it('جست‌وجوی خالی یا فقط فاصله نتیجه‌ای نمی‌دهد', () => {
    expect(searchCatalog(GAME_CATALOG, '')).toEqual([])
    expect(searchCatalog(GAME_CATALOG, '   ')).toEqual([])
  })

  it('نرمال‌سازی فارسی: «انبک» (بدون نیم‌فاصله) ان-بک را می‌یابد', () => {
    const ids = searchCatalog(GAME_CATALOG, 'انبک').map((m) => m.id)
    expect(ids).toContain('n-back')
  })
})
