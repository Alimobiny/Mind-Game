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

فهرست اصلی سه نمای گروه‌بندی دارد (سوییچ بالای فهرست): **حوزهٔ شناختی** (پیش‌فرض) · **نوع تمرین** (جنس تکلیف: عددی/کلامی/دیداری/فضایی/واکنشی/منطقی — `EXERCISE_TYPES` در `core/types/taxonomy.ts`) · **اثر شناختی** (هر بازی زیر اثر اصلی‌اش؛ اثرهای فرعی به‌صورت چیپ روی کارت). هر تمرین در متادیتای خود `exerciseType` و `effects` (اولین = اصلی) دارد که Registry اعتبارسنجی‌شان می‌کند — افزودن بازی جدید یعنی تعیین این دو فیلد هم (نگاه کنید به `core/registry/taxonomy.test.ts`).

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

1. پوشه `src/modules/<domain>/games/<game>/` با `engine.ts` (خالص) + `*.tsx` (UI) + تست قطعی + `meta.ts` (متادیتای فارسی)
2. `configForDifficulty(difficulty)` در همان engine
3. ثبت در `src/modules/index.ts` (registry + `createExerciseConfig`) و یک case در `renderGame` داخل `src/pages/ExercisePage.tsx`
4. GameShell بدون تغییر، اجرا و ذخیره‌سازی را انجام می‌دهد
5. **گاردهای الزامی کامپوننت** (درس‌های باگ‌یابی نشست ۲): قفل `submittedRef` علیه double-fire · عدم `advance` پس از `result.sessionCompleted` · همه تایمرها در `timeoutsRef` با پاک‌سازی
6. افزودن زمان تقریبی هر مرحله به `src/core/program/time-estimation.ts` (وگرنه پیش‌فرض ۱۰ث برای بودجهٔ برنامه روزانه بیش‌برآورد می‌شود)

## تمرین‌های فعال (۳۷ بازی در ۸ حوزه شناختی)

