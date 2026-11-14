# سند انتقال به نشست بعد — Cognitive Training Lab

> این سند خودکفا است: نشست بعدی بدون نیاز به تاریخچه گفتگو، از همین‌جا ادامه می‌دهد.
> تاریخ تنظیم: ۲۰۲۶-۱۱-۱۵ (نشست پانزدهم) · به‌روزرسانی: RT از فاز پاسخ + مهاجرت کامل useTrialGuards + دسته‌بندی/فهرست‌بندی بنیادی بازی‌ها

## ۱. وضعیت فعلی پروژه (خلاصه)

- **مسیر:** `E:\Mind Game` — React 18 + TypeScript strict + Vite · فارسی/RTL · Mobile-first · Local-first (IndexedDB)
- **گیت‌هاب:** `origin → https://github.com/Alimobiny/Mind-Game` — push به main → استقرار خودکار.
- **۳۷ بازی در ۸ حوزه** · فهرست مرجع تولیدشده: `docs/GAMES-CATALOG.md` (تولید با `npm run catalog`) · `docs/GAMES-AUDIT.md` (صف ممیزی، وضعیت پس از نشست ۱۵).
- **این نشست — بخش ۱ (تخلیهٔ بندهای ۷ و ۸ صف):**
  1. **RT از شروع فاز پاسخ (بند ۷، مهم‌ترین اعتبار متریک):** `beginResponsePhase()` در مدیر جلسه (`session-manager.ts`) + `responseStartAtMs` — idempotent به اولین علامت، reset با advance، پایدار در مکث (PAUSED=unmount). `submitAnswer` مبنا را از آن می‌گیرد؛ ۱۴ بازی چندفازی (NS/RS/MG/spatial-seq/CD/ospan/symspan/AB/MOT/word-memory/audio-recall/word-blend/reading-aloud/ccount) در لحظهٔ بازشدن UI پاسخ علامت می‌زنند (اثر روی فاز در `*Game.tsx`). بامپ contentVersion همان بازی‌ها (cv2 یا cv3 — مستند در meta.ts هر بازی). **PASAT عمداً نشد:** RT از onset رقم معنای استاندارد آزمونگر-ریتم است (بازبینی ثبت شد).
  2. **پرچم `retryAfterPersistFailure`** در رویداد خام (A7 بسته شد) + امضای `toTrialEventRecord` به آبجکت پرچم (`TrialEventFlags`) تمیز شد.
  3. **مهاجرت کامل useTrialGuards (بند ۸):** هر ۳۶ کامپوننت بازی روی هوک‌اند (۲۲ مهاجرت این نشست) — قفل/advance امن/تایمرهای ردیابی‌شده/armDeadline با re-arm همه یکجا.
- **این نشست — بخش ۲ (درخواست کاربر: دسته‌بندی و فهرست‌بندی بنیادی):**
  4. **لایهٔ خانوادهٔ پارادایمی:** `EXERCISE_FAMILIES` (۳۱ خانواده) + `FAMILY_LABELS_FA` در `core/types/taxonomy.ts`؛ فیلدهای `family`/`nameEn`/`keywordsFa` در `ExerciseMeta` — نگاشت از SCIENTIFIC-VALIDATION §۲/§۷٫۱ و GAMES-AUDIT §۳.
  5. **یک الگوی متا:** هر ۳۷ بازی متای کامل `ExerciseMeta` در `meta.ts` خودش دارد (۱۲ متای inline موج ۱ منتقل شد — ریسک domain drift ساختاً بسته).
  6. **تفکیک متا/انجین:** `src/modules/catalog.ts` فقط ۳۷ متا را import می‌کند (`GAME_CATALOG`، `ExerciseId`، `listCatalog`، `catalogById`) — HomePage/Program/Journey/Reports دیگر موتورها را به باندل اولیه نمی‌کشند. `modules/index.ts` فقط سمت موتور: نقشهٔ `DEFINITIONS: Record<ExerciseId, …>` + `createAppRegistry` (از روی کاتالوگ) + **`appRegistry` تک‌نمونه** + `createExerciseConfig`.
  7. **UI:** نمای چهارم «خانوادهٔ پارادایم» (`view-family`) + چیپ خانواده روی کارت‌ها و صفحهٔ دشواری + جست‌وجوی گسترش‌یافته (nameEn/id/برچسب خانواده/کلیدواژه — «n-back»، «pasat»، «کورسی»، «انبک» می‌یابد؛ منطق خالص در `src/pages/home-catalog.ts`).
  8. **فهرست مرجع تولیدشده:** `docs/GAMES-CATALOG.md` از روی کاتالوگ (`buildCatalogMarkdown` در `src/modules/catalog-markdown.ts` + `npm run catalog` با tsx) + **تست نگهبان drift** (`catalog-doc.test.ts`) + README به آن ارجاع می‌دهد (جدول دست‌نویس ۳۷ردیفی README حذف شد).
  9. **تایپ‌شدگی شناسه:** `GAME_LOADERS` در ExercisePage از نوع `Record<ExerciseId,…>` — جاماندن loader/موتور در زمان کامپایل خطا می‌دهد.
