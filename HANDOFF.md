# سند انتقال به نشست بعد — Cognitive Training Lab

> این سند خودکفا است: نشست بعدی بدون نیاز به تاریخچه گفتگو، از همین‌جا ادامه می‌دهد.
> تاریخ تنظیم: ۲۰۲۶-۱۱-۱۲ (نشست دوم همان روز) · موضوع: exe دسکتاپ + صفحهٔ سیر پیشرفت

## ۱. وضعیت فعلی پروژه (خلاصه)

- **مسیر:** `E:\Mind Game` — React 18 + TypeScript strict + Vite · فارسی/RTL · Mobile-first · Local-first (IndexedDB، بدون backend)
- **گیت‌هاب:** `origin → https://github.com/Alimobiny/Mind-Game` — تا `4eb45b0` push شده. **⚠️ از نشست قبل یک کامیت لوکال pushنشده هست** (معلق‌سازی دیپلوی + HANDOFF قدیمی): توکن git دامنهٔ `workflow` ندارد؛ با کلاینت مجاز (VS Code/GitHub Desktop واردشده به Alimobiny) push شود. کامیت‌های این نشست روی همان سوار می‌شوند.
- **نسخهٔ exe ویندوز ✅:** `npm run desktop:build` → `release/` دو فایل: **پرتابل** `Cognitive Training Lab 0.1.0.exe` (~۱۱۲MB، دوبارکلیک/آفلاین) + **Setup** (~۱۲۳MB، میانبر استارت‌منو). معماری: `electron/main.cjs` (تک‌نمونه، smoke با اسکرین‌شات) + روتر hash روی `file:` (`src/app/router.tsx` — شاخهٔ وب دست‌نخورده) + `DEPLOY_BASE=./` بیلد نسبی + `scripts/make-icons.mjs` (sharp → `build/icon.png`). راهنما: `docs/DESKTOP-APP.md`. دادهٔ exe در `%APPDATA%/Cognitive Training Lab` — انتقال با Export/JSON.
- **صفحهٔ «سیر پیشرفت» ✅ (`/journey`):** ماژول خالص `src/analytics/journey.ts` (تقویم ۱۲هفته‌ای، رکورد Duolingo-سبک با فرصت امروز، نشان‌ها، خط زمانی) — **تماماً مشتق از دادهٔ موجود؛ بدون ذخیره/migration جدید** (ثبت فعالیت از قبل کامل است: هر جلسه + هر مرحله در IndexedDB). لینک در فوتر خانه. ایده‌ها از Duolingo/GitHub/Elevate با چارچوب صادقانه («نشان‌ها بازتاب نظم و حجم‌اند، نه سنجش ذهنی»).
- **۲۱ بازی / ۷ حوزه + طبقه‌بندی نوع‌تمرین/اثر (نشست قبل) + برنامهٔ روزانه + دشواری تطبیقی + Export/Import — پایدار**
- **دیپلوی Pages: معلق** (درخواست کاربر). راه‌اندازی مجدد: (۱) Settings ← Pages ← Source: «GitHub Actions» (یک‌بار دستی؛ توکن Actions اجازهٔ ساخت سایت را نمی‌دهد)؛ (۲) تریگر push را در `deploy-pages.yml` از کامنت خارج کنید. `start-game.bat` برای توسعه فعال است.
- **وضعیت تست:** `typecheck` ✓ · `npm test` = **۳۲۲ سبز** (۳۳ فایل؛ +۱۱ journey) · `build` ✓ · e2e کامل = ۷۷ تست (نتیجهٔ دروازهٔ نهایی بخش ۸)

## ۲. کارهای انجام‌شدهٔ این نشست

1. **exe:** Electron 45 + electron-builder 26 + sharp (devDeps). درس‌ها: باینری الکترون با `node node_modules/electron/install.js` نصب شد (postinstall اول ناقص بود)؛ ماکروی `${target}` در artifactName پشتیبانی نمی‌شود (حذف شد)؛ `build/` و `release/` به .gitignore.
2. **روتر دو-وجهی:** `createHashRouter` روی `file:` — تست‌نشده با unit ولی با smoke اسکرین‌شاتی الکترون و اجرای واقعی پرتابل تأیید شد (رندر کامل RTL/فونت/آیکون‌ها).
3. **journey.ts + ۱۱ تست واحد** (تاریخ ثابت، ظهرِ محلی): گروه‌بندی روز، رکورد با فرصت امروز، نشان‌ها (اولین جلسه/هفت‌گانه/۱۰-۵۰-۱۰۰-۲۵۰ جلسه/۳-۷-۳۰ روز پیاپی/ارتقاها از levelHistory)، heatLevel/buildHeatmapWeeks (هفته از شنبهٔ محلی).
4. **JourneyPage** (الگوی ReportsPage) + `journey.spec.ts` (۲ تست: خالی + ۵ روز بذری) — هر دو از اولین اجرا سبز.
5. رفع دو خطای TS اولیه (readonly push + امضای levelUpDetail با رشته).

## ۳. معماری کلیدی (به‌روز)

