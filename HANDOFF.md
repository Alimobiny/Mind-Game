# سند انتقال به نشست بعد — Cognitive Training Lab

> این سند خودکفا است: نشست بعدی بدون نیاز به تاریخچه گفتگو، از همین‌جا ادامه می‌دهد.
> تاریخ تنظیم: ۲۰۲۶-۱۱-۱۲ · موضوع نشست: ارتقای بصری UI + طبقه‌بندی نوع‌تمرین/اثر

## ۱. وضعیت فعلی پروژه (خلاصه)

- **مسیر:** `E:\Mind Game` — React 18 + TypeScript strict + Vite · فارسی/RTL · Mobile-first · Local-first (IndexedDB، بدون backend)
- **گیت‌هاب:** `origin → https://github.com/Alimobiny/Mind-Game` — ویژگی‌های این نشست تا `4eb45b0` push شده‌اند. **⚠️ یک کامیت لوکالِ pushنشده بالای آن هست** («معلق‌سازی دیپلوی + HANDOFF»): توکن git فاقد دامنهٔ `workflow` بود و تغییر فایل workflow را رد کرد؛ این کامیت باید با کلاینت مجاز (VS Code / GitHub Desktop واردشده به Alimobiny، یا `git credential-manager github login` مجدد) push شود. `git pull --ff-only` در نشست بعد باید no-op بماند (local ahead 1).
- **دیپلوی Pages: معلق** (درخواست کاربر). گردش کار `.github/workflows/deploy-pages.yml` فقط `workflow_dispatch` دارد. راه‌اندازی مجدد: (۱) Settings ← Pages ← Source: «GitHub Actions» — یک‌بار دستی؛ توکن Actions اجازهٔ «ساخت» سایت را نمی‌دهد (خطای «Resource not accessible by integration»)؛ (۲) تریگر push را از کامنت خارج کنید. `start-game.bat` + `docs/DESKTOP-LAUNCHER.md` برای اجرای دسکتاپ فعال‌اند.
- **۲۱ بازی در ۷ حوزه** + برنامهٔ روزانه، دشواری تطبیقی، Export/Import، DB نسخه ۲ — پایدار
- **طبقه‌بندی جدید:** هر تمرین `exerciseType` (۶ نوع: عددی/کلامی/دیداری/فضایی/واکنشی/منطقی — `src/core/types/taxonomy.ts`) و `effects` (اثرهای شناختی؛ [0] = اصلی) دارد؛ فهرست اصلی سه نمای گروه‌بندی دارد: حوزهٔ شناختی (پیش‌فرض) / نوع تمرین / اثر شناختی.
- **UI جدید:** لوگو (`LogoMark` + `public/icons/icon.svg` گرید ۹-نقطه با گرادیان)، نشان ۷ حوزه + گلیف ۶ نوع + گلیف‌های UI (تقویم/نمودار/فلش) همه SVG درون‌خطی در `src/components/icons/`؛ کارت‌ها با کاشی آیکون، چیپ‌های نوع/اثر، نوار اکسنت حوزه، هاور/فوکوس/ورود پلکانی؛ اکسنت‌ها `[data-domain]`/`[data-type]` در `global.css` + kill-switch سراسری `prefers-reduced-motion`.
- **وضعیت تست (پایان این نشست):** `typecheck` ✓ · `npm test` = ۳۱۱ سبز (۳۲ فایل؛ +۵ تست taxonomy) · `build` ✓ · `npm run e2e` کامل = ۷۵ تست (نتیجهٔ دروازهٔ نهایی بخش ۸)

## ۲. کارهای انجام‌شدهٔ این نشست

