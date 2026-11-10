# آزمایشگاه تمرین شناختی — Cognitive Training Lab

وب‌اپلیکیشن ماژولار تمرین‌های شناختی، الهام‌گرفته از تمرین‌های مستند ریوتا کاواشیما — بدون استفاده از نام، برند یا دارایی بصری هیچ محصول تجاری.

> ⚠️ این تمرین‌ها ابزار تمرین ذهنی هستند. ادعای اثر بالینی، پیشگیری از بیماری یا افزایش هوش عمومی ندارند. سرعت/دقت نمایش‌داده‌شده فقط عملکرد در همان تمرین را نشان می‌دهد.

## اجرا

```bash
npm install
npm run dev        # اجرای توسعه روی http://localhost:5173
npm test           # تست‌های unit + integration + کامپوننت (Vitest)
npm run build      # بررسی نوع + ساخت نسخه نهایی
npm run e2e        # تست‌های مرورگر (Playwright — نیازمند Chrome نصب‌شده)
```

## معماری (تصمیمات قفل‌شده MVP)

- **Modular Monolith** — React 18 + TypeScript strict + Vite
- **Local-first** — IndexedDB، بدون backend؛ داده‌ها فقط روی دستگاه کاربر
- **PWA-ready** — manifest آماده است؛ Service Worker فاز بعدی
- **فارسی / RTL** — رابط کامل راست‌چین با فونت Vazirmatn (باندل‌شده)
- **Mobile-first** — طراحی لمسی؛ اهداف لمس ≥ ۴۸px

## ساختار

```
src/
├── core/            # زیرساخت مشترک مستقل از UI
│   ├── types/       # قرارداد ExerciseDefinition، مدل‌های دامنه
│   ├── session/     # ماشین حالت + Session Manager
│   ├── timer/       # تایمر performance.now با مدیریت pause
│   ├── scoring/     # تجمیع مشترک (دقت، میانه RT)
│   ├── randomization/  # RNG قطعی mulberry32 + deriveTrialSeed
│   └── registry/    # Game Registry
├── data/            # IndexedDB (استورها + migration) + repositoryها + in-memory
├── modules/         # هشت تمرین — منطق (engine خالص) جدا از UI
│   ├── working-memory/games/{number-sequence, n-back}/
│   ├── attention-control/games/{go-no-go, stroop}/
│   ├── processing-speed/games/calculation-20/
│   ├── visual-spatial/games/{memorise-grid, spatial-sequence}/
│   └── sensorimotor/games/reaction-time/
├── components/game/ # GameShell مشترک: دستورالعمل → شمارش معکوس → بازی → نتایج
├── pages/           # Home / Exercise / Reports
└── analytics/       # تجمیع داشبورد از داده خام
```

## قرارداد بازی (Exercise Definition)

هر تمرین یک object خالص (بدون React) پیاده می‌کند:

```ts
interface ExerciseDefinition<Config, State, Trial, Answer> {
  id; version; contentVersion; domain
  createSession(sessionId, config, seed): State
  nextTrial(state): { state, trial }
  submitAnswer(state, answer | null, reactionTimeMs): State  // null = انقضای مهلت
  isComplete(state): boolean
  getSummary(state): ExerciseSummary  // معیارهای اختصاصی در metrics
}
```

- محرک‌ها با `SeededRandom(mulberry32)` و `deriveTrialSeed(sessionSeed, trialIndex)` → بازتولیدپذیر
- هر پاسخ به‌صورت `TrialEvent` خام (محرک، پاسخ موردانتظار/واقعی، outcome، RT، دشواری) ذخیره می‌شود
- `submitAnswer` تکراری در Session Manager رد می‌شود (id یکتا `sessionId:trialIndex` در DB)
- تغییر فاز جلسه فقط از مسیر ماشین حالت: IDLE→READY→COUNTDOWN→ACTIVE→COMPLETED/ABORTED (+PAUSED)
- مخفی‌شدن tab → PAUSE خودکار؛ زمان pause در elapsed/RT لحاظ نمی‌شود
- جلسات ناتمام اجرای قبلی در بوت به aborted علامت می‌خورند

## افزودن بازی جدید

1. پوشه `src/modules/<domain>/games/<game>/` با `engine.ts` (خالص) + `*.tsx` (UI) + تست
2. `configForDifficulty(difficulty)` در همان engine
3. ثبت در `src/modules/index.ts` (registry + متادیتای فارسی + `createExerciseConfig`)
4. GameShell بدون تغییر، اجرا و ذخیره‌سازی را انجام می‌دهد

## تمرین‌های فعال (۸ بازی در ۵ حوزه)

| بازی | حوزه | الگوی تعاملی |
| --- | --- | --- |
| توالی اعداد (Number Sequence) | حافظه کاری | نمایش متوالی → بازسازی ترتیب |
| ان-بک (N-Back) | حافظه کاری | تشخیص تطابق با N مرحله قبل |
| برو/نرو (Go/No-Go) | توجه و مهار | واکنش/مهار در جریان پیوسته |
| استرووپ (Stroop) | توجه و مهار | انتخاب رنگ جوهر با وجود تداخل کلمه |
| محاسبه ×۲۰ (Calculation × 20) | سرعت پردازش | ۲۰ سؤال حساب بدون مهلت منفرد |
| شبکه حافظه (Memorise Grid) | دیداری-فضایی | بازسازی مجموعه خانه‌ها |
| توالی مکانی (Spatial Sequence) | دیداری-فضایی | بازسازی ترتیب خانه‌ها |
| زمان واکنش (Reaction Time) | حسی-حرکتی | تپ سریع پس از محرک ناگهانی + شناسایی پیش‌دستی |

## تست‌ها

| لایه | ابزار | پوشش |
| --- | --- | --- |
| Unit | Vitest | RNG، ماشین حالت، تایمر، scoring، هر ۸ engine |
| Integration | Vitest + fake-indexeddb | repositoryها (قرارداد یکسان IndexedDB/in-memory)، Session Manager، GameShell |
| E2E | Playwright (Chrome سیستم) | مسیر کامل هر ۸ بازی + ماندگاری داده پس از reload |

نکته E2E: دانلود مرورگر از CDN پلی‌رایت در برخی لوکیشن‌ها مسدود است؛ کانفیگ از Chrome نصب‌شده سیستم (`channel: 'chrome'`) استفاده می‌کند.
