import type {
  ExerciseConfig,
  ExerciseDefinition,
  ExerciseState,
  ExerciseSummary,
  ExerciseTrial,
  RecordedTrial,
} from '../../../../core/types'
import { SeededRandom } from '../../../../core/randomization/seeded-random'
import { deriveTrialSeed } from '../../../../core/randomization/derive-seed'
import { accuracyPercent, summarizeOutcomes } from '../../../../core/scoring/scoring'
import { countPersianWords } from '../../../../utils/persian'

/**
 * بلندخوانی (Reading Aloud) — حوزهٔ زبانی-شنیداری؛ موج زبانی.
 *
 * متن کوتاه فارسی نمایش داده می‌شود؛ کاربر خودش شروع و پایان خواندن را
 * می‌زند (زمان‌سنجی خودتنظیم، بدون میکروفون — تصویب کاربر) و پس از آن
 * پاسخ سؤال‌های فهم از همان متن را می‌دهد. متن در فاز سؤال پنهان می‌شود
 * تا عنصر حافظه زنده بماند. کل پاسخ مرحله — زمان خواندن + پاسخ‌ها — در
 * یک submitAnswer ثبت می‌شود (قرارداد یک-submit-per-trial).
 *
 * بانک محتوا دست‌ساز و پیش‌اعتبارسنجی‌شده است (الگوی شمارش هجا): هر متن
 * دو سؤال چهارگزینه‌ای دارد که پاسخشان فقط از خود متن برمی‌آید. شمارش
 * واژه‌ها در زمان ساخت مرحله با countPersianWords محاسبه می‌شود.
 */

/** یک سؤال فهم با چهار گزینه */
export interface ReadingQuestion {
  readonly prompt: string
  readonly choices: readonly string[]
  readonly correctIndex: number
}

/** یک متن بلندخوانی با سؤال‌های آن */
export interface ReadingPassage {
  readonly text: string
  readonly level: number
  readonly questions: readonly ReadingQuestion[]
}