- **وضعیت تست:** typecheck ✓ · `npm test` = **۶۰۰ سبز** (۵۸۰ + ۲۰: مدیر ×۶، کاتالوگ ×۶، drift ×۱، home-catalog ×۱۰، تاکسونومی خانواده ×۳) · build ✓ · e2e کامل = **۱۰۰/۱۰۰ (۳۲٫۹د، بار اول)** · CACHE_VERSION → v5 · exe بازسازی.

## ۲. کارهای انجام‌شدهٔ این نشست (پانزدهم)

1. چک‌لیست شروع: درخت تمیز c857497 · ۵۷۴ سبز بار اول · pull up-to-date · دیپلوی سالم.
2. بند ۷ و ۸ صف با تست هدفمند در هر گام؛ تست‌های قفل‌کنندهٔ contentVersion قدیمی به قرارداد تازه به‌روزشدند (AB → '3'، word-memory → '2').
3. کار دسته‌بندی/فهرست‌بندی با تصویب کاربر؛ بقیهٔ صف (هارنس تست کامپوننت، ESLint، فرادادهٔ پژوهشی، موارد ریز §۲-۶) **صراحتاً به نشست ۱۶ واگذار شد**.
4. e2e هدفمند taxonomy (نمای خانواده + جست‌وجوی لاتین) پیش از اجرای کامل؛ e2e کامل بار اول بدون شکست.

## ۳. معماری کلیدی (به‌روز — فقط تازه‌ها)

- **کاتالوگ/موتور جدا:** فهرست‌ها از `src/modules/catalog.ts` (فقط متا)؛ اجرا از `src/modules/index.ts` (موتورها + `appRegistry` تک‌نمونه + config). افزودن بازی = ۵ نقطهٔ مستند در README («افزودن بازی جدید») — جاماندن هر نقطه در کامپایل/تست می‌شکند.
- **`ExerciseMeta` کامل:** `id/nameFa/descriptionFa/domain/exerciseType/family/nameEn/keywordsFa?/effects/version/contentVersion/instructionsFa/difficultyLevels/plannedTrials?/metricLabelsFa` — نگهبان‌ها: `registry-invariants` (meta↔engine)، `taxonomy` (نوع/خانواده/اثرها)، `catalog` (کاتالوگ↔رجیستری↔ALL_EXERCISE_IDS)، `metrics-labels`.
- **RT پاسخ‌فاز:** بازی چندفازیِ جدید در لحظهٔ بازشدن UI پاسخ `ctx.beginResponsePhase()` بزند (اثر روی فاز؛ idempotent و مسیر بازنصب مکث را می‌پوشاند).
- **`useTrialGuards`** قرارداد همهٔ بازی‌هاست (نشست ۱۴/۱۵)؛ بازخورد‌های چسبان (نشان شناور) تایمر خودشان را نگه می‌دارند (پاک‌سازی فقط unmount — عمدی).
- قراردادهای پیشین (PREPARE پس از persist، unlock-on-reject، progress از config.totalTrials، PAUSED=unmount، دوز روزانه، honest framing) پابرجا.

## ۴. دانش تجربی مهم (تازهٔ این نشست)

