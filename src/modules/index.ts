import { GameRegistry } from '../core/registry/game-registry'
import type { RegisteredExercise } from '../core/registry/game-registry'
import type { ExerciseConfig } from '../core/types'
import {
  NUMBER_SEQUENCE_CONTENT_VERSION,
  NUMBER_SEQUENCE_ID,
  NUMBER_SEQUENCE_VERSION,
  configForDifficulty as nsConfigForDifficulty,
  numberSequenceDefinition,
} from './working-memory/games/number-sequence/engine'
import {
  NBACK_CONTENT_VERSION,
  NBACK_ID,
  NBACK_VERSION,
  configForDifficulty as nbackConfigForDifficulty,
  nBackDefinition,
} from './working-memory/games/n-back/engine'
import {
  DUAL_NBACK_CONTENT_VERSION,
  DUAL_NBACK_ID,
  DUAL_NBACK_VERSION,
  configForDifficulty as dualNbackConfigForDifficulty,
  dualNBackDefinition,
} from './working-memory/games/dual-n-back/engine'
import { DUAL_NBACK_META_FA } from './working-memory/games/dual-n-back/meta'
import {
  PASAT_CONTENT_VERSION,
  PASAT_ID,
  PASAT_VERSION,
  configForDifficulty as pasatConfigForDifficulty,
  pasatDefinition,
} from './processing-speed/games/pasat/engine'
import { PASAT_META_FA } from './processing-speed/games/pasat/meta'
import {
  ASSOCIATIVE_PAIRS_CONTENT_VERSION,
  ASSOCIATIVE_PAIRS_ID,
  ASSOCIATIVE_PAIRS_VERSION,
  configForDifficulty as apConfigForDifficulty,
  associativePairsDefinition,
} from './long-term-memory/games/associative-pairs/engine'
import { ASSOCIATIVE_PAIRS_META_FA } from './long-term-memory/games/associative-pairs/meta'
import {
  GO_NO_GO_CONTENT_VERSION,
  GO_NO_GO_ID,
  GO_NO_GO_VERSION,
  configForDifficulty as gngConfigForDifficulty,
  goNoGoDefinition,
} from './attention-control/games/go-no-go/engine'
import {
  STROOP_CONTENT_VERSION,
  STROOP_ID,
  STROOP_VERSION,
  configForDifficulty as stroopConfigForDifficulty,
  stroopDefinition,
} from './attention-control/games/stroop/engine'
import {
  CALCULATION_20_CONTENT_VERSION,
  CALCULATION_20_ID,
  CALCULATION_20_VERSION,
  calculation20Definition,
  configForDifficulty as calcConfigForDifficulty,
} from './processing-speed/games/calculation-20/engine'
import {
  MEMORISE_GRID_CONTENT_VERSION,
  MEMORISE_GRID_ID,
  MEMORISE_GRID_VERSION,
  configForDifficulty as gridConfigForDifficulty,
  memoriseGridDefinition,
} from './visual-spatial/games/memorise-grid/engine'
import {
  SPATIAL_SEQUENCE_CONTENT_VERSION,
  SPATIAL_SEQUENCE_ID,
  SPATIAL_SEQUENCE_VERSION,
  configForDifficulty as spatialConfigForDifficulty,
  spatialSequenceDefinition,
} from './visual-spatial/games/spatial-sequence/engine'
import {
  REACTION_TIME_CONTENT_VERSION,
  REACTION_TIME_ID,
  REACTION_TIME_VERSION,
  configForDifficulty as rtConfigForDifficulty,
  reactionTimeDefinition,
} from './sensorimotor/games/reaction-time/engine'
import {
  SYLLABLE_COUNTING_CONTENT_VERSION,
  SYLLABLE_COUNTING_ID,
  SYLLABLE_COUNTING_VERSION,
  configForDifficulty as syllableConfigForDifficulty,
  syllableCountingDefinition,
} from './verbal-auditory/games/syllable-counting/engine'
import {
  WORD_MEMORY_CONTENT_VERSION,
  WORD_MEMORY_ID,
  WORD_MEMORY_VERSION,
  configForDifficulty as wordMemoryConfigForDifficulty,
  wordMemoryDefinition,
} from './verbal-auditory/games/word-memory/engine'
import {
  PATTERN_COMPLETION_CONTENT_VERSION,
  PATTERN_COMPLETION_ID,
  PATTERN_COMPLETION_VERSION,
  configForDifficulty as patternConfigForDifficulty,
  patternCompletionDefinition,
} from './reasoning/games/pattern-completion/engine'
import {
  SEQUENCE_LOGIC_CONTENT_VERSION,
  SEQUENCE_LOGIC_ID,
  SEQUENCE_LOGIC_VERSION,
  configForDifficulty as seqLogicConfigForDifficulty,
  sequenceLogicDefinition,
} from './reasoning/games/sequence-logic/engine'
import {
  CALCULATION_100_CONTENT_VERSION,
  CALCULATION_100_ID,
  CALCULATION_100_VERSION,
  calculation100Definition,
  configForDifficulty as calc100ConfigForDifficulty,
} from './processing-speed/games/calculation-100/engine'
import { CALCULATION_100_META_FA } from './processing-speed/games/calculation-100/meta'
import {
  CONTINUOUS_COUNTDOWN_ID,
  configForDifficulty as ccountConfigForDifficulty,
  continuousCountdownDefinition,
} from './processing-speed/games/continuous-countdown/engine'
import { CONTINUOUS_COUNTDOWN_META_FA } from './processing-speed/games/continuous-countdown/meta'
import {
  MISSING_OPERATOR_CONTENT_VERSION,
  MISSING_OPERATOR_ID,
  MISSING_OPERATOR_VERSION,
  configForDifficulty as missopConfigForDifficulty,
  missingOperatorDefinition,
} from './processing-speed/games/missing-operator/engine'
import { MISSING_OPERATOR_META_FA } from './processing-speed/games/missing-operator/meta'
import {
  NUMBER_COMPARISON_CONTENT_VERSION,
  NUMBER_COMPARISON_ID,
  NUMBER_COMPARISON_VERSION,
  configForDifficulty as numcmpConfigForDifficulty,
  numberComparisonDefinition,
} from './processing-speed/games/number-comparison/engine'
import { NUMBER_COMPARISON_META_FA } from './processing-speed/games/number-comparison/meta'
import {
  OBJECT_TRACKING_CONTENT_VERSION,
  OBJECT_TRACKING_ID,
  OBJECT_TRACKING_VERSION,
  configForDifficulty as otConfigForDifficulty,
  objectTrackingDefinition,
} from './visual-spatial/games/object-tracking/engine'
import { OBJECT_TRACKING_META_FA } from './visual-spatial/games/object-tracking/meta'
import {
  MENTAL_ROTATION_CONTENT_VERSION,
  MENTAL_ROTATION_ID,
  MENTAL_ROTATION_VERSION,
  configForDifficulty as mrConfigForDifficulty,
  mentalRotationDefinition,
} from './visual-spatial/games/mental-rotation/engine'
import { MENTAL_ROTATION_META_FA } from './visual-spatial/games/mental-rotation/meta'
import {
  MIRROR_CLOCK_CONTENT_VERSION,
  MIRROR_CLOCK_ID,
  MIRROR_CLOCK_VERSION,
  configForDifficulty as mcConfigForDifficulty,
  mirrorClockDefinition,
} from './visual-spatial/games/mirror-clock/engine'
import { MIRROR_CLOCK_META_FA } from './visual-spatial/games/mirror-clock/meta'
import {
  BLOCK_HEIGHT_CONTENT_VERSION,
  BLOCK_HEIGHT_ID,
  BLOCK_HEIGHT_VERSION,
  blockHeightDefinition,
  configForDifficulty as bhConfigForDifficulty,
} from './visual-spatial/games/block-height/engine'
import { BLOCK_HEIGHT_META_FA } from './visual-spatial/games/block-height/meta'
import {
  TASK_SWITCHING_CONTENT_VERSION,
  TASK_SWITCHING_ID,
  TASK_SWITCHING_VERSION,
  configForDifficulty as tsConfigForDifficulty,
  taskSwitchingDefinition,
} from './attention-control/games/task-switching/engine'
import { TASK_SWITCHING_META_FA } from './attention-control/games/task-switching/meta'
import {
  OPERATION_SPAN_CONTENT_VERSION,
  OPERATION_SPAN_ID,
  OPERATION_SPAN_VERSION,
  configForDifficulty as ospanConfigForDifficulty,
  operationSpanDefinition,
} from './working-memory/games/operation-span/engine'
import { OPERATION_SPAN_META_FA } from './working-memory/games/operation-span/meta'
import {
  SYMMETRY_SPAN_CONTENT_VERSION,
  SYMMETRY_SPAN_ID,
  SYMMETRY_SPAN_VERSION,
  configForDifficulty as symspanConfigForDifficulty,
  symmetrySpanDefinition,
} from './visual-spatial/games/symmetry-span/engine'
import { SYMMETRY_SPAN_META_FA } from './visual-spatial/games/symmetry-span/meta'
import {
  RULE_DISCOVERY_CARD_SORTING_CONTENT_VERSION,
  RULE_DISCOVERY_CARD_SORTING_ID,
  RULE_DISCOVERY_CARD_SORTING_VERSION,
  configForDifficulty as rdcsConfigForDifficulty,
  ruleDiscoveryCardSortingDefinition,
} from './reasoning/games/rule-discovery-card-sorting/engine'
import { RULE_DISCOVERY_CARD_SORTING_META_FA } from './reasoning/games/rule-discovery-card-sorting/meta'
import {
  READING_ALOUD_CONTENT_VERSION,
  READING_ALOUD_ID,
  READING_ALOUD_VERSION,
  configForDifficulty as raConfigForDifficulty,
  readingAloudDefinition,
} from './verbal-auditory/games/reading-aloud/engine'
import { READING_ALOUD_META_FA } from './verbal-auditory/games/reading-aloud/meta'
import {
  WORD_SCRAMBLE_CONTENT_VERSION,
  WORD_SCRAMBLE_ID,
  WORD_SCRAMBLE_VERSION,
  configForDifficulty as wsConfigForDifficulty,
  wordScrambleDefinition,
} from './verbal-auditory/games/word-scramble/engine'
import { WORD_SCRAMBLE_META_FA } from './verbal-auditory/games/word-scramble/meta'
import {
  AUDIO_RECALL_CONTENT_VERSION,
  AUDIO_RECALL_ID,
  AUDIO_RECALL_VERSION,
  configForDifficulty as arConfigForDifficulty,
  audioRecallDefinition,
} from './verbal-auditory/games/audio-recall/engine'
import { AUDIO_RECALL_META_FA } from './verbal-auditory/games/audio-recall/meta'
import {
  WORD_BLEND_CONTENT_VERSION,
  WORD_BLEND_ID,
  WORD_BLEND_VERSION,
  configForDifficulty as wbConfigForDifficulty,
  wordBlendDefinition,
} from './verbal-auditory/games/word-blend/engine'
import { WORD_BLEND_META_FA } from './verbal-auditory/games/word-blend/meta'