/** بانک ۱۵ متنی — ۳ متن در هر سطح؛ پاسخ هر سؤال فقط از متن برمی‌آید */
export const PASSAGE_BANK_FA: readonly ReadingPassage[] = [
  // ─── سطح ۱ — جملات کوتاه و ساده ───
  {
    level: 1,
    text: 'صبح که شد، هوا روشن شد. نیکی پنجره را باز کرد و صدای پرندگان را شنید.',
    questions: [
      { prompt: 'نیکی صبح چه کرد؟', choices: ['پنجره را باز کرد', 'بیرون دوید', 'چای نوشید', 'به خواب رفت'], correctIndex: 0 },
      { prompt: 'نیکی چه صدایی شنید؟', choices: ['پرندگان', 'باران', 'ماشین', 'زنگ مدرسه'], correctIndex: 0 },
    ],
  },
  {
    level: 1,
    text: 'علی و سارا به نانوایی رفتند. علی دو نان خرید و سارا یک شیرینی.',
    questions: [
      { prompt: 'چه کسی شیرینی خرید؟', choices: ['سارا', 'علی', 'نانوا', 'مادرشان'], correctIndex: 0 },
      { prompt: 'علی چند نان خرید؟', choices: ['دو', 'یک', 'سه', 'هیچ'], correctIndex: 0 },
    ],
  },
  {
    level: 1,
    text: 'باران شروع شد. گربهٔ ما زیر صندلی خزید و به خواب رفت.',
    questions: [
      { prompt: 'گربه کجا پناه گرفت؟', choices: ['زیر صندلی', 'زیر میز', 'روی کاناپه', 'پشت در'], correctIndex: 0 },
      { prompt: 'گربه بعد از پناه‌گرفتن چه کرد؟', choices: ['به خواب رفت', 'میو کرد', 'شیر خورد', 'بازی کرد'], correctIndex: 0 },
    ],
  },
  // ─── سطح ۲ — چند جمله‌ای ساده ───
  {
    level: 2,
    text: 'مادر کیف مدرسهٔ مریم را آماده کرد. او یک کتاب، دو دفتر و یک خودکار آبی داخل کیف گذاشت. مریم کیف را برداشت و با خوشحالی به سمت مدرسه رفت.',
    questions: [
      { prompt: 'خودکار چه رنگی بود؟', choices: ['آبی', 'قرمز', 'سبز', 'مشکی'], correctIndex: 0 },
      { prompt: 'چه کسی کیف را آماده کرد؟', choices: ['مادر', 'مریم', 'معلم', 'خواهر مریم'], correctIndex: 0 },
    ],
  },
  {
    level: 2,
    text: 'صبح شنبه، پدربزرگ و امیر به پارک رفتند. امیر دو دور پیست دوید و بعد روی نیمکت کنار پدربزرگ نشست. پدربزرگ برای او یک پرتقال آورد.',
    questions: [
      { prompt: 'امیر بعد از دویدن کجا نشست؟', choices: ['روی نیمکت کنار پدربزرگ', 'روی چمن', 'کنار آبشار', 'روی الاکلنگ'], correctIndex: 0 },
      { prompt: 'پدربزرگ برای امیر چه آورد؟', choices: ['یک پرتقال', 'یک سیب', 'نان', 'آب‌یخ'], correctIndex: 0 },
    ],
  },
  {
    level: 2,
    text: 'شب باران بارید. صبح باغچه خیس بود و بوی خاک بلند می‌شد. مادرم گفت امروز نباید باغچه را آب بدهیم، چون زمین از قبل خیس است.',
    questions: [
      { prompt: 'چرا نباید باغچه را آب بدهند؟', choices: ['زمین از قبل خیس است', 'هوا سرد است', 'گیاه‌ها خشک‌اند', 'شیر آب خراب است'], correctIndex: 0 },
      { prompt: 'صبح چه چیزی بوی خوش داشت؟', choices: ['خاک خیس', 'گل‌ها', 'نان', 'باران'], correctIndex: 0 },
    ],
  },
  // ─── سطح ۳ — داستان کوتاه ───
  {
    level: 3,
    text: 'خانوادهٔ رضا برای سفر شمال آماده می‌شدند. آنها لباس‌های گرم را در چمدان گذاشتند، چون هوای آنجا سرد بود. ماشین ساعت شش صبح حرکت کرد. بعد از چهار ساعت، به جنگلی رسیدند که مه آن را پوشانده بود. رضا از پنجره فقط تنهٔ درخت‌ها را می‌دید.',
    questions: [
      { prompt: 'چرا لباس‌های گرم برداشتند؟', choices: ['هوای مقصد سرد بود', 'لباس تازه خریده بودند', 'خانه سرد بود', 'برای اسکی'], correctIndex: 0 },
      { prompt: 'رضا از پنجرهٔ ماشین چه دید؟', choices: ['تنهٔ درخت‌ها', 'دریا', 'تپه‌های سبز', 'خانه‌های چوبی'], correctIndex: 0 },
    ],
  },
  {
    level: 3,
    text: 'کتابخانهٔ شهر هر روز، به‌جز پنجشنبه، باز است. نازنین هر هفته دو کتاب قرض می‌گیرد. او باید کتاب‌ها را در دو هفته پس بدهد؛ وگرنه برای هر روز دیرکرد مبلغ کمی می‌پردازد. نازنین قصه‌های تاریخی را از همه بیشتر دوست دارد.',
    questions: [
      { prompt: 'کتابخانه چه روزی بسته است؟', choices: ['پنجشنبه', 'جمعه', 'شنبه', 'دوشنبه'], correctIndex: 0 },
      { prompt: 'نازنین چه کتاب‌هایی را بیشتر دوست دارد؟', choices: ['قصه‌های تاریخی', 'کتاب آشپزی', 'کتاب علمی', 'شعر'], correctIndex: 0 },
    ],
  },
  {
    level: 3,
    text: 'نانوایی کوچهٔ ما هر روز ساعت پنج صبح کارش را شروع می‌کند. نان سنگک زودتر از همه تمام می‌شود و باید تا ساعت هشت صبر کنی تا نوبت تازه بیاید. پدربزرگ می‌گوید بوی نان تازه، بهترین بوی صبح است.',
    questions: [
      { prompt: 'نانوایی چند صبح کارش را شروع می‌کند؟', choices: ['ساعت پنج', 'ساعت شش', 'ساعت هفت', 'ساعت چهار'], correctIndex: 0 },
      { prompt: 'کدام نان زودتر تمام می‌شود؟', choices: ['سنگک', 'باتون', 'بربری', 'تافتون'], correctIndex: 0 },
    ],
  },
  // ─── سطح ۴ — متن علمی/روایی متوسط ───
  {
    level: 4,
    text: 'زنبورعسل برای ساختن یک قاشق غذاخوری عسل باید از هزاران گل شهد بگیرد. آنها شهد را در بدن خود نگه می‌دارند و در کندو آن را به عسل تبدیل می‌کنند. برای خشک‌شدن عسل، زنبورها با بال‌های خود هوا را به داخل کندو می‌دمند. عسل در ظرف دربسته سال‌ها خراب نمی‌شود و زنبورها از آن به‌عنوان خوراک زمستان استفاده می‌کنند.',
    questions: [
      { prompt: 'زنبورها عسل را در زمستان برای چه نگه می‌دارند؟', choices: ['خوراک زمستان', 'فروش به انسان', 'ساختن کندوی تازه', 'تغذیهٔ گل‌ها'], correctIndex: 0 },
      { prompt: 'زنبورها چطور عسل را خشک می‌کنند؟', choices: ['با بال‌دادن هوا داخل کندو', 'آفتاب خشکش می‌کند', 'با پاکوبیدن شهد', 'بیرون بردن آن از کندو'], correctIndex: 0 },
    ],
  },
  {
    level: 4,
    text: 'گیاه کویری معمولاً ریشه‌های بسیار طولانی دارد تا از عمق خاک آب پیدا کند. بعضی از این گیاهان برگ‌های خود را به خار تبدیل کرده‌اند تا آب کمتری از دست بدهند. برخی دیگر فقط پس از باران کوتاه گل می‌کنند و بذرشان می‌تواند سال‌ها در خاک خشک منتظر بماند. به همین دلیل، پس از هر باران بهاری، بیابان برای چند روز پر از گل می‌شود.',
    questions: [
      { prompt: 'چرا برگ‌های بعضی گیاهان کویری به خار تبدیل شده است؟', choices: ['تا آب کمتری از دست بدهند', 'تا حیوانات نخورندشان', 'تا باد آنها را نشکند', 'تا خار‌ها بذر شوند'], correctIndex: 0 },
      { prompt: 'بیابان چه زمانی پر از گل می‌شود؟', choices: ['پس از باران بهاری', 'در تابستان گرم', 'پس از آبیاری', 'در زمستان برفی'], correctIndex: 0 },
    ],
  },
  {
    level: 4,
    text: 'پدربزرگِ سمانه ساعت‌سازی قدیمی است. او می‌گوید صدای تیک‌تاک ساعت‌های کوکی با هم فرق دارد و ساعتِ خوب صدایی یکنواخت دارد. تعمیر یک ساعت کوکی گاهی چند روز طول می‌کشد، چون هر چرخ‌دنده باید در جای درست خود بنشیند. سمانه هر تابستان چند هفته در کارگاه پدربزرگ کار می‌کند و یاد گرفته عقربه‌ها را با موچین جابه‌جا کند.',
    questions: [
      { prompt: 'طبق پدربزرگ، صدای ساعت خوب چگونه است؟', choices: ['یکنواخت', 'بلند', 'آرام و کوتاه', 'دوتایی'], correctIndex: 0 },
      { prompt: 'سمانه عقربه‌ها را با چه ابزاری جابه‌جا می‌کند؟', choices: ['موچین', 'انبردست', 'پیچ‌گوشتی', 'انگشت'], correctIndex: 0 },
    ],
  },
  // ─── سطح ۵ — متن بلندتر با جزئیات ───
  {
    level: 5,
    text: 'چرخهٔ آب در طبیعت هرگز متوقف نمی‌شود. خورشید آب دریاچه‌ها و دریاها را تبخیر می‌کند و بخار آب به سمت آسمان بالا می‌رود. در ارتفاع زیاد، هوای سرد بخار را به قطره‌های ریز تبدیل می‌کند و ابر شکل می‌گیرد. وقتی قطره‌ها بزرگ و سنگین شوند، به‌صورت باران یا برف به زمین برمی‌گردند. بخشی از این آب در رودها جاری می‌شود و دوباره به دریا می‌رسد؛ بخشی هم در خاک فرو می‌رود و چشمه‌ها را زنده نگه می‌دارد.',
    questions: [
      { prompt: 'چه چیزی آب دریاها را تبخیر می‌کند؟', choices: ['خورشید', 'باد', 'گرمای زمین', 'موج‌ها'], correctIndex: 0 },
      { prompt: 'ابر چگونه شکل می‌گیرد؟', choices: ['بخار در هوای سردِ ارتفاع به قطره تبدیل می‌شود', 'دود به آسمان می‌رود', 'باران منجمد می‌شود', 'برف در هوا ذوب می‌شود'], correctIndex: 0 },
    ],
  },
  {
    level: 5,
    text: 'نوشتن در گذشته کار سختی بود. انسان‌های نخستین روی سنگ و سپس روی ورق‌های گِل می‌نوشتند. مصریان باستان از نیِ شیپوری کاغذ می‌ساختند و چینی‌ها کاغذ نرم و ارزان را از الیاف درختان اختراع کردند. با آمدن ماشین چاپ، کتاب از کالای گران به چیزی تبدیل شد که تقریباً همه می‌توانستند بخرند. امروزه با گوشی و رایانه، هر کس می‌تواند هزاران کتاب را در چند ثانیه همراه خود داشته باشد.',
    questions: [
      { prompt: 'کاغذ نرم و ارزان را چه کسانی اختراع کردند؟', choices: ['چینی‌ها', 'مصریان', 'یونانیان', 'ایرانیان'], correctIndex: 0 },
      { prompt: 'ماشین چاپ چه تغییری در کتاب ایجاد کرد؟', choices: ['کتاب برای تقریباً همه قابل‌خرید شد', 'کتاب‌ها سنگین‌تر شدند', 'نوشتن سخت‌تر شد', 'کتاب فقط برای پادشاهان ماند'], correctIndex: 0 },
    ],
  },
  {
    level: 5,
    text: 'خواب کافی برای مغز بسیار مهم است. در خواب، مغز خاطره‌های روز را مرتب می‌کند و اطلاعات تازه را در حافظهٔ بلندمدت می‌نهد. پژوهش‌ها نشان می‌دهند کودکان به حدود ده ساعت و بزرگسالان به حدود هشت ساعت خواب نیاز دارند. نور شدید شبانه مغز را گول می‌زند و می‌پندارد هنوز روز است؛ به همین دلیل بهتر است یک ساعت پیش از خواب از صفحهٔ گوشی دور بمانیم. خواب منظم، تمرکز روز بعد را بهتر می‌کند.',
    questions: [
      { prompt: 'مغز در خواب با خاطره‌های روز چه می‌کند؟', choices: ['مرتب می‌کند و در حافظهٔ بلندمدت می‌نهد', 'همه را پاک می‌کند', 'فقط خاطره‌های ناراحت نگه می‌دارد', 'به خواب‌دیدن تبدیل می‌کند'], correctIndex: 0 },
      { prompt: 'چرا بهتر است پیش از خواب از صفحهٔ گوشی دور بمانیم؟', choices: ['نورش مغز را گول می‌زند که هنوز روز است', 'گوشی شارژ تمام می‌کند', 'صدای پیام بیدارمان می‌کند', 'چشم‌ها خشک می‌شوند'], correctIndex: 0 },
    ],
  },
]