- **RT پاسخ‌فاز، معناشناسی per-paradigm دارد:** برای پاسات (آزمونگر-ریتم) RT از onset محرک درست است و علامت‌گذاری نباید انجام شود — قاعدهٔ کلی «همهٔ phased» را نه، «phased با فاز encoding متمایز» را بگیر.
- **متا نباید engine import کند:** هر متای کامل رشته‌های id/version/contentVersion را خودش دارد؛ نگهبان `registry-invariants` drift با موتور را می‌گیرد — این جداسازی است که به HomePage اجازه می‌دهد بدون موتورها رندر شود.
- **تولید سند از رجیستری + تست drift** الگوی ضد-سه‌جدول‌دست‌نویس است: README/AUDIT دیگر کاتالوگ را دست‌نویس نمی‌کنند.
- `localeCompare('fa')` در ماژول‌اسکوپ قطعی و بی‌خطر است (ترتیب کاتالوگ و registry.list یکی می‌ماند — تست دو‌لایه قفلش کرده).
- درس‌های پیشین (flake شمارش معکوس زیر بار، ویرایش حین e2e=HMR، تست‌های قفل‌کنندهٔ رفتار معیوب) پابرجا.

## ۵. مأموریت‌های پیشنهادی نشست بعد (۱۶)

1. **لایهٔ تست کامپوننت در سطح بازی** برای ادامهٔ پس از مکث/سه‌گارد (بند ۸ نیمهٔ باز؛ فقط useTrialGuards و GameShell تست‌شده‌اند) — هارنس مشترک + حداقل یک تست عمیق به ازای دامنهٔ ۸گانه.
2. بدهی‌های معماری باقی‌مانده (بند ۹): **ESLint** (typescript-eslint + react-hooks؛ خطاها رفع/هشدارها مستند)، **فرادادهٔ پژوهشی** (ذخیرهٔ pauseCount، روش ورودی، TTS-mode در خلاصهٔ جلسه + migration نسخهٔ IDB).
3. موارد ریزتر §۲-۶ (اولویت پایین): voiceschanged، RT omission، نوار شکستن رقم، لبهٔ MOT، تأیید خروج، abort+submit، چند‌تب، A10، rounding آستانه.
4. (اختیاری، با سند موج جدید) ادامهٔ کاتالوگ بازی‌ها — ۳۷ بازی سند پژوهش پیشرفته کامل ساخته شد.

## ۶. پروتکل کاری (ثابت)

- گام‌های کوچک قابل‌راستی‌آزمایی؛ هر تغییر معنادار → تست؛ بدون تغییر بی‌صدا در تصمیم‌های قفل‌شده
- بدون ادعای بالینی/هوش؛ honest framing طبق `docs/SCIENTIFIC-VALIDATION.md`
- گسترش محدوده فقط با تصمیم صریح کاربر
- دروازهٔ پایانی: `typecheck` + `npm test` + `npm run build` + `npm run e2e` کامل + push (+ exe در موج‌های بازی‌دار) — **و تا پایان e2e هیچ ویرایش فایلی**
- **قید دائمی کاربر:** هیچ API ابری/هوش مصنوعی/سرویس پولی/تشخیص گفتار — همه‌چیز محلی و آفلاین (tsx فقط ابزار build است)
- **در هر انتشار: `CACHE_VERSION` در public/sw.js را یک پوش بده** (الان v5)
- بعد از تغییر متاها: `npm run catalog` (تست drift سبز بماند)

## ۷. چک‌لیست شروع نشست بعد

1. `cd "E:\Mind Game" && git status` (تمیز) و `npm test` — انتظار **۶۰۰ سبز** (شکست → اول ایزوله؛ تست شمارش معکوس GameShell زیر بار پرالل flake شناخته‌شده است)
2. `git pull --ff-only`
3. سلامت دیپلوی: ریشه 200؛ نام chunk زنده از باندل ساخته‌شده — نه از index.html
4. سپس بخش ۵ با تصویب کاربر

## ۸. وضعیت دروازهٔ نهایی این نشست (پانزدهم)

- typecheck ✓ · unit **۶۰۰/۶۰۰** · build ✓ · e2e کامل: **۱۰۰/۱۰۰ (۳۲٫۹د)** — بار اول، بدون شکست · CACHE v5 · exe بازسازی ✓ · کامیت + push (این نشست)
- (نشست ۱۴: اجرای صف §۴ بند ۱-۶؛ سیزدهم: ممیزی جامع؛ درس‌ها در بخش ۴)