/**
 * ثبت صریح تمرین‌های MVP در Registry — هیچ ثبت خودکار/جادویی وجود ندارد؛
 * افزودن بازی یعنی افزودن import و یک register در همین فایل.
 */

const numberSequence: RegisteredExercise = {
  definition: numberSequenceDefinition,
  meta: {
    id: NUMBER_SEQUENCE_ID,
    nameFa: 'توالی اعداد',
    descriptionFa: 'ارقام یکی‌یکی نمایش داده می‌شوند؛ باید همان ترتیب را از حافظه بازسازی کنی.',
    domain: 'working-memory',
    exerciseType: 'numeric',
    effects: ['working-memory'],
    version: NUMBER_SEQUENCE_VERSION,
    contentVersion: NUMBER_SEQUENCE_CONTENT_VERSION,
    instructionsFa: [
      'ارقام به‌ترتیب و یکی‌یکی روی صفحه ظاهر می‌شوند.',
      'توالی را به همان ترتیب به خاطر بسپار.',
      'پس از پنهان‌شدن ارقام، همان ترتیب را با صفحه‌کلید وارد کن.',
      '۱۰ مرحله در هر جلسه؛ با بالا رفتن سطح، توالی طولانی‌تر و سریع‌تر می‌شود.',
    ],
    difficultyLevels: [1, 2, 3, 4, 5],
    plannedTrials: 10,
    metricLabelsFa: {
      meanCorrectPositionRate: 'میانگین ارقام درست در جای درست (٪)',
      sequenceLength: 'طول توالی',
    },
  },
}