1. **هستهٔ طبقه‌بندی:** `ExerciseMeta` += `exerciseType`/`effects` + اعتبارسنجی در `GameRegistry.register` · برچسب‌ها `EXERCISE_TYPE_LABELS_FA` در `i18n/fa.ts` · نگاشت هر ۲۱ بازی (۹ فایل meta.ts + ۱۲ متای inline در `modules/index.ts`).
2. **UI:** بازطراحی HomePage (هیرو با لوگو/گرادیان/هاله، سوییچ سه‌نما، کارت‌های غنی) · صیقل picker (کاشی نوع + چیپ + هاور سطوح) · نشان حوزه در domainChip صفحهٔ راهنمای GameShell.
3. **محدودیت‌های تست که رعایت شد:** nameFa اولین متن هر کارت-لینک بماند (انکرهای regex مثل `/^توالی اعداد/`) · متن لینک «برنامه امروز من» در programLink دست‌نخورده · آیکون‌های SVG داخل لینک‌ها `aria-hidden` (نام قابل‌دسترس تغییر نمی‌کند) · هر لینک تمرین دقیقاً یک‌بار در DOM (هر نما — وگرنه نقض strict mode در همهٔ helperهای ناوبری).
4. **دو نمونهٔ دیگر از کلاس flake «محرک تکراری + انتظار متنی» رفع شد:** qa-visibility QA3 (استرووپ پس از resume) و wave3 شمارش هجا — هر دو به `waitProgressAdvance` رفتند. جاروی نهایی: فقط الگوهای «جمع‌آوری رویداد توالی» (`__ccLast`/`__spatialLast`/`__wmLast`) مانده‌اند که قرارداد شمرده‌شدهٔ خودشان است (ظاهرشدن از خالی).
5. **دیپلوی معلق شد:** تریگر push کامنت شد + راهنمای راه‌اندازی مجدد در کامنت ابتدای workflow (بخش ۱).

## ۳. معماری کلیدی (به‌روز)

- **قرارداد بازی:** `src/core/types/exercise.ts` — موتور خالص بدون React · افزودن بازی یعنی: engine + meta (شامل `exerciseType` و `effects`!) + ۳ گارد الزامی + `time-estimation.ts` — دستورالعمل کامل در README «افزودن بازی جدید».
- **E2E conventions (به‌روز و مهم):** برای پیشروی مرحله‌ای **فقط** `waitProgressAdvance` از `tests/e2e/helpers.ts` روی `data-trial-index` (صفت روی section اصلی GameShell) — نه مقایسهٔ متن/رنگ محرک (محرک تکراری ممکن است: معادلهٔ تکراری، جوهر هم‌رنگ، جملهٔ تکراری — سه بار در عمل دیده شد) و نه هدر (رقم در عنوان بازی مثل «محاسبه × ۱۰۰») و نه answeredTrials (فلش بازخوردِ ×۱۰۰ تایپِ پیش از رندر را قفل می‌کند) · predicateهای `waitForFunction` در مرورگر اجرا می‌شوند — هیچ ارجاع به ثابت Node نداشته باشند (درس FA_DIGITS) · regex نام بازی‌ها برای «چرخش ذهنی» باید لنگر `^` داشته باشد (کارت ساعت آینه‌ای هم آن عبارت را دارد).
- **آیکون‌ها:** همه SVG درون‌خطی `currentColor` در `src/components/icons/` (LogoMark/DomainEmblems/TypeGlyphs/UiGlyphs) — بی‌وابستگی، آفلاین، RTL-امن؛ رنگ‌ها از `[data-domain]`→`--accent` و `[data-type]`→`--type-accent` در `global.css`.
- **Object Tracking (الگوی Canvas):** پیش‌محاسبهٔ مسیر در موتور، کامپوننت فقط رندرکننده.
- **الگوی ایجنت‌های موازی مقاوم به کرش:** هر ایجنت فقط پوشهٔ خودش · tsc یک‌بار در پایان · فقط تست تکی خودت · OOM → ۳۰ث صبر + یک retry.

## ۴. دانش تجربی مهم

