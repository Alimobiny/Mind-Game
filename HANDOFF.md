# سند انتقال به نشست بعد — Cognitive Training Lab

> این سند خودکفا است: نشست بعدی بدون نیاز به تاریخچه گفتگو، از همین‌جا ادامه می‌دهد.
> تاریخ تنظیم: ۲۰۲۶-۱۱-۱۴ (نشست سیزدهم) · به‌روزرسانی: ممیزی جامع ۳۷ بازی (کد + علم) و رفع ۱۳ مورد از جمله یک بحرانی

## ۱. وضعیت فعلی پروژه (خلاصه)

- **مسیر:** `E:\Mind Game` — React 18 + TypeScript strict + Vite · فارسی/RTL · Mobile-first · Local-first (IndexedDB)
- **گیت‌هاب:** `origin → https://github.com/Alimobiny/Mind-Game` — push به main → استقرار خودکار (CI سبز؛ chunk زندهٔ تمرین ~۳۰KB با lazy per-game).
- **۳۷ بازی در ۸ حوزه** · سند ممیزی جامع جدید: **`docs/GAMES-AUDIT.md`** (هر ۳۷ بازی: کد + علم + جدول یک‌نگاه) · **`docs/SCIENTIFIC-VALIDATION.md` به v۱٫۲ رسید** (§۷: grounding ۱۳ بازی بدون‌سند + دلتاهای as-built کل کاتالوگ).
- **ممیزی این نشست (۸ ایجنت دامنه‌ای + راستی‌آزمایی متقاطع + ادبیات ۲۰۲۱-۲۰۲۶):** هیچ کرش/فساد داده در موتورها؛ ۱۳ رفع اعمال شد:
  1. **بحرانی reading-aloud:** هر ۳۰ سؤال بانک `correctIndex: 0` و بدون بُر — انتخاب همیشگی گزینهٔ اول = دقت فهم ۱۰۰٪. بُر per-trial با بذر مرحله (contentVersion 2).
  2. **کلاس بن‌بست قفل در ۱۱ کامپوننت:** `submittedRef` روی submit ردشده (`persist_failed`) باز نمی‌شد → جلسه تا abort قفل. الگوی واحد `if (!result.accepted) { submittedRef.current = false; return }` در n-back/dual-n-back/go-no-go/stroop/simon/symmetry-span/pattern-completion/progressive-matrices/reaction-time/associative-pairs/syllable-counting.
  3. **جلسهٔ شفاف (A2):** `start()` حالا PREPARE را پس از persist موفق می‌زند؛ شکست IDB → فاز IDLE → کارت خطا + تلاش مجدد.
  4. **نشت تبِ مخفی (A1):** autoStart/شمارش‌معکوس/RunNextBar/RunComplete در پس‌زمینه فریز؛ آغاز فقط در تب نمایان (visibilityTick برای بازارزیابی پس از بازگشت).
  5. **تورم دقت associative-pairs:** دقت/شمارش‌ها فقط از مراحل آزمون (contentVersion 2)؛ plannedTrials پویا ۸/۱۰/۱۸/۲۱/۲۴ (GameShell از `config.totalTrials` می‌خواند).
  6. **isFullRecall (complex-span):** چک طول بازیابی — بازیابی بلندتر از دسته دیگر «کامل» نیست (ospan/symmetry contentVersion 2).
  7. **اکلوژن block-height:** BACK_DX ۱۲→۴ با قید مستند `FRONT_HW ≥ BACK_DX+BACK_HW` — ارتفاع پشتهٔ پشتی دیگر مستقیم خوانا نیست (contentVersion 3).
  8. **word-blend:** ۵ غلط املایی ZWNJ (پنبه‌زن، چای‌دان، آتش‌نشانی، دستمال‌کاغذی، چراغ‌دان) + سیم‌کشی speechRate (نردبان ۰٫۸→۱٫۰ مرده بود) (contentVersion 2).
  9. **word-scramble:** چیدمان «حذف یک حرف = خود واژه» (فریب در هر جایگاه) رد می‌شود (contentVersion 2).
  10. **چرخش لنگر برنامه:** بلوک ۸روزه (`anchorDomainForDate` صادرشده) — حوزهٔ هشتم دیگر هرگز از لنگر نمی‌افتد.
  11. **تست ناوردایی متا↔موتور** برای ۳۷ بازی (domain/version/contentVersion/plannedTrials).
  12. قفل **in-flight** در `start()` — وارث رگرسیون خودساختهٔ این نشست (بند ۴ زیر).
  13. docstring قرارداد مهلت اصلاح شد (SessionManager تایمر مهلت ندارد؛ مسئولیت کامپوننت).