const goNoGo: RegisteredExercise = {
  definition: goNoGoDefinition,
  meta: {
    id: GO_NO_GO_ID,
    nameFa: 'برو / نرو',
    descriptionFa: 'به دایره سریع واکنش نشان بده و به مربع هیچ واکنشی نشان نده.',
    domain: 'attention-control',
    exerciseType: 'reaction',
    effects: ['attention-control'],
    version: GO_NO_GO_VERSION,
    contentVersion: GO_NO_GO_CONTENT_VERSION,
    instructionsFa: [
      'دایره سبز = برو: در سریع‌ترین زمان روی صفحه بزن.',
      'مربع قرمز = نرو: دست خود را نگه دار و واکنش نشان نده.',
      'واکنش به مربع «خطای ارتکاب» و بی‌واکنشی به دایره «خطای ازقلم‌افتادن» ثبت می‌شود.',
      '۴۰ محرک در هر جلسه؛ با بالا رفتن سطح، زمان کمتری برای تصمیم داری.',
    ],
    difficultyLevels: [1, 2, 3, 4, 5],
    plannedTrials: 40,
    metricLabelsFa: {
      commissionErrors: 'خطای ارتکاب (واکنش به مربع)',
      omissionErrors: 'خطای ازقلم‌افتادن (بی‌واکنشی به دایره)',
      medianGoReactionTimeMs: 'میانه واکنش به دایره (میلی‌ثانیه)',
      goTrials: 'تعداد محرک برو',
      nogoTrials: 'تعداد محرک نرو',
    },
  },
}

const calculation20: RegisteredExercise = {
  definition: calculation20Definition,
  meta: {
    id: CALCULATION_20_ID,
    nameFa: 'محاسبه × ۲۰',
    descriptionFa: 'به ۲۰ سؤال حساب سریع و دقیق پاسخ بده؛ سرعت و دقت جداگانه سنجیده می‌شوند.',
    domain: 'processing-speed',
    exerciseType: 'numeric',
    effects: ['processing-speed'],
    version: CALCULATION_20_VERSION,
    contentVersion: CALCULATION_20_CONTENT_VERSION,
    instructionsFa: [
      '۲۰ سؤال جمع، تفریق، ضرب و (در سطح‌های بالا) تقسیم دقیق داری.',
      'پاسخ را با صفحه‌کلید عددی تایپ و تأیید کن.',
      'سؤال منفرد مهلت زمانی ندارد؛ مجموع زمان ملاک است.',
      'پاسخ سریع ولی نادرست امتیاز بیشتری نمی‌آورد — دقت جداگانه ثبت می‌شود.',
    ],
    difficultyLevels: [1, 2, 3, 4, 5],
    plannedTrials: 20,
    metricLabelsFa: {
      questionsPerMinute: 'سؤال بر دقیقه',
      totalAnswerTimeMs: 'مجموع زمان پاسخ (میلی‌ثانیه)',
    },
  },
}