- **Git Bash/MSYS مقادیر env/آرگومان‌های شبیه مسیر را بازنویسی می‌کند:** `DEPLOY_BASE=/Mind-Game/` شد `C:/Program Files/Git/...` → `MSYS2_ENV_CONV_EXCL="DEPLOY_BASE"`؛ `$_` در PowerShell هم قربانی است → `MSYS_NO_PATHCONV=1`.
- **batch ویندوز فقط ASCII:** `chcp 65001` در فایل UTF-8 با متن فارسی، parse بعدی cmd را خراب می‌کند؛ فارسی → فایل راهنما.
- **اکشن Playwright زیر بار میزبان می‌تواند بدون دلیل گیر کند** (click پس از actionability) — نشانهٔ منابع، نه باگ؛ با اجرای تکی همان spec تأیید کنید.
- **GITHUB_TOKEN اجازهٔ «ساخت» سایت Pages را در این حساب ندارد** — فعال‌سازی یک‌بار دستی لازم است (بخش ۱).
- OOM میزبان: پنجره‌های اضافی ZCode بسته شوند؛ `FreeVirtualMemory` زیر ~۲GB خطر؛ فلک crashpad کروم باگ اپ نیست.

## ۵. مأموریت‌های تصویب‌شدهٔ نشست بعد (کاربر تأیید کرده)

1. **بازی‌های بعدی از پژوهش C** (به‌ترتیب سند §۴): ان‌بک دوگانه (از موتور ان-بک فعلی) → حافظهٔ انجمنی (نیازمند تصمیم حوزهٔ هشتم `long-term-memory` — تغییر معماری صریح با تصویب کاربر) → جمع زنجیره‌ای گام‌دار (پاسات) + کارت‌بندی قاعده (WCST).
2. **موج ۶ زبانی از بک‌لاگ کاربر:** Reading Aloud، Word Scramble (نیازمند `persian-text-normalizer.ts`)، Audio Recall و Word Blend (Web Audio).
3. **بازگشت دیپلوی Pages** هر وقت کاربر خواست (دو قام بخش ۱).
4. UX باقی‌مانده: بازبینی بازخورد چشمی کاربر روی UI جدید (شاید تنظیم رنگ/چگالی چیپ‌ها).

## ۶. پروتکل کاری (ثابت)

- گام‌های کوچک قابل‌راستی‌آزمایی؛ هر تغییر معنادار → تست؛ بدون تغییر بی‌صدا در تصمیم‌های قفل‌شده
- بدون ادعای بالینی/هوش؛ honest framing طبق `docs/SCIENTIFIC-VALIDATION.md`
- گسترش محدوده فقط با تصمیم صریح کاربر
- دروازهٔ پایانی هر نشست: `typecheck` + `npm test` + `npm run build` + `npm run e2e` کامل + push

## ۷. چک‌لیست شروع نشست بعد

1. `cd "E:\Mind Game" && git status` (باید تمیز باشد) و `npm test` — انتظار **۳۱۱ سبز** (~۱ دقیقه)
2. `git pull --ff-only`
3. اجرای چشمی: `start-game.bat` یا `npm run dev` — نگاه به فهرست سه‌نما و بازخورد کاربر را جمع کنید
4. سپس بخش ۵ با تصویب کاربر

## ۸. وضعیت دروازهٔ نهایی این نشست

- unit ۳۱۱ ✓ · typecheck ✓ · build ✓ · specs هدفمند (taxonomy/exercises/program/visual-review) ۱۱/۱۱ ✓ · qa-visibility+wave3 پس از رفع ۸/۸ ✓
- اجرای کامل نهایی: **۷۵/۷۵ سبز (۱۹.۳ دقیقه)** — دو شکست میانی (QA3 استرووپ در qa-visibility، هجا در wave3) هر دو از کلاس «محرک تکراری + انتظار متنی» بودند، ریشه‌یابی و رفع شدند و در اجرای نهایی سبز ماندند.