export interface ReadingAloudConfig extends ExerciseConfig {
  /** سطح بانک — همان عدد دشواری */
  readonly passageLevel: number
  /** تعداد متن‌های جلسه (بانک هر سطح ۳ متن دارد) */
  readonly trials: number
}

export interface ReadingAloudState extends ExerciseState<ReadingAloudConfig> {
  readonly currentTrial: ReadingAloudTrial | null
  /** ترتیب کشیده‌شدهٔ متن‌های این جلسه (بدون تکرار از زیربانک سطح) */
  readonly order: readonly number[]
  /** شمارهٔ متن بعدی در order */
  readonly drawn: number
}

export interface ReadingAloudTrial extends ExerciseTrial {
  readonly trialIndex: number
  readonly passage: ReadingPassage
  /**
   * سؤال‌های این مرحله با گزینه‌های بُرخورده — بانک، گزینهٔ درست را همیشه
   * در جایگاه صفر نگه می‌داشت (تصادفی‌سازی در زمان ساخت انجام نشده بود)؛
   * بُر زدن per-trial با بذر مرحله انجام می‌شود و جایگاه پاسخ درست در
   * هر مرحله/بذر متفاوت است (contentVersion 2).
   */
  readonly questions: readonly ReadingQuestion[]
  /** شمارش واژهٔ متن — محاسبه در زمان ساخت مرحله */
  readonly wordCount: number
}