const memoriseGrid: RegisteredExercise = {
  definition: memoriseGridDefinition,
  meta: {
    id: MEMORISE_GRID_ID,
    nameFa: 'شبکه حافظه',
    descriptionFa: 'مکان خانه‌های روشن شبکه را به خاطر بسپار و همان‌ها را انتخاب کن.',
    domain: 'visual-spatial',
    exerciseType: 'spatial',
    effects: ['visual-spatial', 'working-memory'],
    version: MEMORISE_GRID_VERSION,
    contentVersion: MEMORISE_GRID_CONTENT_VERSION,
    instructionsFa: [
      'چند خانه از شبکه کوتاه روشن می‌شوند.',
      'مکان آن‌ها را به خاطر بسپار.',
      'پس از خاموش‌شدن، همان خانه‌ها را انتخاب و تأیید کن.',
      '۱۰ مرحله در هر جلسه؛ شبکه بزرگ‌تر و خانه‌های بیشتر با سطح بالاتر.',
    ],
    difficultyLevels: [1, 2, 3, 4, 5],
    plannedTrials: 10,
    metricLabelsFa: {
      meanOverlapRate: 'میانگین خانه‌های به‌خاطرسپرده‌شده (٪)',
      gridSize: 'ابعاد شبکه',
      activeCells: 'تعداد خانه‌های هدف',
    },
  },
}

const nBack: RegisteredExercise = {
  definition: nBackDefinition,
  meta: {
    id: NBACK_ID,
    nameFa: 'ان-بک',
    descriptionFa: 'اگر حرف فعلی با حرف N مرحله قبل یکی بود، دکمه تطبیق را بزن.',
    domain: 'working-memory',
    exerciseType: 'verbal',
    effects: ['working-memory', 'attention-control'],
    version: NBACK_VERSION,
    contentVersion: NBACK_CONTENT_VERSION,
    instructionsFa: [
      'حروف یکی‌یکی نمایش داده می‌شوند.',
      'اگر حرف فعلی با حرفِ N مرحله قبل یکسان بود، «تطبیق» را بزن.',
      'اگر یکسان نبود، هیچ دکمه‌ای نزن و صبر کن.',
      '۲۵ محرک در هر جلسه؛ با بالا رفتن سطح، N و سرعت نمایش بیشتر می‌شود.',
    ],
    difficultyLevels: [1, 2, 3, 4, 5],
    plannedTrials: 25,
    metricLabelsFa: {
      hits: 'تطبیق‌های درست (hit)',
      misses: 'اهداف ازقلم‌افتاده (miss)',
      falseAlarms: 'تطبیق‌های نابجا (false alarm)',
      correctRejections: 'خودداری‌های درست',
    },
  },
}

/** موج ۶ — ان-بک دوگانه (متادیتای فارسی از meta.ts همان بازی) */
const dualNBack: RegisteredExercise = {
  definition: dualNBackDefinition,
  meta: {
    id: DUAL_NBACK_ID,
    domain: 'working-memory',
    version: DUAL_NBACK_VERSION,
    contentVersion: DUAL_NBACK_CONTENT_VERSION,
    ...DUAL_NBACK_META_FA,
  },
}

/** موج ۶ — جمع زنجیره‌ای گام‌دار (پاسات) */
const pasat: RegisteredExercise = {
  definition: pasatDefinition,
  meta: {
    id: PASAT_ID,
    domain: 'processing-speed',
    version: PASAT_VERSION,
    contentVersion: PASAT_CONTENT_VERSION,
    ...PASAT_META_FA,
  },
}

/** موج ۶ — حافظهٔ انجمنی؛ نخستین بازی حوزهٔ هشتم (حافظه بلندمدت) */
const associativePairs: RegisteredExercise = {
  definition: associativePairsDefinition,
  meta: {
    id: ASSOCIATIVE_PAIRS_ID,
    domain: 'long-term-memory',
    version: ASSOCIATIVE_PAIRS_VERSION,
    contentVersion: ASSOCIATIVE_PAIRS_CONTENT_VERSION,
    ...ASSOCIATIVE_PAIRS_META_FA,
  },
}

