# آزمایشگاه تمرین شناختی — Cognitive Training Lab

وب‌اپلیکیشن ماژولار تمرین‌های شناختی، الهام‌گرفته از تمرین‌های مستند ریوتا کاواشیما — بدون استفاده از نام، برند یا دارایی بصری هیچ محصول تجاری.

> ⚠️ این تمرین‌ها ابزار تمرین ذهنی هستند. ادعای اثر بالینی، پیشگیری از بیماری یا افزایش هوش عمومی ندارند. سرعت/دقت نمایش‌داده‌شده فقط عملکرد در همان تمرین را نشان می‌دهد.

## اجرا

### آنلاین (GitHub Pages)

نسخهٔ منتشرشده: **[alimobiny.github.io/Mind-Game](https://alimobiny.github.io/Mind-Game/)** — با هر push به `main`، گردشکار `.github/workflows/deploy-pages.yml` به‌طور خودکار build می‌گیرد و مستقر می‌کند (با `base: /Mind-Game/` و fallback فایل `404.html` برای روتینگ SPA).

> 💡 دادهٔ IndexedDB به‌ازای هر origin جدا است: دادهٔ نسخهٔ آنلاین با دادهٔ نسخهٔ localhost یکی نیست — برای جابه‌جایی از Export/JSON (بخش «پشتیبان‌گیری و انتقال داده») استفاده کنید.

### دسکتاپ (ویندوز)

- **فایل exe (پیشنهادی):** `npm run desktop:build` → در `release/` فایل **Setup** نصب‌شوندهٔ یک‌کلیکی (بدون CMD، میانبر منوی استارت). راهنمای کامل: `docs/DESKTOP-APP.md`.
- **حالت توسعه:** دوبارکلیک روی **`start-game.bat`** — سرور بی‌صدا بالا می‌آید و بازی در مرورگر باز می‌شود. راهنما: `docs/DESKTOP-LAUNCHER.md`.

### خط فرمان

```bash
npm install
npm run dev        # اجرای توسعه روی http://localhost:5173
npm test           # تست‌های unit + integration + کامپوننت (Vitest)
npm run build      # بررسی نوع + ساخت نسخه نهایی
npm run e2e        # تست‌های مرورگر (Playwright — نیازمند Chrome نصب‌شده)
npm run desktop:build  # آیکون + بیلد نسبی + electron-builder → release/ (exe ویندوز)
```

نکتهٔ استقرار: build محلی بدون `DEPLOY_BASE` با base `/` ساخته می‌شود؛ CI مقدار `DEPLOY_BASE=/Mind-Game/` و دسکتاپ `DEPLOY_BASE=./` را می‌دهد.

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
│   ├── program/     # منطق خالص برنامه تمرینی روزانه (تولید قطعی برنامه)
│   └── registry/    # Game Registry
├── data/            # IndexedDB (استورها + migration) + repositoryها + in-memory
├── modules/         # سی‌ویک تمرین — منطق (engine خالص) جدا از UI
│   ├── working-memory/games/{number-sequence, n-back, dual-n-back, operation-span}/
│   ├── attention-control/games/{go-no-go, stroop, task-switching}/
│   ├── processing-speed/games/{calculation-20, calculation-100, continuous-countdown, missing-operator, number-comparison, pasat}/
│   ├── visual-spatial/games/{memorise-grid, spatial-sequence, object-tracking, mental-rotation, mirror-clock, block-height, symmetry-span}/
│   ├── sensorimotor/games/reaction-time/
│   ├── verbal-auditory/games/{word-memory, syllable-counting, reading-aloud, word-scramble, audio-recall, word-blend}/
│   ├── verbal-auditory/audio/ # پوشش گفتار کاملاً محلی (SpeechSynthesis دستگاه)
│   ├── reasoning/games/{sequence-logic, pattern-completion, rule-discovery-card-sorting}/
│   ├── long-term-memory/games/associative-pairs/
│   └── shared/      # اسکلت مشترک دهانهٔ مرکب (امتیاز اعتبار جزئی و …)
├── components/game/ # GameShell مشترک: دستورالعمل → شمارش معکوس → بازی → نتایج
├── components/icons/ # نشان‌های SVG: لوگو، هشت حوزه، شش نوع تمرین، گلیف‌های UI
├── pages/           # Home / Exercise / Program / Journey / Reports
└── analytics/       # تجمیع داشبورد و سیر پیشرفت از داده خام
```

## صدا در بازی‌های شنیداری — کاملاً محلی

بازی‌های صوتی (ترکیب واژه، یادآوری شنیداری و بعداً ان-بک شنیداری) از `SpeechSynthesis` خود مرورگر استفاده می‌کنند: صدا را موتور نصب‌شدهٔ همان دستگاه می‌سازد. هیچ سرویس ابری، کلید API، هزینه یا تبدیل گفتار-به-متن وجود ندارد و همه‌چیز آفلاین کار می‌کند. اگر دستگاه صدای فارسی نداشته باشد، بازی خودکار به «جبران نمایشی» می‌رود (آیتم‌ها به‌جای شنیدن دیده می‌شوند) تا روی هر دستگاهی قابل اجرا بماند — پیاده‌سازی در `src/modules/verbal-auditory/audio/speech.ts`.

## طبقه‌بندی و دسترسی به تمرین‌ها

فهرست اصلی چهار نمای گروه‌بندی دارد (سوییچ بالای فهرست): **حوزهٔ شناختی** (پیش‌فرض) · **نوع تمرین** (جنس تکلیف: عددی/کلامی/دیداری/فضایی/واکنشی/منطقی — `EXERCISE_TYPES` در `core/types/taxonomy.ts`) · **اثر شناختی** (هر بازی زیر اثر اصلی‌اش؛ اثرهای فرعی به‌صورت چیپ روی کارت) · **خانوادهٔ پارادایمی** (مکتب پژوهشی بازی — ان-بک، دهانهٔ مرکب، کورسی، Luck & Vogel و… — `EXERCISE_FAMILIES` در همان فایل). هر تمرین در متادیتای خود `exerciseType`، `family` و `effects` (اولین = اصلی) دارد که Registry اعتبارسنجی‌شان می‌کند (نگاه کنید به `core/registry/taxonomy.test.ts`). جست‌وجوی فهرست علاوه بر نام/شرح فارسی، نام انگلیسی (`nameEn`)، شناسه، برچسب خانواده و کلیدواژه‌ها (`keywordsFa`) را هم می‌پوشاند.

**فهرست مرجع بازی‌ها** (۳۷ بازی با خانواده/نوع/اثرها/متریک‌ها) در `docs/GAMES-CATALOG.md` — تولیدشده از روی کاتالوگ رجیستری با `npm run catalog`؛ تست `catalog-doc` drift فایل را می‌گیرد.

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

1. پوشه `src/modules/<domain>/games/<game>/` با `engine.ts` (خالص) + `*.tsx` (UI) + تست قطعی + `meta.ts` (**متادیتای کامل `ExerciseMeta`** شامل id/version/contentVersion، خانواده، نام انگلیسی و کلیدواژه‌ها)
2. `configForDifficulty(difficulty)` در همان engine
3. ثبت در `src/modules/catalog.ts` (متا + id در `ExerciseId`/`ALL_EXERCISE_IDS`)، یک خط در نقشهٔ `DEFINITIONS` و یک case در `createExerciseConfig` (هر دو در `src/modules/index.ts`)، و یک loader در `GAME_LOADERS` داخل `src/pages/ExercisePage.tsx` — تایپ `Record<ExerciseId, …>` جاماندن هر مورد را در زمان کامپایل خطا می‌دهد
4. `npm run catalog` برای بازتولید `docs/GAMES-CATALOG.md` (تست drift پاس نشود)
5. GameShell بدون تغییر، اجرا و ذخیره‌سازی را انجام می‌دهد
6. **گاردهای الزامی کامپوننت** (درس‌های باگ‌یابی نشست ۲، همه در `useTrialGuards`): قفل پاسخ علیه double-fire (بازشدن قفل روی ردِ ذخیره‌سازی) · عدم `advance` پس از `result.sessionCompleted` · تایمرهای ردیابی‌شده با پاک‌سازی + re-arm مهلت پس از rollback (سقف ۲/۳ث)
7. افزودن زمان تقریبی هر مرحله به `src/core/program/time-estimation.ts` (وگرنه پیش‌فرض ۱۰ث برای بودجهٔ برنامه روزانه بیش‌برآورد می‌شود)

## تمرین‌های فعال (۳۷ بازی در ۸ حوزه شناختی)

فهرست کامل و همیشه‌به‌روز بازی‌ها — نام فارسی/انگلیسی، شناسه، خانوادهٔ پارادایمی،
نوع، اثرها، سطح‌ها، مراحل و متریک‌های هر بازی — در
**[`docs/GAMES-CATALOG.md`](docs/GAMES-CATALOG.md)** (تولیدشده از روی رجیستری با `npm run catalog`).

چکیدهٔ حوزه‌ها: حافظهٔ کاری (۶) · توجه و کنترل اجرایی (۵) · سرعت پردازش و محاسبه (۶) ·
زبان و پردازش کلامی (۶) · حافظه دیداری-فضایی (۸) · استدلال (۴) · حسی-حرکتی (۱) · حافظه بلندمدت (۱).

## دشواری تطبیقی (Rule-Based)

قوانین (قابل ردیابی از داده خام جلسات — بدون ذخیره وضعیت جداگانه):
- جلسه «موفق» = دقت ≥ ۸۰٪ در سطح پیشنهادیِ آن زمان
- **افزایش:** ۳ روز تقویمی متوالی با ≥۱ جلسه موفق → سطح +۱ (تا ۵)
- **کاهش:** روز تمرین با بهترین دقت < ۵۰٪ → سطح −۱ (تا ۱)
- روز بی‌تمرین یا فقط سطح دستی → رکورد می‌شکند، سطح ثابت
- سطح پیشنهادی در صفحه هر بازی پیش‌فرض انتخاب است (badge «پیشنهادی»)؛ تغییر دستی مجاز ولی در ارزیابی لحاظ نمی‌شود

محاسبه: `src/core/difficulty/adaptive-difficulty.ts` — تابع خالص روی `SessionRecord`ها.

## برنامه امروز من (برنامه تمرینی روزانه)

صفحهٔ `/program` هر روز ۳–۴ بازی با مجموع ~۱۵–۲۰ دقیقه پیشنهاد می‌دهد — قواعد طراحی مبتنی بر `docs/SCIENTIFIC-VALIDATION.md`:
- چرخش هفتگی قطعی (seed از تاریخ): هر ۷ حوزه در هر هفته یک‌بار «لنگر روز» می‌شود
- فاصله‌گذاری: بازی روز قبل در همان حوزه تکرار نمی‌شود (مگر بدون جایگزین)
- سطح هر پیشنهاد = سطح پیشنهادی دشواری تطبیقی همان بازی
- وضعیت «انجام‌شده» از خود جلسات همان روز مشتق می‌شود (بدون دوباره‌نویسی)
- استور `training_plans` (کلید = تاریخ ISO، IndexedDB نسخه ۲) — برنامه کاملاً بازتولیدپذیر است و در فایل پشتیبان نیازی به همراهی ندارد

**اجرای خودکار زنجیره‌ای:** دکمهٔ «شروع خودکار برنامه» در `/program` زنجیرهٔ تمرین‌های در انتظار را اجرا می‌کند — انتخاب سطح از آیتم طرح، پرش از صفحهٔ انتخاب سطح، آغاز خودکار هر تمرین پس از شمارش کوتاه (دستورالعمل می‌ماند) و پس از هر جلسه، شمارش تا تمرین بعد با دکمه‌های «همین حالا» و «توقف زنجیره». پایان برنامه: کارت خلاصه با زمان کل و میانگین دقت. هر اجرا در استور `program_runs` (کلید id یکتا + ایندکس تاریخ، IndexedDB نسخه ۳) ثبت می‌شود — زمان دیواری کل، جلسات لینک‌شده و وضعیت (کامل/نیمه‌کاره) — و کارت تحلیل آن در صفحهٔ برنامه می‌آید. رفرش وسط زنجیره، اجرای باز را ادامه می‌دهد.

منطق خالص: `src/core/program/` · صفحه: `src/pages/ProgramPage.tsx`

## پشتیبان‌گیری و انتقال داده

صفحه «گزارش‌ها» → خروجی JSON از همه جلسات و رویدادهای خام + اجراهای برنامهٔ روزانه (نسخهٔ ساختار ۲؛ پشتیبان‌های نسخهٔ ۱ هم پذیرفته می‌شوند) + بازیابی روی دستگاه دیگر (ادغام بدون حذف، idempotent). برای محافظت از پیشرفت در برابر پاک‌شدن مرورگر یا تعویض دستگاه.

## تست‌ها

| لایه | ابزار | پوشش |
| --- | --- | --- |
| Unit | Vitest | RNG، ماشین حالت، تایمر، scoring، دشواری تطبیقی، برنامه روزانه، هر ۲۱ engine |
| Integration | Vitest + fake-indexeddb | repositoryها (شامل migration نسخه ۲ و ۳)، Session Manager، GameShell، Export/Import |
| E2E | Playwright (Chrome سیستم) | مسیر کامل بازی‌ها + ماندگاری + انتقال کامل داده + سناریوهای QA (تپ مضاعف، خروج، visibility، روز ضعیف، ایمپورت خراب، viewport، رفرش) |

نکته E2E: دانلود مرورگر از CDN پلی‌رایت در برخی لوکیشن‌ها مسدود است؛ کانفیگ از Chrome نصب‌شده سیستم (`channel: 'chrome'`) استفاده می‌کند.
