# سند انتقال به نشست بعد — Cognitive Training Lab

> این سند خودکفا است: نشست بعدی بدون نیاز به تاریخچه گفتگو، از همین‌جا ادامه می‌دهد.
> تاریخ تنظیم: ۲۰۲۶-۱۱-۱۴ (نشست دوازدهم) · به‌روزرسانی: بازسازی سلامت و کارایی — بازرسی سه‌ایجنتی و رفع ریشه‌ای (کامیت f8824c5)

## ۱. وضعیت فعلی پروژه (خلاصه)

- **مسیر:** `E:\Mind Game` — React 18 + TypeScript strict + Vite · فارسی/RTL · Mobile-first · Local-first (IndexedDB)
- **گیت‌هاب:** `origin → https://github.com/Alimobiny/Mind-Game` — push به main → استقرار خودکار (CI کامیت f8824c5 سبز ۳۸ث؛ chunk زندهٔ تمرین ۲۹٫۶KB با lazy per-game + ۳۶ میکرو-chunk).
- **۳۷ بازی در ۸ حوزه** — سند پژوهش پیشرفته کامل (موج‌های ۵-۱۰).
- **بازرسی سه‌ایجنتی این نشست (معماری + QA/UI + کارایی) و رفع‌های ریشه‌ای (کامیت f8824c5):**
  - **بن‌بست مکث برای همیشه بسته شد:** `SessionManager.resume()` حالا اگر مرحله پاسخ‌داده‌شده ولی پیشروی‌نشده باشد خودش advance می‌کند — کل کلاس باگ در ۲۰ بازیِ فاقد بازیابی محلی (استرووپ/عملگر گم‌شده/شمارش هجا/کارت‌بندی قاعده و…) یک‌جا بسته شد (+۲ تست واحد).
  - **مکث حین COUNTDOWN** در visibilitychange اضافه شد (قبلاً جلسه در پس‌زمینه ACTIVE و مراحل بی‌نمایش ازقلم‌انداخته ثبت می‌شدند).
  - **تاب‌آوری IndexedDB:** خطای ذخیرهٔ رویداد خام → rollback کامل + `persist_failed` (تلاش مجدد ممکن)؛ persistFinalهای abort/complete مهار؛ start().catch + کارت خطای فارسی به‌جای صفحهٔ خالی؛ ErrorBoundary ریشه در App.
  - **چرخهٔ badge در ۴ بازی** (محاسبه×۲۰/ماتریس پیشرونده/پاسات چسبان، منطق توالی نامرئی) با الگوی سالم سایمون + کامنت نادرست ریتم پاسات اصلاح.
  - **زمان‌بندی remount:** زمان‌واکنش (مهلت قبل از نمایش محرک می‌سوخت!) elapsed-محور؛ برو/نرو/ان‌بک/ان‌بک‌دوگانه past-hide؛ جابه‌جایی تکلیف CSIِ کسرشده.
  - **قطع رکوردهای یتیم** در unmount GameShell با الگوی «abort به‌تعویق + لغو توسط setup» — سازگار با StrictMode (ریشه‌یابی با stack trace: commitDoubleInvokeEffectsInDEV).
  - رشتهٔ روسی «показ» در دنبال‌کردن اشیا؛ گارد نرخ نوشتن leaveRun؛ LETTERS مشترک در shared-letters.ts.
- **کارایی:**
  - **نوشتن IDB با `durability: 'relaxed'`** در هر ۵ مسیر نوشتنی — fsync از مسیر داغ «پاسخ → مرحلهٔ بعد» در هر ۳۷ بازی حذف شد (۲-۵۰ms jitter).
  - **بارگذاری تنبل هر بازی + پیش‌واکشی** در ExercisePage: chunk تمرین **۱۳۵KB → ۲۹٫۶KB** (هر بازی ۲-۷KB؛ CSS هم متناسب split شد).
  - **یک خواندن کامل جلسات** به‌جای ۳ خواندن تکراری (Reports/Home/Program) — dashboard توابعش آرایه می‌گیرند.
  - progressBarFill با scaleX (composite)؛ شیمر اسکلتون با translate؛ SW → v2؛ canvas دنبال‌کردن اشیا با devicePixelRatio.