const stroop: RegisteredExercise = {
  definition: stroopDefinition,
  meta: {
    id: STROOP_ID,
    nameFa: 'استرووپ',
    descriptionFa: 'رنگِ جوهرِ کلمه را انتخاب کن، نه معنی کلمه را — تمرین کلاسیک مهار تداخل.',
    domain: 'attention-control',
    exerciseType: 'verbal',
    effects: ['attention-control', 'processing-speed'],
    version: STROOP_VERSION,
    contentVersion: STROOP_CONTENT_VERSION,
    instructionsFa: [
      'نام یک رنگ با جوهرِ رنگ دیگری نوشته می‌شود.',
      'فقط رنگِ جوهر (رنگی که کلمه با آن نوشته شده) را انتخاب کن.',
      'به معنی کلمه توجه نکن — همین تداخل است که تمرین را می‌سازد.',
      '۲۰ محرک در هر جلسه؛ با بالا رفتن سطح، ناهم‌خوان‌ها بیشتر و زمان کمتر می‌شود.',
    ],
    difficultyLevels: [1, 2, 3, 4, 5],
    plannedTrials: 20,
    metricLabelsFa: {
      congruentAccuracy: 'دقت محرک‌های هم‌خوان (٪)',
      incongruentAccuracy: 'دقت محرک‌های ناهم‌خوان (٪)',
      stroopCostMs: 'هزینه استروپ (میلی‌ثانیه)',
    },
  },
}

const reactionTime: RegisteredExercise = {
  definition: reactionTimeDefinition,
  meta: {
    id: REACTION_TIME_ID,
    nameFa: 'زمان واکنش',
    descriptionFa: 'به محض ظاهرشدن دایره، هرچه سریع‌تر بزن؛ زودتر از موعد نزن.',
    domain: 'sensorimotor',
    exerciseType: 'reaction',
    effects: ['sensorimotor', 'processing-speed'],
    version: REACTION_TIME_VERSION,
    contentVersion: REACTION_TIME_CONTENT_VERSION,
    instructionsFa: [
      'پس از شروع، صفحه ساکت می‌ماند — صبر کن.',
      'به محض ظاهرشدن دایره درخشان، سریع بزن.',
      'زدنِ پیش از ظاهرشدن محرک، «پیش‌دستی» ثبت می‌شود.',
      '۱۰ محرک در هر جلسه؛ میانه و بهترین زمان واکنشت گزارش می‌شود.',
    ],
    difficultyLevels: [1, 2, 3, 4, 5],
    plannedTrials: 10,
    metricLabelsFa: {
      medianReactionTimeMs: 'میانه زمان واکنش (میلی‌ثانیه)',
      bestReactionTimeMs: 'بهترین زمان واکنش (میلی‌ثانیه)',
      meanReactionTimeMs: 'میانگین زمان واکنش (میلی‌ثانیه)',
      anticipationErrors: 'خطای پیش‌دستی',
      tooSlowErrors: 'پاسخ دیرهنگام',
    },
  },
}

const spatialSequence: RegisteredExercise = {
  definition: spatialSequenceDefinition,
  meta: {
    id: SPATIAL_SEQUENCE_ID,
    nameFa: 'توالی مکانی',
    descriptionFa: 'خانه‌ها یکی‌یکی و به‌ترتیب روشن می‌شوند؛ همان ترتیب را بازسازی کن.',
    domain: 'visual-spatial',
    exerciseType: 'spatial',
    effects: ['visual-spatial', 'working-memory'],
    version: SPATIAL_SEQUENCE_VERSION,
    contentVersion: SPATIAL_SEQUENCE_CONTENT_VERSION,
    instructionsFa: [
      'خانه‌های شبکه یکی‌یکی و به‌ترتیب روشن می‌شوند.',
      'ترتیب روشن‌شدن را به خاطر بسپار.',
      'پس از اتمام، همان خانه‌ها را به همان ترتیب بزن و تأیید کن.',
      '۱۰ مرحله در هر جلسه؛ با بالا رفتن سطح، توالی طولانی‌تر می‌شود.',
    ],
    difficultyLevels: [1, 2, 3, 4, 5],
    plannedTrials: 10,
    metricLabelsFa: {
      meanOrderMatchRate: 'میانگین خانه‌های درست در جای درست (٪)',
      gridSize: 'ابعاد شبکه',
      sequenceLength: 'طول توالی',
    },
  },
}

const wordMemory: RegisteredExercise = {
  definition: wordMemoryDefinition,
  meta: {
    id: WORD_MEMORY_ID,
    nameFa: 'حافظه واژه‌ها',
    descriptionFa: 'کلمات را یکی‌یکی به خاطر بسپار و همان‌ها را از میان واژه‌های جدید پیدا کن.',
    domain: 'verbal-auditory',
    exerciseType: 'verbal',
    effects: ['working-memory', 'verbal-auditory'],
    version: WORD_MEMORY_VERSION,
    contentVersion: WORD_MEMORY_CONTENT_VERSION,
    instructionsFa: [
      'چند کلمه یکی‌یکی و به‌ترتیب نمایش داده می‌شوند.',
      'آن‌ها را به خاطر بسپار.',
      'پس از پنهان‌شدن، از میان ۲ برابر کلمه، فقط همان‌هایی که دیدی را انتخاب کن.',
      '۶ مرحله در هر جلسه؛ با بالا رفتن سطح، تعداد کلمات بیشتر و زمان کمتر می‌شود.',
    ],
    difficultyLevels: [1, 2, 3, 4, 5],
    plannedTrials: 6,
    metricLabelsFa: {
      hits: 'کلمات به‌یادآورده‌شده',
      falseAlarms: 'کلمات نابجا انتخاب‌شده',
      missedWords: 'کلمات ازقلم‌افتاده',
      meanRecallRate: 'میانگین بازیابی (٪)',
    },
  },
}