/** پاسخ: زمان خواندن + پاسخ هر سؤال (null = بی‌پاسخ) */
export interface ReadingAloudAnswer {
  readonly readingMs: number
  readonly answers: readonly (number | null)[]
}

export const READING_ALOUD_ID = 'reading-aloud'
export const READING_ALOUD_VERSION = '1.0.0'
export const READING_ALOUD_CONTENT_VERSION = '2'

const TOTAL_TRIALS = 3

export function configForDifficulty(difficulty: number): ReadingAloudConfig {
  if (difficulty < 1 || difficulty > 5) {
    throw new RangeError('دشواری باید بین ۱ تا ۵ باشد')
  }
  return { difficulty, passageLevel: difficulty, trials: TOTAL_TRIALS }
}

/** کشیدن بدون تکرار از زیربانک سطح (الگوی شمارش هجا) */
function drawPassages(config: ReadingAloudConfig, seed: number): number[] {
  const levelIndices = PASSAGE_BANK_FA.map((p, i) => ({ p, i }))
    .filter(({ p }) => p.level === config.passageLevel)
    .map(({ i }) => i)
  if (levelIndices.length === 0) {
    throw new Error(`متنی برای سطح ${config.passageLevel} در بانک نیست`)
  }
  const rng = new SeededRandom(seed)
  const shuffled = rng.shuffle(levelIndices)
  // جلسه ۳ متنی دارد و زیربانک هم ۳تایی — بدون دور دوم؛ برای اطمینان،
  // اگر جلسه‌ای بزرگ‌تر از بانک شد، از ابتدای ترتیب ادامه می‌دهیم
  return Array.from({ length: config.trials }, (_, t) => shuffled[t % shuffled.length] as number)
}