- **a11y:** aria-valuemin/max/now نوار پیشرفت؛ فوکوس خودکار + aria-modal دیالوگ مکث؛ role=timer شمارش؛ خروج ۴۸px؛ `animation-delay: 0s` زیر reduced-motion (چیپ‌های پلکانی تا ۳۶۰ms نامرئی می‌ماندند)؛ جهت‌های رادیو دشواری.
- **وضعیت تست:** typecheck ✓ · `npm test` = **۵۳۴ سبز** · build ✓ · e2e کامل = **۹۹/۹۹ (۲۹٫۱د)**.

## ۲. کارهای انجام‌شدهٔ این نشست (دوازدهم)

1. سه ایجنت موازی بازرسی (معماری/کد، QA/تعامل/UI، کارایی) با شواهد file:line + راستی‌آزمایی متقاطع.
2. فاز صحت → فاز سرعت → فاز a11y (برنامهٔ مصوب، به همین ترتیب اولویت).
3. شکار یک رگرسیون خودساخته حین کار: افکت unmount-abort با StrictMode در dev سیگنال قطع می‌داد — ریشه‌یابی تجربی با console-stack در Playwright و رفع با الگوی تعویق/لغو؛ e2e هدفمند ۱۸/۱۸ + کامل ۹۹/۹۹.
4. build (۲۹٫۶KB) + exe + کامیت f8824c5 + push + تأیید دیپلوی + این HANDOFF.

## ۳. معماری کلیدی (به‌روز — فقط تازه‌ها)

- **resume() خودشفیر است:** مکث بین submit و advance دیگر به کامپوننت‌ها وابسته نیست — بازیابی در خود SessionManager. بلوکهای catch-up کامپوننتها defensive مانده‌اند (هرگز دو بار fire نمی‌شوند).
- **lazy per-game:** `GAME_LOADERS`/`GAME_COMPONENTS` در ExercisePage + پیش‌واکشی در مونت؛ renderGame یک Suspense محلی با متن «در حال آماده‌سازی بازی…» دارد.
- **readwriteهای IDB همگی relaxed** — ثابت RELAXED_TX در indexeddb-repositories.
- قراردادهای پیشین (کارخانهٔ dual-n-back، مولد ماتریس با یکتایی برحسب ساخت، پنج‌نقطهٔ افزودن بازی، سه‌گارد تایمر advance، کلید متریک شرطی، PAUSED=unmount) پابرجا.

## ۴. دانش تجربی مهم (تازهٔ این نشست)

- **StrictMode + افکت cleanup با عارضه:** در dev، setup→cleanup→setup دوباره اجرا می‌شود و cleanup می‌تواند stateِ «پس از عملِ setup» را ببیند (اینجا: phase=READY پس از start	async). الگوی درمان: عارضه را در cleanup به تعویق بینداز (setTimeout 0) و در setup بعدی لغو کن — فقط unmount واقعی (بدون setup بعدی) اجرا می‌کند. ریشه‌یابی با `console.log(new Error().stack)` داخل متد مشکوک + Playwright console-listener (console.trace در msg.type()='trace' فیلتر می‌شود!).
- **durability: 'relaxed' در IDB:** commit بدون fsync — داده در خرابی تب سالم؛ برای UI لوکال-اول کاملاً کافی و از مسیر داغ حذف می‌شود.
- **React.lazy per-game در renderGame:** کامپوننتهای `{ctx}` به `ComponentType<{ctx; auditory?}>` قابل انتساب‌اند (مقادیر props contravariant)؛ preload همان import() در useEffect سوسپنس را عملاً نامرئی می‌کند.
- درس‌های پیشین (لنگر lookahead نام‌ها، ویرایش حین e2e=HMR، فلکی CPU، نام chunk سی‌آی، translate مستقل CSS، fallbackElement RR، docblock node، pipe/tail) پابرجا.