const syllableCounting: RegisteredExercise = {
  definition: syllableCountingDefinition,
  meta: {
    id: SYLLABLE_COUNTING_ID,
    nameFa: 'شمارش هجا',
    descriptionFa: 'تعداد هجای جمله را بشمار و با صفحه‌کلید وارد کن.',
    domain: 'verbal-auditory',
    exerciseType: 'verbal',
    effects: ['verbal-auditory', 'processing-speed'],
    version: SYLLABLE_COUNTING_VERSION,
    contentVersion: SYLLABLE_COUNTING_CONTENT_VERSION,
    instructionsFa: [
      'یک جمله فارسی نمایش داده می‌شود.',
      'تعداد هجاهای جمله را بشمار (واژه‌به‌واژه بلند بخوان کمک می‌کند).',
      'عدد را با صفحه‌کلید وارد و تأیید کن.',
      '۱۲ جمله در هر جلسه؛ با بالا رفتن سطح، جمله‌ها طولانی‌تر می‌شوند.',
    ],
    difficultyLevels: [1, 2, 3, 4, 5],
    plannedTrials: 12,
    metricLabelsFa: {
      meanAbsoluteError: 'میانگین خطای مطلق (هجا)',
      exactAnswerRate: 'درصد پاسخ دقیق (٪)',
    },
  },
}

const sequenceLogic: RegisteredExercise = {
  definition: sequenceLogicDefinition,
  meta: {
    id: SEQUENCE_LOGIC_ID,
    nameFa: 'منطق توالی',
    descriptionFa: 'قاعده پنهان توالی اعداد را کشف کن و عدد بعدی را انتخاب کن.',
    domain: 'reasoning',
    exerciseType: 'logic',
    effects: ['reasoning'],
    version: SEQUENCE_LOGIC_VERSION,
    contentVersion: SEQUENCE_LOGIC_CONTENT_VERSION,
    instructionsFa: [
      'توالی‌ای از اعداد با قاعده‌ای پنهان نمایش داده می‌شود.',
      'قاعده را کشف کن (جمعی، ضربی، متناوب و…).',
      'عدد بعدی را از میان ۴ گزینه انتخاب کن.',
      '۱۲ سؤال در هر جلسه؛ با بالا رفتن سطح، قاعده‌ها پیچیده‌تر می‌شوند.',
    ],
    difficultyLevels: [1, 2, 3, 4, 5],
    plannedTrials: 12,
    metricLabelsFa: {
      difficultyWeightedScore: 'امتیاز وزن‌دار سطح',
      avgShownLength: 'میانگین طول توالی',
    },
  },
}

const patternCompletion: RegisteredExercise = {
  definition: patternCompletionDefinition,
  meta: {
    id: PATTERN_COMPLETION_ID,
    nameFa: 'تکمیل الگو',
    descriptionFa: 'قاعده سطر و ستون ماتریس را بفهم و خانه خالی را کامل کن.',
    domain: 'reasoning',
    exerciseType: 'logic',
    effects: ['reasoning', 'visual-spatial'],
    version: PATTERN_COMPLETION_VERSION,
    contentVersion: PATTERN_COMPLETION_CONTENT_VERSION,
    instructionsFa: [
      'ماتریس ۳×۳ از نمادهای رنگی نمایش داده می‌شود؛ خانه آخر خالی است.',
      'قاعده سطرها یا ستون‌ها را پیدا کن (تعداد، رنگ یا شکل).',
      'گزینه‌ای که خانه خالی را کامل می‌کند انتخاب کن.',
      '۱۲ سؤال در هر جلسه؛ با بالا رفتن سطح، گزینه‌های گمراه‌کننده شبیه‌تر می‌شوند.',
    ],
    difficultyLevels: [1, 2, 3, 4, 5],
    plannedTrials: 12,
    metricLabelsFa: {
      ruleFamilyVariety: 'تنوع قواعد دیده‌شده',
      difficultyWeightedScore: 'امتیاز وزن‌دار سطح',
    },
  },
}

/** موج ۴ — چهار بازی جدید سرعت پردازش (متادیتای فارسی از meta.ts همان بازی) */

const calculation100: RegisteredExercise = {
  definition: calculation100Definition,
  meta: {
    id: CALCULATION_100_ID,
    domain: 'processing-speed',
    version: CALCULATION_100_VERSION,
    contentVersion: CALCULATION_100_CONTENT_VERSION,
    ...CALCULATION_100_META_FA,
  },
}

const continuousCountdown: RegisteredExercise = {
  definition: continuousCountdownDefinition,
  // متای این بازی کامل ExerciseMeta است و مستقیم از پوشه خودش می‌آید
  meta: CONTINUOUS_COUNTDOWN_META_FA,
}

const missingOperator: RegisteredExercise = {
  definition: missingOperatorDefinition,
  meta: {
    id: MISSING_OPERATOR_ID,
    domain: 'processing-speed',
    version: MISSING_OPERATOR_VERSION,
    contentVersion: MISSING_OPERATOR_CONTENT_VERSION,
    difficultyLevels: [1, 2, 3, 4, 5],
    plannedTrials: 20,
    ...MISSING_OPERATOR_META_FA,
  },
}