| بازی | حوزه | الگوی تعاملی |
| --- | --- | --- |
| توالی اعداد (Number Sequence) | حافظه کاری | نمایش متوالی → بازسازی ترتیب |
| ان-بک (N-Back) | حافظه کاری | تشخیص تطابق با N مرحله قبل |
| ان-بک دوگانه (Dual N-Back) | حافظه کاری | دو جریان هم‌زمان حرف+مکان با دکمهٔ تطبیق جداگانه |
| دهانهٔ عملیاتی (Operation Span) | حافظه کاری | نگه‌داری واژه‌ها زیر تداخل قضاوت‌های محاسبه + بازیابی ترتیبی |
| دهانهٔ جاری (Running Span) | حافظه کاری | جریان ارقام با پایان پیش‌بینی‌ناپذیر → ورود چند رقم آخر |
| ان-بک دوگانهٔ شنیداری (Dual N-Back Auditory) | حافظه کاری | جریان حرف با صدای محلی + مکان دیداری (fallback دیداری خودکار) |
| برو/نرو (Go/No-Go) | توجه و مهار | واکنش/مهار در جریان پیوسته |
| استرووپ (Stroop) | توجه و مهار | انتخاب رنگ جوهر با وجود تداخل کلمه |
| جابه‌جایی تکلیف (Task Switching) | توجه و مهار | دسته‌بندی بر اساس نشانهٔ بُعد + سنجهٔ هزینهٔ جابه‌جایی |
| تداخل مکانی (Simon Task) | توجه و مهار | پاسخ فقط به رنگ با وجود تداخل مکان محرک |
| پلک توجه (Attentional Blink) | توجه و مهار | جریان سریع حروف + بازیابی دو هدف رنگی با وقفه‌های متغیر |
| محاسبه ×۲۰ (Calculation × 20) | سرعت پردازش | ۲۰ سؤال حساب بدون مهلت منفرد |
| محاسبه ×۱۰۰ (Calculation × 100) | سرعت پردازش | ۱۰۰ سؤال پیوسته با بازخورد فلش کوتاه |
| شمارش معکوس پیوسته (Continuous Countdown) | سرعت پردازش | تفریق زنجیره‌ای حفظی → ورود باقیمانده نهایی |
| عملگر گم‌شده (Missing Operator) | سرعت پردازش | انتخاب عملگر برقرارکنندهٔ معادله (تک‌راه‌حلی) |
| مقایسه اعداد (Number Comparison) | سرعت پردازش | انتخاب عدد بزرگ‌تر با فاصلهٔ عددی کنترل‌شده |
| جمع زنجیره‌ای گام‌دار (PASAT) | سرعت پردازش | جمع هر رقم با رقم قبل در ریتم زمان‌بندی‌شده |
| شبکه حافظه (Memorise Grid) | دیداری-فضایی | بازسازی مجموعه خانه‌ها |
| توالی مکانی (Spatial Sequence) | دیداری-فضایی | بازسازی ترتیب خانه‌ها |
| دنبال‌کردن اشیا (Object Tracking) | دیداری-فضایی | ردیابی اهداف متحرک روی Canvas (اولین بازی Canvas) |
| چرخش ذهنی (Mental Rotation) | دیداری-فضایی | قضاوت یکسان/آینه‌ای شکل چرخیده |
| ساعت آینه‌ای (Mirror Clock) | دیداری-فضایی | خوانش زمان واقعی از ساعت آینه‌شده |
| ارتفاع بلوک‌ها (Block Height) | دیداری-فضایی | شمارش کل بلوک‌ها با استنتاج پنهان‌ها |
| دهانهٔ تقارن (Symmetry Span) | دیداری-فضایی | نگه‌داری مکان خانه‌ها زیر تداخل قضاوت تقارن + بازیابی ترتیبی |
| تشخیص تغییر (Change Detection) | دیداری-فضایی | دوداوری تغییر رنگ در آرایهٔ دوباره‌نمایش‌داده‌شده + تخمین ظرفیت k |
| زمان واکنش (Reaction Time) | حسی-حرکتی | تپ سریع پس از محرک ناگهانی + شناسایی پیش‌دستی |
| حافظه واژه‌ها (Word Memory) | زبانی | مطالعه واژه‌ها → بازیابی از میان حواس‌پرتی‌ها |
| شمارش هجا (Syllable Counting) | زبانی | شمارش هجای جمله با بانک محتوای از پیش اعتبارسنجی‌شده |
| بلندخوانی (Reading Aloud) | زبانی | خواندن خودتنظیم متن + سنجش سرعت و فهم — بدون میکروفون |
| واژهٔ به‌هم‌ریخته (Word Scramble) | زبانی | بازسازی واژه از حروف جابه‌جا (+ حرف فریب در سطوح بالا) |
| یادآوری شنیداری (Audio Recall) | زبانی | شنیدن/دیدن توالی واژه‌ها و بازیابی به همان ترتیب |
| ترکیب واژه (Word Blend) | زبانی | شنیدن قطعات واژه و ترکیب ذهنی آن — نخستین بازی صوتی |
| منطق توالی (Sequence Logic) | استدلال | کشف قاعده توالی → انتخاب ادامه |
| تکمیل الگو (Pattern Completion) | استدلال | ماتریس ۳×۳ با قاعده سطر/ستون |
| ماتریس پیشرونده (Progressive Matrices) | استدلال | ماتریس ۳×۳ چندقاعده‌ای ریون (توزیع سه‌تایی/پیشروی/عمل منطقی/موقعیتی) |
| کارت‌بندی قاعده (Rule Discovery) | استدلال | کشف قاعدهٔ پنهان رنگ/شکل/تعداد از بازخورد + انعطاف پس از تعویض |
| حافظهٔ انجمنی (Associative Pairs) | حافظه بلندمدت | مطالعهٔ جفت واژه → آزمون بازیابی (+ یادآوری دوباره در سطح ۳+) |

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
