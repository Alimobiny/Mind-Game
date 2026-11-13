// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { countPersianWords, normalizePersian, persianEquals } from './persian'

/** تست‌های نرمال‌ساز فارسی — مبنای داوری بازی‌های کلامی. */

describe('normalizePersian', () => {
  it('ی و ک عربی به فارسی تبدیل می‌شوند', () => {
    expect(normalizePersian('كتاب ياري')).toBe('کتاب یاری')
  })

  it('اعراب و کشیده حذف می‌شوند و نیم‌فاصله می‌ماند', () => {
    expect(normalizePersian('مَدرَســـه\u200cها')).toBe('مدرسه\u200cها')
  })

  it('variantهای الف و همزه یکسان می‌شوند', () => {
    expect(normalizePersian('آب')).toBe('اب')
    expect(normalizePersian('أإا')).toBe('ااا')
    expect(normalizePersian('ؤ')).toBe('و')
  })

  it('فاصله‌های تکراری و لبه‌ها پاک می‌شوند', () => {
    expect(normalizePersian('  دو   دو  ')).toBe('دو دو')
  })

  it('متن خالی → خالی', () => {
    expect(normalizePersian('')).toBe('')
    expect(normalizePersian('   ')).toBe('')
  })
})

describe('persianEquals', () => {
  it('برابری با نویسه‌های متفاوت اما هم‌ارز', () => {
    expect(persianEquals('كتاب', 'کتاب')).toBe(true)
    expect(persianEquals('مدرسه‌ها', 'مدرسه\u200cها')).toBe(true)
    expect(persianEquals('کتاب', 'قلم')).toBe(false)
  })
})

describe('countPersianWords', () => {
  it('نیم‌فاصله جزء واژه است، نه جداکننده', () => {
    expect(countPersianWords('مادرم می‌رود')).toBe(2)
    expect(countPersianWords('می‌روم')).toBe(1)
  })

  it('نشانه‌های انتها و فاصله‌های اضافه اثر ندارند', () => {
    expect(countPersianWords('برف آمد.')).toBe(2)
    expect(countPersianWords('  سلام   دنیا  ')).toBe(2)
    expect(countPersianWords('')).toBe(0)
  })
})