const numberComparison: RegisteredExercise = {
  definition: numberComparisonDefinition,
  meta: {
    id: NUMBER_COMPARISON_ID,
    domain: 'processing-speed',
    version: NUMBER_COMPARISON_VERSION,
    contentVersion: NUMBER_COMPARISON_CONTENT_VERSION,
    difficultyLevels: [1, 2, 3, 4, 5],
    plannedTrials: 36,
    ...NUMBER_COMPARISON_META_FA,
  },
}

/** موج ۵ — چهار بازی دیداری-فضایی + جابه‌جایی تکلیف (متادیتای فارسی از meta.ts همان بازی) */

const objectTracking: RegisteredExercise = {
  definition: objectTrackingDefinition,
  meta: {
    id: OBJECT_TRACKING_ID,
    domain: 'visual-spatial',
    version: OBJECT_TRACKING_VERSION,
    contentVersion: OBJECT_TRACKING_CONTENT_VERSION,
    ...OBJECT_TRACKING_META_FA,
  },
}

const mentalRotation: RegisteredExercise = {
  definition: mentalRotationDefinition,
  meta: {
    id: MENTAL_ROTATION_ID,
    domain: 'visual-spatial',
    version: MENTAL_ROTATION_VERSION,
    contentVersion: MENTAL_ROTATION_CONTENT_VERSION,
    ...MENTAL_ROTATION_META_FA,
  },
}

const mirrorClock: RegisteredExercise = {
  definition: mirrorClockDefinition,
  meta: {
    id: MIRROR_CLOCK_ID,
    domain: 'visual-spatial',
    version: MIRROR_CLOCK_VERSION,
    contentVersion: MIRROR_CLOCK_CONTENT_VERSION,
    ...MIRROR_CLOCK_META_FA,
  },
}

const blockHeight: RegisteredExercise = {
  definition: blockHeightDefinition,
  meta: {
    id: BLOCK_HEIGHT_ID,
    domain: 'visual-spatial',
    version: BLOCK_HEIGHT_VERSION,
    contentVersion: BLOCK_HEIGHT_CONTENT_VERSION,
    ...BLOCK_HEIGHT_META_FA,
  },
}

const taskSwitching: RegisteredExercise = {
  definition: taskSwitchingDefinition,
  meta: {
    id: TASK_SWITCHING_ID,
    domain: 'attention-control',
    version: TASK_SWITCHING_VERSION,
    contentVersion: TASK_SWITCHING_CONTENT_VERSION,
    ...TASK_SWITCHING_META_FA,
  },
}

/** موج ۷ — سه بازی سند پژوهش: دو دهانهٔ مرکب + کارت‌بندی قاعده */
const operationSpan: RegisteredExercise = {
  definition: operationSpanDefinition,
  meta: {
    id: OPERATION_SPAN_ID,
    domain: 'working-memory',
    version: OPERATION_SPAN_VERSION,
    contentVersion: OPERATION_SPAN_CONTENT_VERSION,
    ...OPERATION_SPAN_META_FA,
  },
}

const symmetrySpan: RegisteredExercise = {
  definition: symmetrySpanDefinition,
  meta: {
    id: SYMMETRY_SPAN_ID,
    domain: 'visual-spatial',
    version: SYMMETRY_SPAN_VERSION,
    contentVersion: SYMMETRY_SPAN_CONTENT_VERSION,
    ...SYMMETRY_SPAN_META_FA,
  },
}

const ruleDiscoveryCardSorting: RegisteredExercise = {
  definition: ruleDiscoveryCardSortingDefinition,
  meta: {
    id: RULE_DISCOVERY_CARD_SORTING_ID,
    domain: 'reasoning',
    version: RULE_DISCOVERY_CARD_SORTING_VERSION,
    contentVersion: RULE_DISCOVERY_CARD_SORTING_CONTENT_VERSION,
    ...RULE_DISCOVERY_CARD_SORTING_META_FA,
  },
}

/** موج زبانی — چهار بازی کلامی/شنیداری با صدای کاملاً محلی */
const readingAloud: RegisteredExercise = {
  definition: readingAloudDefinition,
  meta: {
    id: READING_ALOUD_ID,
    domain: 'verbal-auditory',
    version: READING_ALOUD_VERSION,
    contentVersion: READING_ALOUD_CONTENT_VERSION,
    ...READING_ALOUD_META_FA,
  },
}

const wordScramble: RegisteredExercise = {
  definition: wordScrambleDefinition,
  meta: {
    id: WORD_SCRAMBLE_ID,
    domain: 'verbal-auditory',
    version: WORD_SCRAMBLE_VERSION,
    contentVersion: WORD_SCRAMBLE_CONTENT_VERSION,
    ...WORD_SCRAMBLE_META_FA,
  },
}