- **وضعیت تست:** typecheck ✓ · `npm test` = **۵۴۷ سبز** · build ✓ (~۳۰KB chunk) · e2e کامل = **۹۹/۹۹ (۲۹٫۳د)** · CACHE_VERSION → v3 · exe بازسازی.

## ۲. کارهای انجام‌شدهٔ این نشست (سیزدهم)

1. بیس‌لاین (۵۳۴ سبز) → ۸ ایجنت بازبینی موازی دامنه‌ای (کد سطر‌به‌سطر + جدول پارامترهای as-built) + ۱ ایجنت زیرساخت.
2. راستی‌آزمایی متقاطع همهٔ یافته‌های بحرانی با خواندن مستقیم file:line.
3. بازبینی علمی: وفاداری پارادایم ۳۷ بازی نسبت به استاندارد ادبیات + جستجوی ادبیات ۲۰۲۱-۲۰۲۶ برای ۱۳ بازی بدون سند (Uttal/Hawes/Marion/Hilbert/McNeil/von Bastian/Halkowski/Katz/Huang…).
4. ۱۳ رفع با تست (۵۳۴→۵۴۷)؛ دو سند (GAMES-AUDIT جدید + SCIENTIFIC-VALIDATION §۷).
5. شکار رگرسیون خودساخته: e2e اول ۹۴/۹۹ — جابه‌جایی PREPARE پس از persist، قفل همگامِ ورود دوباره را برداشته بود و دوباراجرای افکت StrictMode (e2e روی dev) دو رکورد جلسه می‌ساخت؛ ریشه‌یابی از error-context + رفع با قفل in-flight؛ e2e دوم کامل ۹۹/۹۹.

## ۳. معماری کلیدی (به‌روز — فقط تازه‌ها)

- **`start()` دو قید تازه دارد:** PREPARE پس از persist موفق (جلوگیری از جلسهٔ شفاف) + قفل in-flight همگام (`startPromise`) — هر دو با تست قفل شده‌اند. **درس: هر تغییری در ترتیب همگام/ناهمگام فازها باید حفاظ ورود دوباره را بازبینی کند.**
- **GameShell progress/aria از `config.totalTrials` (اگر باشد) می‌سازد**، نه متا؛ متا فقط کفِ سطح اول برای کاتالوگ/برآورد. تست ناوردایی رجیستری هم‌خوانی را برای ۳۷ بازی قفل می‌کند.
- **الگوی واحد unlock-on-reject** اکنون در همهٔ کامپوننت‌ها هست؛ هوک آیندهٔ `useTrialGuards` باید همین را کدگذاری کند (+ re-arm مهلت که هنوز نیست).
- قراردادهای پیشین (dual-n-back factory، مولد ماتریس یکتا-به‌ساخت، پنج‌نقطهٔ افزودن بازی، سه‌گارد، کلید متریک شرطی، PAUSED=unmount) پابرجا.

## ۴. دانش تجربی مهم (تازهٔ این نشست)

- **ترتیب فازها = قفل ورود دوباره:** PREPARE همگامِ قبل از await عملاً گارد StrictMode بود؛ هر جا ترتیب async را عوض می‌کنید، قفل جایگزین بگذارید (اینجا: `startPromise`). علامت رگرسیون در e2e: رکوردهای تکراری جلسه («aborted,aborted»).
- **e2e از error-context های `test-results/` علت را مستقیم نشان می‌دهد** (poll expected/received) — قبل از حدس زدن، آن را بخوانید.
- **PAUSED=unmount پیامد گسترده‌تری دارد که HANDOFF قبلی می‌دانست:** بازپخش محرک پس از resume دست‌کم ۹ بازی را می‌گیرد (نه فقط CD/AB/RS): number-sequence، running-span، ospan، symmetry-span، word-memory، audio-recall، memorise-grid، spatial-sequence، attentional-blink، reading-aloud (ازدست‌رفتن داده) — جزئیات و مکانیسم هر یک در GAMES-AUDIT §۲-۱.
- RT ثبت‌شده در بازی‌های چندفازی شامل زمان presentation است (مبدأ `trialShownAtMs` در advanceTrialInternal) — تحلیل/نمایش RT این بازی‌ها نیاز به baseline جدا دارد.
- درس‌های پیشین (StrictMode deferred-abort، relaxed IDB، lazy per-game، ویرایش حین e2e=HMR، …) پابرجا.

