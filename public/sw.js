/* eslint-disable */
// Service Worker سبکِ «کش-اول» — کاملاً محلی، بدون هیچ سرویس بیرونی.
// assetهای هش‌دار (JS/CSS/فونت) پس از اولین دانلود برای همیشه offline
// می‌شوند؛ HTML/ناوبری تازه می‌آید و در fallback از کش پاسخ می‌گیرد.
// نسخهٔ کش: با هر تغییر معنادار، عدد VERSION را بالا ببرید تا activate
// کش قدیمی را پاک کند.

const CACHE_VERSION = 'mind-game-v2'
const CACHE_NAME = CACHE_VERSION

self.addEventListener('install', (event) => {
  // نصب را بدون انتظار precache تمام می‌کنیم — runtime cache بقیه را می‌گیرد
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(
        names.filter((name) => name.startsWith('mind-game-') && name !== CACHE_NAME).map((name) => caches.delete(name)),
      )
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  // فقط assetهای هم‌مبدأ؛ cross-origin هرگز لمس نمی‌شود
  if (url.origin !== self.location.origin) return

  // ناوبری (HTML): شبکه-اول با fallback کش — نسخهٔ جدید انتشار بی‌درنگ دیده می‌شود
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request)
          const cache = await caches.open(CACHE_NAME)
          cache.put(request, fresh.clone())
          return fresh
        } catch {
          const cached = (await caches.match(request)) || (await caches.match('/'))
          return cached || Response.error()
        }
      })(),
    )
    return
  }

  // asset: کش-اول (هش‌دارها تغییر نام می‌دهند؛ بی‌درنگ معتبرند)
  event.respondWith(
    (async () => {
      const cached = await caches.match(request)
      if (cached) return cached
      try {
        const fresh = await fetch(request)
        if (fresh.ok) {
          const cache = await caches.open(CACHE_NAME)
          cache.put(request, fresh.clone())
        }
        return fresh
      } catch {
        return Response.error()
      }
    })(),
  )
})
