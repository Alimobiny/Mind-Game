import { policyStageCount } from '../core/difficulty/stage-counts'
import { GameRegistry } from '../core/registry/game-registry'
import type { AnyExerciseDefinition } from '../core/registry/game-registry'
import type { ExerciseConfig } from '../core/types'
import { ALL_EXERCISE_IDS, GAME_CATALOG, type ExerciseId } from './catalog'
// ─── سمت موتور رجیستری ───
// متادیتا (بدون موتور) در src/modules/catalog.ts زندگی می‌کند؛ این فایل فقط
// موتورها را کنار همان کاتالوگ می‌نشاند: نقشهٔ id→definition + تک‌نمونهٔ
// رجیستری + سازندهٔ config. اعتبارسنجی meta↔engine در GameRegistry.register
// و تست registry-invariants نگه داشته می‌شود.

import {
  NUMBER_SEQUENCE_ID,
  configForDifficulty as nsConfigForDifficulty,
  numberSequenceDefinition,
} from './working-memory/games/number-sequence/engine'
import {
  NBACK_ID,
  configForDifficulty as nbackConfigForDifficulty,
  nBackDefinition,
} from './working-memory/games/n-back/engine'
import {
  DUAL_NBACK_ID,
  DUAL_NBACK_AUDITORY_ID,
  configForDifficulty as dualNbackConfigForDifficulty,
  dualNBackDefinition,
  dualNBackAuditoryDefinition,
} from './working-memory/games/dual-n-back/engine'
import {
  PASAT_ID,
  configForDifficulty as pasatConfigForDifficulty,
  pasatDefinition,
} from './processing-speed/games/pasat/engine'
import {
  ASSOCIATIVE_PAIRS_ID,
  configForDifficulty as apConfigForDifficulty,
  associativePairsDefinition,
} from './long-term-memory/games/associative-pairs/engine'
import {
  GO_NO_GO_ID,
  configForDifficulty as gngConfigForDifficulty,
  goNoGoDefinition,
} from './attention-control/games/go-no-go/engine'
import {
  STROOP_ID,
  configForDifficulty as stroopConfigForDifficulty,
  stroopDefinition,
} from './attention-control/games/stroop/engine'
import {
  CALCULATION_20_ID,
  calculation20Definition,
  configForDifficulty as calcConfigForDifficulty,
} from './processing-speed/games/calculation-20/engine'
import {
  MEMORISE_GRID_ID,
  configForDifficulty as gridConfigForDifficulty,
  memoriseGridDefinition,
} from './visual-spatial/games/memorise-grid/engine'
import {
  SPATIAL_SEQUENCE_ID,
  configForDifficulty as spatialConfigForDifficulty,
  spatialSequenceDefinition,
} from './visual-spatial/games/spatial-sequence/engine'
import {
  REACTION_TIME_ID,
  configForDifficulty as rtConfigForDifficulty,
  reactionTimeDefinition,
} from './sensorimotor/games/reaction-time/engine'
import {
  SYLLABLE_COUNTING_ID,
  configForDifficulty as syllableConfigForDifficulty,
  syllableCountingDefinition,
} from './verbal-auditory/games/syllable-counting/engine'
import {
  WORD_MEMORY_ID,
  configForDifficulty as wordMemoryConfigForDifficulty,
  wordMemoryDefinition,
} from './verbal-auditory/games/word-memory/engine'
import {
  PATTERN_COMPLETION_ID,
  configForDifficulty as patternConfigForDifficulty,
  patternCompletionDefinition,
} from './reasoning/games/pattern-completion/engine'
import {
  SEQUENCE_LOGIC_ID,
  configForDifficulty as seqLogicConfigForDifficulty,
  sequenceLogicDefinition,
} from './reasoning/games/sequence-logic/engine'
import {
  CALCULATION_100_ID,
  calculation100Definition,
  configForDifficulty as calc100ConfigForDifficulty,
} from './processing-speed/games/calculation-100/engine'
import {
  CONTINUOUS_COUNTDOWN_ID,
  configForDifficulty as ccountConfigForDifficulty,
  continuousCountdownDefinition,
} from './processing-speed/games/continuous-countdown/engine'
import {
  MISSING_OPERATOR_ID,
  configForDifficulty as missopConfigForDifficulty,
  missingOperatorDefinition,
} from './processing-speed/games/missing-operator/engine'
import {
  NUMBER_COMPARISON_ID,
  configForDifficulty as numcmpConfigForDifficulty,
  numberComparisonDefinition,
} from './processing-speed/games/number-comparison/engine'
import {
  OBJECT_TRACKING_ID,
  configForDifficulty as otConfigForDifficulty,
  objectTrackingDefinition,
} from './visual-spatial/games/object-tracking/engine'
import {
  MENTAL_ROTATION_ID,
  configForDifficulty as mrConfigForDifficulty,
  mentalRotationDefinition,
} from './visual-spatial/games/mental-rotation/engine'
import {
  MIRROR_CLOCK_ID,
  configForDifficulty as mcConfigForDifficulty,
  mirrorClockDefinition,
} from './visual-spatial/games/mirror-clock/engine'
import {
  BLOCK_HEIGHT_ID,
  blockHeightDefinition,
  configForDifficulty as bhConfigForDifficulty,
} from './visual-spatial/games/block-height/engine'
import {
  TASK_SWITCHING_ID,
  configForDifficulty as tsConfigForDifficulty,
  taskSwitchingDefinition,
} from './attention-control/games/task-switching/engine'
import {
  OPERATION_SPAN_ID,
  configForDifficulty as ospanConfigForDifficulty,
  operationSpanDefinition,
} from './working-memory/games/operation-span/engine'
import {
  SYMMETRY_SPAN_ID,
  configForDifficulty as symspanConfigForDifficulty,
  symmetrySpanDefinition,
} from './visual-spatial/games/symmetry-span/engine'
import {
  RULE_DISCOVERY_CARD_SORTING_ID,
  configForDifficulty as rdcsConfigForDifficulty,
  ruleDiscoveryCardSortingDefinition,
} from './reasoning/games/rule-discovery-card-sorting/engine'
import {
  READING_ALOUD_ID,
  configForDifficulty as raConfigForDifficulty,
  readingAloudDefinition,
} from './verbal-auditory/games/reading-aloud/engine'
import {
  WORD_SCRAMBLE_ID,
  configForDifficulty as wsConfigForDifficulty,
  wordScrambleDefinition,
} from './verbal-auditory/games/word-scramble/engine'
import {
  AUDIO_RECALL_ID,
  configForDifficulty as arConfigForDifficulty,
  audioRecallDefinition,
} from './verbal-auditory/games/audio-recall/engine'
import {
  WORD_BLEND_ID,
  configForDifficulty as wbConfigForDifficulty,
  wordBlendDefinition,
} from './verbal-auditory/games/word-blend/engine'
import {
  SIMON_ID,
  configForDifficulty as simonConfigForDifficulty,
  simonDefinition,
} from './attention-control/games/simon/engine'
import {
  ATTENTIONAL_BLINK_ID,
  attentionalBlinkDefinition,
  configForDifficulty as abConfigForDifficulty,
} from './attention-control/games/attentional-blink/engine'
import {
  RUNNING_SPAN_ID,
  configForDifficulty as rsConfigForDifficulty,
  runningSpanDefinition,
} from './working-memory/games/running-span/engine'
import {
  CHANGE_DETECTION_ID,
  configForDifficulty as cdConfigForDifficulty,
  changeDetectionDefinition,
} from './visual-spatial/games/change-detection/engine'
import {
  PROGRESSIVE_MATRICES_ID,
  configForDifficulty as pmConfigForDifficulty,
  progressiveMatricesDefinition,
} from './reasoning/games/progressive-matrices/engine'

