/**
 * گلیف‌های «نوع تمرین» — جنس تکلیف (عددی/کلامی/دیداری/فضایی/واکنشی/منطقی).
 * طرح خطی سبک (stroke=currentColor، ۲۴×۲۴)؛ تزئینی — همراه متن بیایند.
 */
import type { ExerciseType } from '../../core/types'
import type { EmblemProps } from './DomainEmblems'

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

function NumericGlyph({ size = 24, className }: EmblemProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      {/* صفحه‌کلید حساب */}
      <rect x="4.5" y="3.5" width="15" height="17" rx="3" {...stroke} />
      <line x1="8" y1="7.5" x2="16" y2="7.5" {...stroke} />
      <circle cx="8.5" cy="12" r="0.9" fill="currentColor" />
      <circle cx="12" cy="12" r="0.9" fill="currentColor" />
      <circle cx="15.5" cy="12" r="0.9" fill="currentColor" />
      <line x1="8" y1="16.5" x2="13.5" y2="16.5" {...stroke} />
    </svg>
  )
}

function VerbalGlyph({ size = 24, className }: EmblemProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      {/* حرف در گفتار — آ */}
      <path d="M5 19 11 5l6 14M7.8 14h6.4" {...stroke} />
    </svg>
  )
}

function VisualGlyph({ size = 24, className }: EmblemProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      {/* چشم */}
      <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" {...stroke} />
      <circle cx="12" cy="12" r="2.8" {...stroke} />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
  )
}

function SpatialGlyph({ size = 24, className }: EmblemProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      {/* مکعب ایزومتریک */}
      <path d="M12 3 20 7.5v9L12 21 4 16.5v-9L12 3Z" {...stroke} />
      <path d="M4 7.5 12 12l8-4.5M12 12v9" {...stroke} />
    </svg>
  )
}

function ReactionGlyph({ size = 24, className }: EmblemProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      {/* رعد واکنش */}
      <path d="M13.5 2.5 5.5 13h5l-1.5 8.5L17 11h-5l1.5-8.5Z" {...stroke} />
    </svg>
  )
}

function LogicGlyph({ size = 24, className }: EmblemProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      {/* درخت تصمیم */}
      <circle cx="12" cy="5" r="2.2" {...stroke} />
      <circle cx="6" cy="18.5" r="2.2" {...stroke} />
      <circle cx="18" cy="18.5" r="2.2" {...stroke} />
      <path d="M10.6 6.9 7.2 16.6M13.4 6.9l3.4 9.7" {...stroke} />
    </svg>
  )
}

const GLYPHS: Record<ExerciseType, (p: EmblemProps) => JSX.Element> = {
  numeric: NumericGlyph,
  verbal: VerbalGlyph,
  visual: VisualGlyph,
  spatial: SpatialGlyph,
  reaction: ReactionGlyph,
  logic: LogicGlyph,
}

/** گلیف نوع تمرین — dispatcher بر اساس کلید نوع */
export function TypeGlyph({ type, ...props }: EmblemProps & { type: ExerciseType }) {
  const Glyph = GLYPHS[type]
  return <Glyph {...props} />
}
