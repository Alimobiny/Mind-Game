import { describe, expect, it } from 'vitest'
import { GAME_CATALOG } from '../modules/catalog'
import {
  activeCatalogDomains,
  familyOptions,
  filterCatalog,
  searchCatalog,
  type LastPlayedIndex,
} from './home-catalog'

/**
 * منطق خالص کتابخانهٔ فهرست خانگی — فیلتر (حوزه/خانواده)، مرتب‌سازی و
 * جست‌وجوی گسترش‌یافته (نام انگلیسی/شناسه/خانواده/کلیدواژه) روی کاتالوگ واقعی.
 */
describe('filterCatalog — فیلتر و مرتب‌سازی کتابخانه', () => {
  it('بدون فیلتر، همهٔ ۳۷ تمرین را با ترتیب پیش‌فرض می‌دهد', () => {
    const all = filterCatalog(GAME_CATALOG, {})
    expect(all).toHaveLength(37)
    expect(all).toBe(GAME_CATALOG)
  })

  it('فیلتر حوزه فقط بازی‌های همان حوزه را می‌دهد', () => {
    const attention = filterCatalog(GAME_CATALOG, { domain: 'attention-control' })
    expect(attention).toHaveLength(5)
    expect(attention.every((m) => m.domain === 'attention-control')).toBe(true)
  })

  it('فیلتر خانواده + حوزه با هم: complex-span در working-memory فقط ospan', () => {
    const ospan = filterCatalog(GAME_CATALOG, {
      domain: 'working-memory',
      family: 'complex-span',
    })
    expect(ospan.map((m) => m.id)).toEqual(['operation-span'])
  })

  it('ترکیب فیلتر بی‌نتیجه، فهرست خالی می‌دهد (نه خطا)', () => {
    expect(filterCatalog(GAME_CATALOG, { domain: 'sensorimotor', family: 'n-back' })).toEqual([])
  })

  it('سورت الفبایی: نام‌های فارسی به ترتیب locale فارسی', () => {
    const alpha = filterCatalog(GAME_CATALOG, { sort: 'alpha' })
    const names = alpha.map((m) => m.nameFa)
    const sorted = [...names].sort((a, b) => a.localeCompare(b, 'fa'))
    expect(names).toEqual(sorted)
  })

  it('سورت آخرین اجرا: تازه‌ترین اول، بی‌سابقه‌ها آخر به ترتیب پیش‌فرض', () => {
    const lastPlayed: LastPlayedIndex = {
      pasat: '2026-11-15',
      'n-back': '2026-11-14',
      stroop: '2026-11-13',
    }
    const recent = filterCatalog(GAME_CATALOG, { sort: 'recent' }, lastPlayed)
    expect(recent.slice(0, 3).map((m) => m.id)).toEqual(['pasat', 'n-back', 'stroop'])
    // بی‌سابقه‌ها همه بعد از سابقه‌دارها و به ترتیب پیش‌فرض
    const firstNever = recent.findIndex((m) => lastPlayed[m.id] === undefined)
    expect(firstNever).toBe(3)
    expect(recent.slice(firstNever)).toEqual(
      GAME_CATALOG.filter((m) => lastPlayed[m.id] === undefined),
    )
  })

  it('activeCatalogDomains همهٔ ۸ حوزه را به ترتیب استاندارد می‌دهد', () => {
    expect(activeCatalogDomains(GAME_CATALOG)).toHaveLength(8)
    expect(activeCatalogDomains(GAME_CATALOG)[0]).toBe('working-memory')
  })

  it('familyOptions: در کل کاتالوگ همهٔ خانواده‌های دارای بازی؛ محدود به حوزه', () => {
    const all = familyOptions(GAME_CATALOG)
    expect(all).toContain('n-back')
    expect(all).toContain('complex-span')
    // در حوزهٔ حافظهٔ کاری، خانوادهٔ پاسات نیست
    const wm = familyOptions(GAME_CATALOG, 'working-memory')
    expect(wm).not.toContain('pasat')
    expect(wm).toContain('complex-span')
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
