/**
 * زیرساخت گفتار — کاملاً محلی و آفلاین.
 *
 * تنها ابزار صوتی: SpeechSynthesis خود مرورگر که صدا را موتور نصب‌شدهٔ
 * «همان دستگاه» می‌سازد (مانند narator ویندوز). هیچ درخواست شبکه‌ای،
 * هیچ سرویس ابری، هیچ کلید API و هیچ هزینه‌ای در کار نیست — و تبدیل
 * گفتار به متن (SpeechRecognition) عمداً استفاده نمی‌شود.
 *
 * قرارداد بازی‌ها: موتورها خالص می‌مانند (محرک = متن)؛ فقط کامپوننت
 * از این پوشش استفاده می‌کند و در نبود صدای فارسی به «جبران نمایشی»
 * می‌رود (آیتم به‌جای شنیدن دیده می‌شود) تا بازی روی هر دستگاهی کار کند.
 */

export interface SpeakOptions {
  /** سرعت گفتار — ۱ عادی؛ برای تمرین‌های شنیداری آهسته‌تر (۰٫۸-۰٫۹) */
  readonly rate?: number
  /** صدازدن پس از پایان گفتار (به best-effort؛ اگر رویداد نیامد، تایمر پشتیبان) */
  readonly onEnd?: () => void
}

export interface SpeechController {
  /** آیا مرورگر SpeechSynthesis دارد */
  readonly supported: boolean
  /** آیا صدای فارسی (fa-IR یا fa) در دسترس است */
  readonly persianVoiceAvailable: boolean
  /** خواندن متن با صدای دستگاه — اگر پشتیبانی نبود بی‌اثر */
  speak(text: string, options?: SpeakOptions): void
  /** قطع گفتار در حال پخش (پاک‌سازی در unmount/تغییر مرحله) */
  cancel(): void
}

/** پیدا کردن صدای فارسی از فهرست صداهای دستگاه */
function pickPersianVoice(voices: readonly SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const fa = voices.filter((v) => v.lang?.toLowerCase().startsWith('fa'))
  if (fa.length > 0) return fa[0] as SpeechSynthesisVoice
  // بعضی سیستم‌ها زبان را خالی یا با نام فارسی ثبت می‌کنند
  return voices.find((v) => /persian|farsi/i.test(v.name)) ?? null
}

/**
 * ساخت کنترلر گفتار. `sync` فقط در تست‌ها false می‌شود تا بدون رویداد
 * voiceschanged هم رفتار قطعی بماند.
 */
export function createSpeechController(sync = true): SpeechController {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined
  const hasApi = synth !== undefined && typeof SpeechSynthesisUtterance !== 'undefined'

  let persianVoice: SpeechSynthesisVoice | null = null
  let resolved = false

  const resolveVoice = (): void => {
    if (!synth || resolved) return
    const voices = synth.getVoices()
    if (voices.length > 0) {
      persianVoice = pickPersianVoice(voices)
      resolved = true
    }
  }

  if (hasApi && synth) {
    resolveVoice()
    if (!resolved && sync) {
      // کروم فهرست صداها را async می‌دهد — یک بار منتظر رویداد می‌مانیم
      synth.addEventListener?.('voiceschanged', resolveVoice, { once: true })
    }
  }

  return {
    supported: hasApi,
    get persianVoiceAvailable() {
      if (!hasApi) return false
      resolveVoice()
      return persianVoice !== null
    },
    speak(text: string, options: SpeakOptions = {}) {
      if (!hasApi || !synth) return
      synth.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'fa-IR'
      if (persianVoice) utterance.voice = persianVoice
      utterance.rate = options.rate ?? 1
      if (options.onEnd) {
        let fired = false
        const fire = () => {
          if (fired) return
          fired = true
          options.onEnd?.()
        }
        utterance.onend = fire
        utterance.onerror = fire
        // پشتیبان: اگر رویداد پایان در بازهٔ سخنران‌طور نیامد (بعضی موتورها
        // رویداد نمی‌دهند)، تخمین زمانی پیش می‌رود تا بازی قفل نشود
        const fallbackMs = Math.max(1200, text.length * 130) / (options.rate ?? 1)
        window.setTimeout(fire, fallbackMs)
      }
      synth.speak(utterance)
    },
    cancel() {
      synth?.cancel()
    },
  }
}

/**
 * راه حالت ارائهٔ بازی‌های صوتی: گفتار دستگاه یا جبران نمایشی.
 * تصمیم یک‌بار در شروع بازی گرفته می‌شود تا رفتار مرحله‌ها یکنواخت بماند.
 */
export type PresentationMode = 'speech' | 'visual'

export function resolvePresentationMode(speech: SpeechController): PresentationMode {
  return speech.supported && speech.persianVoiceAvailable ? 'speech' : 'visual'
}
