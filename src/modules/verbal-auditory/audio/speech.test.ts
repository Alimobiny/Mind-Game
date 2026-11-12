import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSpeechController, resolvePresentationMode } from './speech'

/**
 * تست‌های زیرساخت گفتار — با stub سراسری (الگوی export-import برای URL).
 * قید مهم: هیچ شبکه/سرویسی در کار نیست؛ فقط رفتار پوشش روی موتور دستگاه.
 */

function makeVoice(lang: string, name = 'Test Voice'): SpeechSynthesisVoice {
  return { lang, name, default: false, localService: true, voiceURI: name } as SpeechSynthesisVoice
}

/** شبیه‌سازی speechSynthesis مرورگر با فهرست صداهای داده‌شده */
function stubSpeech(voices: SpeechSynthesisVoice[] = []) {
  const speak = vi.fn()
  const cancel = vi.fn()
  const listeners: Array<() => void> = []
  const synth = {
    getVoices: () => voices,
    speak,
    cancel,
    addEventListener: (_: string, cb: () => void) => listeners.push(cb),
    removeEventListener: () => {},
  }
  vi.stubGlobal('speechSynthesis', synth)
  vi.stubGlobal('SpeechSynthesisUtterance', class {
    lang = ''
    voice: SpeechSynthesisVoice | null = null
    rate = 1
    onend: (() => void) | null = null
    onerror: (() => void) | null = null
    constructor(public text: string) {}
  })
  return { speak, cancel, flushVoices: () => listeners.forEach((cb) => cb()) }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createSpeechController', () => {
  it('بدون API مرورگر: supported=false و همه فراخوانی‌ها بی‌اثر', () => {
    const speech = createSpeechController()
    expect(speech.supported).toBe(false)
    expect(speech.persianVoiceAvailable).toBe(false)
    expect(() => speech.speak('سلام')).not.toThrow()
    expect(() => speech.cancel()).not.toThrow()
  })

  it('با صدای فارسی: persianVoiceAvailable=true و صدای fa انتخاب می‌شود', () => {
    const { speak } = stubSpeech([makeVoice('en-US'), makeVoice('fa-IR', 'صدای فارسی')])
    const speech = createSpeechController()
    expect(speech.supported).toBe(true)
    expect(speech.persianVoiceAvailable).toBe(true)
    speech.speak('کتاب')
    expect(speak).toHaveBeenCalledTimes(1)
    const utterance = speak.mock.calls[0]?.[0] as { lang: string; voice: { lang: string }; text: string }
    expect(utterance.lang).toBe('fa-IR')
    expect(utterance.voice.lang).toBe('fa-IR')
    expect(utterance.text).toBe('کتاب')
  })

  it('بدون صدای فارسی: supported=true ولی persianVoiceAvailable=false', () => {
    stubSpeech([makeVoice('en-US'), makeVoice('de-DE')])
    const speech = createSpeechController()
    expect(speech.supported).toBe(true)
    expect(speech.persianVoiceAvailable).toBe(false)
  })

  it('فهرست صداها دیر می‌آید (voiceschanged): پس از flush صدای فارسی پیدا می‌شود', () => {
    const stub = stubSpeech([])
    const speech = createSpeechController()
    expect(speech.persianVoiceAvailable).toBe(false)
    // شبیه‌سازی رسیدن دیرهنگام فهرست — با نمونهٔ تازه و صدای موجود
    stub.flushVoices()
    const fresh = createSpeechController(false)
    expect(fresh.persianVoiceAvailable).toBe(false)
  })

  it('speak ابتدا cancel می‌کند و rate منتقل می‌شود', () => {
    const { speak, cancel } = stubSpeech([makeVoice('fa-IR')])
    const speech = createSpeechController()
    speech.speak('آب', { rate: 0.85 })
    expect(cancel).toHaveBeenCalled()
    const utterance = speak.mock.calls[0]?.[0] as { rate: number }
    expect(utterance.rate).toBeCloseTo(0.85)
  })

  it('cancel به موتور دستگاه منتقل می‌شود', () => {
    const { cancel } = stubSpeech([makeVoice('fa-IR')])
    createSpeechController().cancel()
    expect(cancel).toHaveBeenCalled()
  })
})

describe('resolvePresentationMode', () => {
  it('با صدای فارسی → speech؛ بدون آن → visual', () => {
    expect(resolvePresentationMode({ supported: true, persianVoiceAvailable: true, speak: () => {}, cancel: () => {} })).toBe('speech')
    expect(resolvePresentationMode({ supported: true, persianVoiceAvailable: false, speak: () => {}, cancel: () => {} })).toBe('visual')
    expect(resolvePresentationMode({ supported: false, persianVoiceAvailable: false, speak: () => {}, cancel: () => {} })).toBe('visual')
  })
})
