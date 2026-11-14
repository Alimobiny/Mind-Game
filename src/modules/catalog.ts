import type { ExerciseMeta } from '../core/registry/game-registry'
import { COGNITIVE_DOMAINS } from '../core/types'
// ─── کاتالوگ متادیتا — فقط متا، بدون هیچ موتوری ───
// صفحات فهرست‌محور (خانه/برنامه/گزارش/سفر) از همین‌جا می‌خوانند تا موتورهای
// بازی به باندل اولیه کشیده نشوند؛ موتورها فقط در modules/index.ts (سمت
// اجرا) کنار این کاتالوگ می‌نشینند. هر بازی متای کامل ExerciseMeta را در
// meta.ts پوشهٔ خودش دارد — یک الگوی واحد، بدون متای inline.

import { NUMBER_SEQUENCE_META_FA } from './working-memory/games/number-sequence/meta'
import { NBACK_META_FA } from './working-memory/games/n-back/meta'
import { DUAL_NBACK_META_FA } from './working-memory/games/dual-n-back/meta'
import { DUAL_NBACK_AUDITORY_META_FA } from './working-memory/games/dual-n-back/meta-auditory'
import { OPERATION_SPAN_META_FA } from './working-memory/games/operation-span/meta'
import { RUNNING_SPAN_META_FA } from './working-memory/games/running-span/meta'
import { GO_NO_GO_META_FA } from './attention-control/games/go-no-go/meta'
import { STROOP_META_FA } from './attention-control/games/stroop/meta'
import { TASK_SWITCHING_META_FA } from './attention-control/games/task-switching/meta'
import { SIMON_META_FA } from './attention-control/games/simon/meta'
import { ATTENTIONAL_BLINK_META_FA } from './attention-control/games/attentional-blink/meta'
import { CALCULATION_20_META_FA } from './processing-speed/games/calculation-20/meta'
import { CALCULATION_100_META_FA } from './processing-speed/games/calculation-100/meta'
import { CONTINUOUS_COUNTDOWN_META_FA } from './processing-speed/games/continuous-countdown/meta'
import { MISSING_OPERATOR_META_FA } from './processing-speed/games/missing-operator/meta'
import { NUMBER_COMPARISON_META_FA } from './processing-speed/games/number-comparison/meta'
import { PASAT_META_FA } from './processing-speed/games/pasat/meta'
import { WORD_MEMORY_META_FA } from './verbal-auditory/games/word-memory/meta'
import { SYLLABLE_COUNTING_META_FA } from './verbal-auditory/games/syllable-counting/meta'
import { READING_ALOUD_META_FA } from './verbal-auditory/games/reading-aloud/meta'
import { WORD_SCRAMBLE_META_FA } from './verbal-auditory/games/word-scramble/meta'
import { AUDIO_RECALL_META_FA } from './verbal-auditory/games/audio-recall/meta'
import { WORD_BLEND_META_FA } from './verbal-auditory/games/word-blend/meta'
import { MEMORISE_GRID_META_FA } from './visual-spatial/games/memorise-grid/meta'
import { SPATIAL_SEQUENCE_META_FA } from './visual-spatial/games/spatial-sequence/meta'
import { OBJECT_TRACKING_META_FA } from './visual-spatial/games/object-tracking/meta'
import { MENTAL_ROTATION_META_FA } from './visual-spatial/games/mental-rotation/meta'
import { MIRROR_CLOCK_META_FA } from './visual-spatial/games/mirror-clock/meta'
import { BLOCK_HEIGHT_META_FA } from './visual-spatial/games/block-height/meta'
import { SYMMETRY_SPAN_META_FA } from './visual-spatial/games/symmetry-span/meta'
import { CHANGE_DETECTION_META_FA } from './visual-spatial/games/change-detection/meta'
import { SEQUENCE_LOGIC_META_FA } from './reasoning/games/sequence-logic/meta'
import { PATTERN_COMPLETION_META_FA } from './reasoning/games/pattern-completion/meta'
import { RULE_DISCOVERY_CARD_SORTING_META_FA } from './reasoning/games/rule-discovery-card-sorting/meta'
import { PROGRESSIVE_MATRICES_META_FA } from './reasoning/games/progressive-matrices/meta'
import { REACTION_TIME_META_FA } from './sensorimotor/games/reaction-time/meta'
import { ASSOCIATIVE_PAIRS_META_FA } from './long-term-memory/games/associative-pairs/meta'