## ۵. مأموریت‌های تصویب‌شدهٔ نشست بعد (از صف ممیزی GAMES-AUDIT §۴)

1. **آلودگی replay پس از مکث (۹+ بازی)** با `useTrialGuards` (بدهی §۵-۱ قبلی): فاز/زمان سپری‌شده بیرون از عمر کامپوننت + پرچم contamination در stimulus خام + در CD پرش مستقیم به فاز test در remount. (بزرگ‌ترین برد اعتبار علمی)
2. **ریتم examiner-paced در PASAT** + متریک‌های dyad/string/before-next از دادهٔ خام.
3. **ثبات SOA در Go/No-Go و Simon** (تأخیر advance تا پایان پنجره پاسخ).
4. **Quota جایگاه هدف** در n-back ها و **تخصیص دقیق lag** در پلک توجه + عدم انتشار متریک bucket خالی.
5. **گذار «کلید شرطی»** برای ۶ بازی صفرِ جعلی (stroop/task-switching/go-no-go/RT/PM/AB) با الگوی Simon.
6. موارد متوسط: تصادفی‌کردن چرخهٔ قاعدهٔ WCST، stratification چرخش ذهنی، تمایز L5 تکمیل الگو، contentVersion-2 ماتریس/تغییریاب، d′ loglinear برای خانوادهٔ n-back، حذف data-* لودهنده از build تولیدی، لایهٔ تست کامپوننت حداقلی.
7. بدهی‌های معماری باقی‌مانده: تفکیک متا/انجین رجیستری، TRecord تایپ‌شده، ESLint، فرادادهٔ پژوهشی (pauseCount/روش ورودی/TTS-mode).

## ۶. پروتکل کاری (ثابت)

- گام‌های کوچک قابل‌راستی‌آزمایی؛ هر تغییر معنادار → تست؛ بدون تغییر بی‌صدا در تصمیم‌های قفل‌شده
- بدون ادعای بالینی/هوش؛ honest framing طبق `docs/SCIENTIFIC-VALIDATION.md` (+ §۷ و GAMES-AUDIT)
- گسترش محدوده فقط با تصمیم صریح کاربر
- دروازهٔ پایانی: `typecheck` + `npm test` + `npm run build` + `npm run e2e` کامل + push (+ exe در موج‌های بازی‌دار) — **و تا پایان e2e هیچ ویرایش فایلی**
- **قید دائمی کاربر:** هیچ API ابری/هوش مصنوعی/سرویس پولی/تشخیص گفتار — همه‌چیز محلی و آفلاین
- **در هر انتشار: `CACHE_VERSION` در public/sw.js را یک پوش بده** (الان v3)

## ۷. چک‌لیست شروع نشست بعد

1. `cd "E:\Mind Game" && git status` (تمیز) و `npm test` — انتظار **۵۴۷ سبز** (شکست → اول ایزوله)
2. `git pull --ff-only`
3. سلامت دیپلوی: ریشه 200؛ نام chunk زنده از باندل index — نه از index.html
4. سپس بخش ۵ با تصویب کاربر (پیشنهاد شروع: useTrialGuards + آلودگی replay)

## ۸. وضعیت دروازهٔ نهایی این نشست (سیزدهم)

- typecheck ✓ · unit **۵۴۷/۵۴۷** (۵۳۴ + ۱۳ تست جدید: شروع‌شکست‌خورده، قفل in-flight، بُر reading-aloud ×۲، AP ×۳، isFullRecall، word-blend ×۲، فریب word-scramble، چرخش بلوکی، ناوردایی رجیستری ×۲)
- e2e کامل: اول **۹۴/۹۹** (رگرسیون دو-رکوردی start در StrictMode-dev) → ریشه‌یابی از error-context → قفل in-flight → دوم **۹۹/۹۹ (۲۹٫۳د)**
- build ✓ (~۳۰KB) · CACHE v3 · exe بازسازی ✓ · کامیت + push (این نشست)
- (نشست دوازدهم: بازسازی سلامت/کارایی؛ یازدهم: موج دهم؛ درس‌ها در بخش ۴)
