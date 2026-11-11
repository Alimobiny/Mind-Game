/**
 * نشان لوگوی آزمایشگاه — گرید ۹-نقطه با نقطهٔ مرکزی برجسته.
 * هم‌خانوادهٔ public/icons/icon.svg (همان طرح با رنگ‌های ثابت).
 */
export function LogoMark({ size = 44, className }: { size?: number; className?: string }) {
  const id = 'logo-grad'
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      role="presentation"
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#38bdf8" />
          <stop offset="1" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="16" fill="#1e293b" />
      {[
        [20, 20],
        [32, 20],
        [44, 20],
        [20, 32],
        [44, 32],
        [20, 44],
        [32, 44],
        [44, 44],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.4" fill={`url(#${id})`} opacity="0.45" />
      ))}
      <circle cx="32" cy="32" r="6.2" fill={`url(#${id})`} />
      <circle cx="32" cy="32" r="10.4" fill="none" stroke={`url(#${id})`} strokeWidth="1.6" opacity="0.5" />
    </svg>
  )
}
