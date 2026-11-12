/**
 * باز کردن IndexedDB با ساختار نسخه ۳ و مهاجرت‌های آینده.
 * استورها مطابق سند معماری: exercise_sessions، trial_events،
 * exercise_settings، user_preferences، schema_meta — از نسخه ۲:
 * training_plans (برنامه تمرینی روزانه، کلید = تاریخ ISO محلی) و
 * از نسخه ۳: program_runs (اجراهای زنجیره‌ای برنامه، کلید = id یکتا).
 */

export const DB_NAME = 'cognitive-training-lab'
export const DB_VERSION = 3

export const STORES = {
  exerciseSessions: 'exercise_sessions',
  trialEvents: 'trial_events',
  exerciseSettings: 'exercise_settings',
  userPreferences: 'user_preferences',
  schemaMeta: 'schema_meta',
  trainingPlans: 'training_plans',
  programRuns: 'program_runs',
} as const

export function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
  })
}

export function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'))
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'))
  })
}

function createStores(db: IDBDatabase): void {
  const sessions = db.createObjectStore(STORES.exerciseSessions, { keyPath: 'id' })
  sessions.createIndex('by_exercise', 'exerciseId', { unique: false })
  sessions.createIndex('by_started', 'startedAt', { unique: false })

  const trials = db.createObjectStore(STORES.trialEvents, { keyPath: 'id' })
  trials.createIndex('by_session', 'sessionId', { unique: false })

  db.createObjectStore(STORES.exerciseSettings, { keyPath: 'exerciseId' })
  db.createObjectStore(STORES.userPreferences, { keyPath: 'key' })
  db.createObjectStore(STORES.schemaMeta, { keyPath: 'key' })
}

/**
 * باز کردن (یا ساختن) دیتابیس با migrations.
 * کارخانه IDB قابل تزریق است تا تست‌ها از fake-indexeddb استفاده کنند.
 */
export function openDatabase(
  indexedDBFactory: IDBFactory = globalThis.indexedDB,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!indexedDBFactory) {
      reject(new Error('IndexedDB در این محیط در دسترس نیست'))
      return
    }
    const request = indexedDBFactory.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = request.result
      // مهاجرت‌ها نسخه‌دار هستند؛ oldVersion نسخه قبلی دیتابیس است.
      // نسخه ۱: همه استورهای پایه (نصب تازه یا ارتقا از ۰)
      if (db.objectStoreNames.contains(STORES.exerciseSessions) === false) {
        createStores(db)
      }
      // نسخه ۲: استور برنامه تمرینی — فقط هنگام ارتقا از <۲ یا نصب تازه
      if (event.oldVersion < 2 && db.objectStoreNames.contains(STORES.trainingPlans) === false) {
        db.createObjectStore(STORES.trainingPlans, { keyPath: 'date' })
      }
      // نسخه ۳: استور اجراهای برنامه (زنجیرهٔ خودکار) — کلید id یکتا؛
      // یک روز می‌تواند چند اجرا داشته باشد (شروع دوباره)
      if (event.oldVersion < 3 && db.objectStoreNames.contains(STORES.programRuns) === false) {
        const runs = db.createObjectStore(STORES.programRuns, { keyPath: 'id' })
        runs.createIndex('by_date', 'date', { unique: false })
      }
      const meta = request.transaction?.objectStore(STORES.schemaMeta)
      meta?.put({ key: 'schema_version', value: DB_VERSION })
    }
    request.onsuccess = () => {
      const db = request.result
      db.onversionchange = () => db.close()
      resolve(db)
    }
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'))
    request.onblocked = () => reject(new Error('IndexedDB open blocked (تب دیگری دیتابیس را قفل کرده)'))
  })
}

/** فقط برای تست‌ها: حذف کامل دیتابیس */
export function deleteDatabase(
  indexedDBFactory: IDBFactory = globalThis.indexedDB,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDBFactory.deleteDatabase(DB_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error ?? new Error('IndexedDB delete failed'))
  })
}