/**
 * نقشهٔ id→موتور — Record روی ExerciseId یعنی جاماندن هر بازی در زمان
 * کامپایل خطا می‌دهد (نه در زمان اجرا). افزودن بازی: پوشه + متا + یک
 * خط در این نقشه + یک case در createExerciseConfig + یک loader در
 * ExercisePage.
 */
const DEFINITIONS: Record<ExerciseId, AnyExerciseDefinition> = {
  [NUMBER_SEQUENCE_ID]: numberSequenceDefinition,
  [NBACK_ID]: nBackDefinition,
  [DUAL_NBACK_ID]: dualNBackDefinition,
  [DUAL_NBACK_AUDITORY_ID]: dualNBackAuditoryDefinition,
  [OPERATION_SPAN_ID]: operationSpanDefinition,
  [RUNNING_SPAN_ID]: runningSpanDefinition,
  [GO_NO_GO_ID]: goNoGoDefinition,
  [STROOP_ID]: stroopDefinition,
  [TASK_SWITCHING_ID]: taskSwitchingDefinition,
  [SIMON_ID]: simonDefinition,
  [ATTENTIONAL_BLINK_ID]: attentionalBlinkDefinition,
  [CALCULATION_20_ID]: calculation20Definition,
  [CALCULATION_100_ID]: calculation100Definition,
  [CONTINUOUS_COUNTDOWN_ID]: continuousCountdownDefinition,
  [MISSING_OPERATOR_ID]: missingOperatorDefinition,
  [NUMBER_COMPARISON_ID]: numberComparisonDefinition,
  [PASAT_ID]: pasatDefinition,
  [WORD_MEMORY_ID]: wordMemoryDefinition,
  [SYLLABLE_COUNTING_ID]: syllableCountingDefinition,
  [READING_ALOUD_ID]: readingAloudDefinition,
  [WORD_SCRAMBLE_ID]: wordScrambleDefinition,
  [AUDIO_RECALL_ID]: audioRecallDefinition,
  [WORD_BLEND_ID]: wordBlendDefinition,
  [MEMORISE_GRID_ID]: memoriseGridDefinition,
  [SPATIAL_SEQUENCE_ID]: spatialSequenceDefinition,
  [OBJECT_TRACKING_ID]: objectTrackingDefinition,
  [MENTAL_ROTATION_ID]: mentalRotationDefinition,
  [MIRROR_CLOCK_ID]: mirrorClockDefinition,
  [BLOCK_HEIGHT_ID]: blockHeightDefinition,
  [SYMMETRY_SPAN_ID]: symmetrySpanDefinition,
  [CHANGE_DETECTION_ID]: changeDetectionDefinition,
  [SEQUENCE_LOGIC_ID]: sequenceLogicDefinition,
  [PATTERN_COMPLETION_ID]: patternCompletionDefinition,
  [RULE_DISCOVERY_CARD_SORTING_ID]: ruleDiscoveryCardSortingDefinition,
  [PROGRESSIVE_MATRICES_ID]: progressiveMatricesDefinition,
  [REACTION_TIME_ID]: reactionTimeDefinition,
  [ASSOCIATIVE_PAIRS_ID]: associativePairsDefinition,
}