## ۵. مأموریت‌های تصویب‌شدهٔ نشست بعد (بدهی معماری از بازرسی)

1. **هوک `useTrialGuards`:** استخراج اسکلت per-trial (submittedRef + currentTrialRef + timersRef + deadline-submit + گاردها) از ~۳۶ کامپوننت — حذف ~۷۰۰-۹۰۰ خط تکرار و جلوگیری از رانش. بازنویسی تدریجی موج‌به‌موج؛ specs پوشش می‌دهند. (بزرگ‌ترین برد ارزش/ریسک)
2. **تفکیک متا/انجین رجیستری:** متاها استاتیک برای صفحات فهرست، engineها lazy برای ExercisePage — chunk خانه از ~۲۲۸KB به ~۱۲۰KB. به‌همراه حذف سوئیچهای ۳۸caseای (configForDifficulty روی RegisteredExercise).
3. **TRecord تایپ‌شده** برای ۳۷ موتور (حذف ~۳۰ castِ stimulus در summaryها).
4. موارد کوچک: کش snapshot در manager (+useSyncExternalStore آینده)، پرچم «آلودگی replay پس از مکث» برای CD/AB/RS، ESLint (۵۴+ کامنت eslint-disable بدون لینتر!).
5. contentVersion-2 بازیهای موج ۱۰ (مکان‌یابی تشخیص تغییر، ۶ گزینه/چرخش ماتریس) با سند موج جدید.

## ۶. پروتکل کاری (ثابت)

- گام‌های کوچک قابل‌راستی‌آزمایی؛ هر تغییر معنادار → تست؛ بدون تغییر بی‌صدا در تصمیم‌های قفل‌شده
- بدون ادعای بالینی/هوش؛ honest framing طبق `docs/SCIENTIFIC-VALIDATION.md`
- گسترش محدوده فقط با تصمیم صریح کاربر
- دروازهٔ پایانی: `typecheck` + `npm test` + `npm run build` + `npm run e2e` کامل + push (+ exe در موج‌های بازی‌دار) — **و تا پایان e2e هیچ ویرایش فایلی**
- **قید دائمی کاربر:** هیچ API ابری/هوش مصنوعی/سرویس پولی/تشخیص گفتار — همه‌چیز محلی و آفلاین
- **در هر انتشار: `CACHE_VERSION` در public/sw.js را یک پوش بده** (الان v2)

## ۷. چک‌لیست شروع نشست بعد

1. `cd "E:\Mind Game" && git status` (تمیز) و `npm test` — انتظار **۵۳۴ سبز** (شکست → اول ایزوله)
2. `git pull --ff-only`
3. سلامت دیپلوی: ریشه 200؛ نام chunk زنده از باندل index (الان: `ExercisePage-BGSYPWym.js`، ۲۹٫۶KB شامل «در حال آماده‌سازی بازی») — نه از index.html
4. سپس بخش ۵ با تصویق کاربر

## ۸. وضعیت دروازهٔ نهایی این نشست (دوازدهم)

- typecheck ✓ · unit **۵۳۴/۵۳۴** (۵۳۲ + ۲ تست تاب‌آوری: resume-auto-advance و persist_failed-rollback) · build ✓ (ExercisePage ‏۲۹٫۶KB، ۳۶ میکرو-chunk بازی)
- **e2e کامل: ۹۹/۹۹ (۲۹٫۱ دقیقه)** — یک رگرسیون میانی از افکت unmount-abort با StrictMode در dev (e2e روی سرور dev اجرا می‌شود!)؛ ریشه‌یابی تجربی + رفع با الگوی تعویق/لغو؛ هدفمند ۱۸/۱۸ سپس کامل بدون شکست
- exe بازسازی ✓ (05:39) · کامیت f8824c5 + push ✓ · CI سبز ۳۸ث + chunk زندهٔ ۲۹٫۶KB با نشان lazy ✓
- (نشست یازدهم: موج دهم؛ نشست دهم: بازرسی+رفع؛ درس‌ها در بخش ۴)