const audioRecall: RegisteredExercise = {
  definition: audioRecallDefinition,
  meta: {
    id: AUDIO_RECALL_ID,
    domain: 'verbal-auditory',
    version: AUDIO_RECALL_VERSION,
    contentVersion: AUDIO_RECALL_CONTENT_VERSION,
    ...AUDIO_RECALL_META_FA,
  },
}

const wordBlend: RegisteredExercise = {
  definition: wordBlendDefinition,
  meta: {
    id: WORD_BLEND_ID,
    domain: 'verbal-auditory',
    version: WORD_BLEND_VERSION,
    contentVersion: WORD_BLEND_CONTENT_VERSION,
    ...WORD_BLEND_META_FA,
  },
}

export function createAppRegistry(): GameRegistry {
  const registry = new GameRegistry()
  registry.register(numberSequence)
  registry.register(nBack)
  registry.register(dualNBack)
  registry.register(pasat)
  registry.register(associativePairs)
  registry.register(goNoGo)
  registry.register(stroop)
  registry.register(calculation20)
  registry.register(memoriseGrid)
  registry.register(spatialSequence)
  registry.register(reactionTime)
  registry.register(wordMemory)
  registry.register(syllableCounting)
  registry.register(sequenceLogic)
  registry.register(patternCompletion)
  registry.register(calculation100)
  registry.register(continuousCountdown)
  registry.register(missingOperator)
  registry.register(numberComparison)
  registry.register(objectTracking)
  registry.register(mentalRotation)
  registry.register(mirrorClock)
  registry.register(blockHeight)
  registry.register(taskSwitching)
  registry.register(operationSpan)
  registry.register(symmetrySpan)
  registry.register(ruleDiscoveryCardSorting)
  registry.register(readingAloud)
  registry.register(wordScramble)
  registry.register(audioRecall)
  registry.register(wordBlend)
  return registry
}

/**
 * ساخت config کامل بازی برای سطح دشواری داده‌شده — نقطه واحد اتصال
 * «difficulty انتخابی کاربر» به پیکربندی موتور همان بازی.
 */
export function createExerciseConfig(exerciseId: string, difficulty: number): ExerciseConfig {
  switch (exerciseId) {
    case NUMBER_SEQUENCE_ID:
      return nsConfigForDifficulty(difficulty)
    case NBACK_ID:
      return nbackConfigForDifficulty(difficulty)
    case DUAL_NBACK_ID:
      return dualNbackConfigForDifficulty(difficulty)
    case PASAT_ID:
      return pasatConfigForDifficulty(difficulty)
    case ASSOCIATIVE_PAIRS_ID:
      return apConfigForDifficulty(difficulty)
    case GO_NO_GO_ID:
      return gngConfigForDifficulty(difficulty)
    case STROOP_ID:
      return stroopConfigForDifficulty(difficulty)
    case CALCULATION_20_ID:
      return calcConfigForDifficulty(difficulty)
    case MEMORISE_GRID_ID:
      return gridConfigForDifficulty(difficulty)
    case SPATIAL_SEQUENCE_ID:
      return spatialConfigForDifficulty(difficulty)
    case REACTION_TIME_ID:
      return rtConfigForDifficulty(difficulty)
    case WORD_MEMORY_ID:
      return wordMemoryConfigForDifficulty(difficulty)
    case SYLLABLE_COUNTING_ID:
      return syllableConfigForDifficulty(difficulty)
    case SEQUENCE_LOGIC_ID:
      return seqLogicConfigForDifficulty(difficulty)
    case PATTERN_COMPLETION_ID:
      return patternConfigForDifficulty(difficulty)
    case CALCULATION_100_ID:
      return calc100ConfigForDifficulty(difficulty)
    case CONTINUOUS_COUNTDOWN_ID:
      return ccountConfigForDifficulty(difficulty)
    case MISSING_OPERATOR_ID:
      return missopConfigForDifficulty(difficulty)
    case NUMBER_COMPARISON_ID:
      return numcmpConfigForDifficulty(difficulty)
    case OBJECT_TRACKING_ID:
      return otConfigForDifficulty(difficulty)
    case MENTAL_ROTATION_ID:
      return mrConfigForDifficulty(difficulty)
    case MIRROR_CLOCK_ID:
      return mcConfigForDifficulty(difficulty)
    case BLOCK_HEIGHT_ID:
      return bhConfigForDifficulty(difficulty)
    case TASK_SWITCHING_ID:
      return tsConfigForDifficulty(difficulty)
    case OPERATION_SPAN_ID:
      return ospanConfigForDifficulty(difficulty)
    case SYMMETRY_SPAN_ID:
      return symspanConfigForDifficulty(difficulty)
    case RULE_DISCOVERY_CARD_SORTING_ID:
      return rdcsConfigForDifficulty(difficulty)
    case READING_ALOUD_ID:
      return raConfigForDifficulty(difficulty)
    case WORD_SCRAMBLE_ID:
      return wsConfigForDifficulty(difficulty)
    case AUDIO_RECALL_ID:
      return arConfigForDifficulty(difficulty)
    case WORD_BLEND_ID:
      return wbConfigForDifficulty(difficulty)
    default:
      throw new Error(`config برای تمرین ${exerciseId} تعریف نشده است`)
  }
}