/**
 * ساخت رجیستری کامل — متا از کاتالوگ، موتور از نقشهٔ بالا. ثبت صریح
 * است؛ هیچ جادویی وجود ندارد و register همان اعتبارسنجی‌های قبلی را
 * (تطابق meta↔engine، خانواده/نوع معتبر) اجرا می‌کند.
 */
export function createAppRegistry(): GameRegistry {
  const registry = new GameRegistry()
  for (const meta of GAME_CATALOG) {
    const definition = DEFINITIONS[meta.id as ExerciseId]
    registry.register({ definition, meta })
  }
  return registry
}

/** تک‌نمونهٔ اشتراکی رجیستری — پیش از این هر صفحه نمونهٔ خودش را می‌ساخت */
export const appRegistry: GameRegistry = createAppRegistry()

/** برای تست‌ها: اطمینان از هم‌پوشانی کامل idهای کاتالوگ و نقشهٔ موتورها */
export const DEFINED_EXERCISE_IDS: readonly ExerciseId[] = ALL_EXERCISE_IDS

/**
 * فیلدهای شمارش مرحله که موتورها بسته به بازی به کار می‌برند —
 * totalTrials (رایج)، trials (بازی‌های کلامی-شنیداری) و trialCount (کارت‌مرتب‌سازی).
 */
type StageCountConfig = ExerciseConfig & {
  readonly totalTrials?: number
  readonly trials?: number
  readonly trialCount?: number
}

/**
 * بازنویسی فیلد شمارش مرحله با مقدار نردبان سیاست — موتورها isComplete و
 * nextTrial را از config خودشان می‌خوانند، پس همین بازنویسی در سطح اتصال
 * کافی است و بدنهٔ موتورها دست نمی‌خورد. null یعنی بازی موتور-مولف است.
 */
function withPolicyStageCount(config: StageCountConfig, stageCount: number | null): StageCountConfig {
  if (stageCount === null) return config
  if (config.totalTrials !== undefined) return { ...config, totalTrials: stageCount }
  if (config.trials !== undefined) return { ...config, trials: stageCount }
  if (config.trialCount !== undefined) return { ...config, trialCount: stageCount }
  return config
}

/**
 * ساخت config کامل بازی برای سطح دشواری داده‌شده — نقطهٔ واحد اتصال
 * «difficulty انتخابی کاربر» به پیکربندی موتور همان بازی + اعمال نردبان
 * استاندارد تعداد مراحل (core/difficulty/stage-counts.ts: سطح بالاتر =
 * مراحل بیشتر، تا ۱٫۵ برابر).
 */
export function createExerciseConfig(exerciseId: string, difficulty: number): ExerciseConfig {
  const stageCount = policyStageCount(exerciseId, difficulty)
  return withPolicyStageCount(baseExerciseConfig(exerciseId, difficulty, stageCount), stageCount)
}

function baseExerciseConfig(
  exerciseId: string,
  difficulty: number,
  spanSetCount: number | null,
): ExerciseConfig {
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
    // دو اسپن پیچیده: نردبان سیاست «تعداد دسته» است و به خود موتور
    // می‌رسد تا طرح جلسه (setLengths) بازتولید شود
    case OPERATION_SPAN_ID:
      return ospanConfigForDifficulty(difficulty, spanSetCount ?? undefined)
    case SYMMETRY_SPAN_ID:
      return symspanConfigForDifficulty(difficulty, spanSetCount ?? undefined)
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
    case SIMON_ID:
      return simonConfigForDifficulty(difficulty)
    case ATTENTIONAL_BLINK_ID:
      return abConfigForDifficulty(difficulty)
    case RUNNING_SPAN_ID:
      return rsConfigForDifficulty(difficulty)
    case CHANGE_DETECTION_ID:
      return cdConfigForDifficulty(difficulty)
    case DUAL_NBACK_AUDITORY_ID:
      return dualNbackConfigForDifficulty(difficulty)
    case PROGRESSIVE_MATRICES_ID:
      return pmConfigForDifficulty(difficulty)
    default:
      throw new Error(`config برای تمرین ${exerciseId} تعریف نشده است`)
  }
}