export const readingAloudDefinition: ExerciseDefinition<
  ReadingAloudConfig,
  ReadingAloudState,
  ReadingAloudTrial,
  ReadingAloudAnswer | null
> = {
  id: READING_ALOUD_ID,
  version: READING_ALOUD_VERSION,
  contentVersion: READING_ALOUD_CONTENT_VERSION,
  domain: 'verbal-auditory',

  createSession(sessionId, config, seed) {
    return {
      sessionId,
      config,
      seed,
      nextTrialIndex: 0,
      currentTrial: null,
      order: drawPassages(config, seed),
      drawn: 0,
      results: [],
    }
  },

  nextTrial(state) {
    if (state.nextTrialIndex >= state.config.trials) {
      throw new Error('همه مراحل جلسه تولید شده‌اند')
    }
    const bankIndex = state.order[state.drawn] as number
    const passage = PASSAGE_BANK_FA[bankIndex] as ReadingPassage
    // بُر زدن گزینه‌های هر سؤال با بذر مرحله — پاسخ درست دیگر لکه‌نشان
    // نیست (در v1 همیشه گزینهٔ نخست بود: همیشه‌انتخابِ گزینهٔ اول = ۱۰۰٪)
    const rng = new SeededRandom(deriveTrialSeed(state.seed, state.nextTrialIndex))
    const questions: ReadingQuestion[] = passage.questions.map((question) => {
      const choices = rng.shuffle([...question.choices])
      return {
        prompt: question.prompt,
        choices,
        correctIndex: choices.indexOf(question.choices[question.correctIndex] as string),
      }
    })
    const trial: ReadingAloudTrial = {
      trialIndex: state.nextTrialIndex,
      passage,
      questions,
      wordCount: countPersianWords(passage.text),
      responseWindowMs: null,
    }
    return {
      state: {
        ...state,
        nextTrialIndex: trial.trialIndex + 1,
        drawn: state.drawn + 1,
        currentTrial: trial,
      },
      trial,
    }
  },

  submitAnswer(state, answer, reactionTimeMs) {
    const trial = state.currentTrial
    if (!trial) throw new Error('مرحله فعلی برای ثبت پاسخ وجود ندارد')

    const answers = answer?.answers ?? trial.questions.map(() => null)
    const allCorrect =
      answer !== null &&
      trial.questions.every((q, i) => answers[i] === q.correctIndex)

    const record: RecordedTrial = {
      trialIndex: trial.trialIndex,
      stimulus: {
        text: trial.passage.text,
        level: trial.passage.level,
        questions: trial.questions,
        readingMs: answer?.readingMs ?? null,
        answers,
      },
      expected: trial.questions.map((q) => q.correctIndex),
      given: answer === null ? null : answers,
      outcome: answer === null ? 'omission' : allCorrect ? 'correct' : 'incorrect',
      correct: answer !== null && allCorrect,
      reactionTimeMs: answer?.readingMs ?? reactionTimeMs,
    }
    return { ...state, currentTrial: null, results: [...state.results, record] }
  },

  isComplete(state) {
    return state.results.length >= state.config.trials
  },

  getSummary(state): ExerciseSummary {
    const totals = summarizeOutcomes(state.results)

    let readingMsSum = 0
    let wpmSum = 0
    let wpmCount = 0
    let questionsCorrect = 0
    let questionsTotal = 0
    for (const record of state.results) {
      const s = record.stimulus as {
        text: string
        questions: readonly ReadingQuestion[]
        readingMs: number | null
        answers: readonly (number | null)[]
      }
      s.questions.forEach((q, i) => {
        questionsTotal += 1
        if (s.answers[i] === q.correctIndex) questionsCorrect += 1
      })
      if (s.readingMs !== null && s.readingMs > 0) {
        readingMsSum += s.readingMs
        wpmSum += countPersianWords(s.text) / (s.readingMs / 60_000)
        wpmCount += 1
      }
    }
    return {
      exerciseId: READING_ALOUD_ID,
      sessionId: state.sessionId,
      exerciseVersion: READING_ALOUD_VERSION,
      contentVersion: READING_ALOUD_CONTENT_VERSION,
      domain: 'verbal-auditory',
      difficulty: state.config.difficulty,
      ...totals,
      metrics: {
        passagesRead: state.results.length,
        meanReadingMs: wpmCount === 0 ? 0 : Math.round(readingMsSum / wpmCount),
        wordsPerMinute: wpmCount === 0 ? 0 : Math.round(wpmSum / wpmCount),
        comprehensionAccuracy: accuracyPercent(questionsCorrect, questionsTotal),
      },
    }
  },
}
