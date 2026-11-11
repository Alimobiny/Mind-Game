/**
 * نشان‌های حوزه‌های شناختی — طرح‌های خطی سبک (stroke=currentColor، ۲۴×۲۴).
 * تزئینی‌اند؛ مصرف‌کننده باید aria-hidden بگذارد یا در متن همراه بیاورد.
 */
import type { CognitiveDomain } from '../../core/types'

export type EmblemProps = {
  readonly size?: number
  readonly className?: string
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

function WorkingMemoryEmblem({ size = 24, className }: EmblemProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="8" {...stroke} />
      <circle cx="12" cy="12" r="3.2" fill="currentColor" />
    </svg>
  )
}

function AttentionEmblem({ size = 24, className }: EmblemProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="7.5" {...stroke} />
      <line x1="12" y1="1.5" x2="12" y2="5" {...stroke} />
      <line x1="12" y1="19" x2="12" y2="22.5" {...stroke} />
      <line x1="1.5" y1="12" x2="5" y2="12" {...stroke} />
      <line x1="19" y1="12" x2="22.5" y2="12" {...stroke} />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
    </svg>
  )
}

function SpeedEmblem({ size = 24, className }: EmblemProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      <path d="M4.5 17.5a8.5 8.5 0 1 1 15 0" {...stroke} />
      <line x1="12" y1="15" x2="16.2" y2="8.4" {...stroke} />
      <circle cx="12" cy="15" r="1.6" fill="currentColor" />
    </svg>
  )
}

function VerbalEmblem({ size = 24, className }: EmblemProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      <path
        d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.6a.6.6 0 0 1-1-.46V16h-.3A2.5 2.5 0 0 1 2 13.5v-7Z"
        transform="translate(1 0)"
        {...stroke}
      />
      <line x1="8" y1="9" x2="16" y2="9" {...stroke} />
      <line x1="8" y1="12" x2="13" y2="12" {...stroke} />
    </svg>
  )
}

function VisualSpatialEmblem({ size = 24, className }: EmblemProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      <rect x="4" y="4" width="7" height="7" rx="1.5" fill="currentColor" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" {...stroke} />
      <rect x="4" y="13" width="7" height="7" rx="1.5" {...stroke} />
      <rect x="13" y="13" width="7" height="7" rx="1.5" {...stroke} />
    </svg>
  )
}

function ReasoningEmblem({ size = 24, className }: EmblemProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      <path d="M12 3.5a5.2 5.2 0 0 1 3.2 9.3c-.8.6-1.2 1.2-1.2 2.2h-4c0-1-.4-1.6-1.2-2.2A5.2 5.2 0 0 1 12 3.5Z" {...stroke} />
      <line x1="10.5" y1="17.8" x2="13.5" y2="17.8" {...stroke} />
      <line x1="11" y1="20.5" x2="13" y2="20.5" {...stroke} />
    </svg>
  )
}

function SensorimotorEmblem({ size = 24, className }: EmblemProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="2.2" fill="currentColor" />
      <path d="M8.6 8.6a4.8 4.8 0 0 0 0 6.8M15.4 8.6a4.8 4.8 0 0 1 0 6.8" {...stroke} />
      <path d="M5.8 5.8a8.8 8.8 0 0 0 0 12.4M18.2 5.8a8.8 8.8 0 0 1 0 12.4" {...stroke} opacity="0.55" />
    </svg>
  )
}

const EMBLEMS: Record<CognitiveDomain, (p: EmblemProps) => JSX.Element> = {
  'working-memory': WorkingMemoryEmblem,
  'attention-control': AttentionEmblem,
  'processing-speed': SpeedEmblem,
  'verbal-auditory': VerbalEmblem,
  'visual-spatial': VisualSpatialEmblem,
  reasoning: ReasoningEmblem,
  sensorimotor: SensorimotorEmblem,
}

/** نشان حوزهٔ شناختی — dispatcher بر اساس کلید حوزه */
export function DomainEmblem({ domain, ...props }: EmblemProps & { domain: CognitiveDomain }) {
  const Emblem = EMBLEMS[domain]
  return <Emblem {...props} />
}