- **قرارداد بازی:** `src/core/types/exercise.ts` + meta با `exerciseType`/`effects` — دستورالعمل کامل در README «افزودن بازی جدید».
- **E2E conventions:** پیشروی مرحله‌ای فقط با `waitProgressAdvance` (helpers) روی `data-trial-index` — نه تغییر متن/رنگ محرک (محرک تکراری)، نه هدر (رقم در عنوان)، نه answeredTrials (فلش بازخورد) · predicateهای `waitForFunction` بدون ارجاع به ثابت Node · بذر تاریخ‌ها با لنگر «ظهرِ روز تقویمی» (`daysAgoAtNoon`).
- **سیر پیشرفت:** همهٔ محاسبات در `src/analytics/journey.ts` خالص‌اند؛ صفحه فقط رندر می‌کند. نشان‌ها هرگز ادعای شناختی ندارند (متن صریح در صفحه).
- **دسکتاپ:** `electron/main.cjs` فایل جاوااسکریپت سادهٔ CommonJS است (خارج از tsconfig — عمداً؛ بدون تایپ، کامنت‌دار). `--smoke` = بارگذاری + ۳ث + اسکرین‌شات در test-results + خروج ۰.
- **آیکون‌ها:** SVG درون‌خطی در `src/components/icons/`؛ اکسنت‌ها `[data-domain]`/`[data-type]` در global.css؛ `prefers-reduced-motion` جهانی.
- **الگوی ایجنت‌های موازی مقاوم به کرش:** هر ایجنت فقط پوشهٔ خودش · tsc یک‌بار در پایان · فقط تست تکی خودت · OOM → ۳۰ث صبر + retry.

## ۴. دانش تجربی مهم

- **MSYS/Git Bash:** مقادیر env/آرگومان شبیه مسیر تبدیل می‌شوند (`DEPLOY_BASE=/x` → `C:/Program Files/Git/x` → `MSYS2_ENV_CONV_EXCL`؛ `$_` پاورشل و `taskkill /IM` → `MSYS_NO_PATHCONV=1`)؛ `DEPLOY_BASE=./` امن است.
- **الکترون روی این ماشین:** باینری با install.js تکمیل شود؛ exe بدون امضا → آنتی‌ویروس ممکن است هشدار دهد (راهنما نوشته شد)؛ پرتابل stdout نمی‌دهد — راستی‌آزمایی با tasklist + smoke اسکرین‌شاتی.
- **بار میزبان ناپایدار:** یک اجرای npm test ۳۰ دقیقه طول کشید (environment ~10800s) و بعدش عادی شد — قبل از دروازه‌ها حافظهٔ آزاد را چک کنید (`FreeVirtualMemory` زیر ~۲GB خطر)؛ اکشن Playwright گیرکرده زیر بار = نشانهٔ منابع، با اجرای تکی تأیید کنید.
- batch ویندوز فقط ASCII؛ GITHUB_TOKEN اجازهٔ ساخت Pages را ندارد (فعال‌سازی دستی).
- **vitest سخت‌گیر نیست به TS** — typecheck جدا اجرایش کنید (دو خطای TS وسط unit سبز پنهان ماند).

## ۵. مأموریت‌های تصویب‌شدهٔ نشست بعد

1. **بازی‌های بعدی از پژوهش C:** ان‌بک دوگانه (از موتور ان-بک) → حافظهٔ انجمنی (حوزهٔ هشتم — تصویب صریح) → پاسات + WCST.
2. **موج ۶ زبانی:** Reading Aloud، Word Scramble (نرمال‌ساز فارسی)، Audio Recall، Word Blend (Web Audio).
3. **پیشنهادی جدید:** تقویم فعالیت روی صفحهٔ خانه (نسخهٔ فشرده) / پوشش نشان‌ها در گزارش‌ها — با تصویب کاربر.
4. بازگشت دیپلوی Pages هر وقت کاربر خواست (دو قام بخش ۱).

## ۶. پروتکل کاری (ثابت)

- گام‌های کوچک قابل‌راستی‌آزمایی؛ هر تغییر معنادار → تست؛ بدون تغییر بی‌صدا در تصمیم‌های قفل‌شده
- بدون ادعای بالینی/هوش؛ honest framing طبق `docs/SCIENTIFIC-VALIDATION.md`
- گسترش محدوده فقط با تصمیم صریح کاربر
- دروازهٔ پایانی هر نشست: `typecheck` + `npm test` + `npm run build` + `npm run e2e` کامل + push

## ۷. چک‌لیست شروع نشست بعد

1. `cd "E:\Mind Game" && git status` (باید تمیز باشد؛ انتظار ahead ≥ ۱ — کامیت(های) pushنشده) و `npm test` — انتظار **۳۲۲ سبز**
2. `git pull --ff-only` (اگر کاربر از VS Code push کرده باشد، ابتدا `git pull --rebase` ممکن است لازم شود — هماهنگ کنید)
3. تست چشمی exe: دوبارکلیک `release/Cognitive Training Lab 0.1.0.exe` — و بازخورد کاربر را جمع کنید
4. سپس بخش ۵ با تصویب کاربر

## ۸. وضعیت دروازهٔ نهایی این نشست

- typecheck ✓ · unit ۳۲۲/۳۲۲ ✓ · build ✓ · specs هدفدار (journey/exercises/program) ۱۰/۱۰ ✓ · smoke الکترون ✓ (اسکرین‌شات رندر کامل) · پرتابل واقعاً اجرا شد و بسته شد ✓
- **اجرای کامل نهایی e2e: ۷۷/۷۷ سبز (۱۹.۴ دقیقه)** — بدون هیچ شکستی از همان اجرای اول.