/** شناسهٔ یکتای هر تمرین — اتحاد بسته؛ بازی جدید یعنی افزودن به همین فهرست */
export type ExerciseId =
  | 'number-sequence'
  | 'n-back'
  | 'dual-n-back'
  | 'dual-n-back-auditory'
  | 'operation-span'
  | 'running-span'
  | 'go-no-go'
  | 'stroop'
  | 'task-switching'
  | 'simon-task'
  | 'attentional-blink'
  | 'calculation-20'
  | 'calculation-100'
  | 'continuous-countdown'
  | 'missing-operator'
  | 'number-comparison'
  | 'pasat'
  | 'word-memory'
  | 'syllable-counting'
  | 'reading-aloud'
  | 'word-scramble'
  | 'audio-recall'
  | 'word-blend'
  | 'memorise-grid'
  | 'spatial-sequence'
  | 'object-tracking'
  | 'mental-rotation'
  | 'mirror-clock'
  | 'block-height'
  | 'symmetry-span'
  | 'change-detection'
  | 'sequence-logic'
  | 'pattern-completion'
  | 'rule-discovery-card-sorting'
  | 'progressive-matrices'
  | 'reaction-time'
  | 'associative-pairs'

/** فهرست اجرایی همهٔ شناسه‌ها — هم‌ارز اتحاد بالا؛ تست کاتالوگ هم‌ارزی دوطرفه را قفل می‌کند */
export const ALL_EXERCISE_IDS: readonly ExerciseId[] = [
  'number-sequence',
  'n-back',
  'dual-n-back',
  'dual-n-back-auditory',
  'operation-span',
  'running-span',
  'go-no-go',
  'stroop',
  'task-switching',
  'simon-task',
  'attentional-blink',
  'calculation-20',
  'calculation-100',
  'continuous-countdown',
  'missing-operator',
  'number-comparison',
  'pasat',
  'word-memory',
  'syllable-counting',
  'reading-aloud',
  'word-scramble',
  'audio-recall',
  'word-blend',
  'memorise-grid',
  'spatial-sequence',
  'object-tracking',
  'mental-rotation',
  'mirror-clock',
  'block-height',
  'symmetry-span',
  'change-detection',
  'sequence-logic',
  'pattern-completion',
  'rule-discovery-card-sorting',
  'progressive-matrices',
  'reaction-time',
  'associative-pairs',
]

const UNSORTED_CATALOG: readonly ExerciseMeta[] = [
  NUMBER_SEQUENCE_META_FA,
  NBACK_META_FA,
  DUAL_NBACK_META_FA,
  DUAL_NBACK_AUDITORY_META_FA,
  OPERATION_SPAN_META_FA,
  RUNNING_SPAN_META_FA,
  GO_NO_GO_META_FA,
  STROOP_META_FA,
  TASK_SWITCHING_META_FA,
  SIMON_META_FA,
  ATTENTIONAL_BLINK_META_FA,
  CALCULATION_20_META_FA,
  CALCULATION_100_META_FA,
  CONTINUOUS_COUNTDOWN_META_FA,
  MISSING_OPERATOR_META_FA,
  NUMBER_COMPARISON_META_FA,
  PASAT_META_FA,
  WORD_MEMORY_META_FA,
  SYLLABLE_COUNTING_META_FA,
  READING_ALOUD_META_FA,
  WORD_SCRAMBLE_META_FA,
  AUDIO_RECALL_META_FA,
  WORD_BLEND_META_FA,
  MEMORISE_GRID_META_FA,
  SPATIAL_SEQUENCE_META_FA,
  OBJECT_TRACKING_META_FA,
  MENTAL_ROTATION_META_FA,
  MIRROR_CLOCK_META_FA,
  BLOCK_HEIGHT_META_FA,
  SYMMETRY_SPAN_META_FA,
  CHANGE_DETECTION_META_FA,
  SEQUENCE_LOGIC_META_FA,
  PATTERN_COMPLETION_META_FA,
  RULE_DISCOVERY_CARD_SORTING_META_FA,
  PROGRESSIVE_MATRICES_META_FA,
  REACTION_TIME_META_FA,
  ASSOCIATIVE_PAIRS_META_FA,
]

/** ترتیب استاندارد: حوزهٔ شناختی سپس نام فارسی — همان ترتیب GameRegistry.list */
const DOMAIN_ORDER = new Map(COGNITIVE_DOMAINS.map((d, i) => [d, i]))

export const GAME_CATALOG: readonly ExerciseMeta[] = [...UNSORTED_CATALOG].sort((a, b) => {
  const da = DOMAIN_ORDER.get(a.domain) ?? 99
  const db = DOMAIN_ORDER.get(b.domain) ?? 99
  return da !== db ? da - db : a.nameFa.localeCompare(b.nameFa, 'fa')
})

/** همهٔ متاهای تمرین‌ها (مرتب) — برای فهرست‌ها و کاتالوگ بدون بار موتورها */
export function listCatalog(): readonly ExerciseMeta[] {
  return GAME_CATALOG
}

/** متای یک تمرین با شناسه — undefined یعنی چنین تمرینی در کاتالوگ نیست */
export function catalogById(id: string): ExerciseMeta | undefined {
  return GAME_CATALOG.find((m) => m.id === id)
}
