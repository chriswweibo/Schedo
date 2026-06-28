type LogoProps = {
  size?: number
  /** 'mark' = icon only | 'lockup' = icon + wordmark */
  variant?: 'mark' | 'lockup'
  /** 'auto' = adapts to theme (default) | 'light' = white text for dark/colored backgrounds */
  textColor?: 'auto' | 'light' | 'dark'
}

export function Logo({ size = 36, variant = 'mark', textColor = 'auto' }: LogoProps) {
  // Clock-tick fusion: a clock whose hands form a checkmark — "scheduled"
  // (time) + "confirmed" (done) — in the green brand palette (#16A34A).
  const mark = (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Tile background */}
      <rect width="36" height="36" rx="9" fill="#16A34A"/>

      {/* Shine overlay */}
      <rect width="36" height="18" rx="9" fill="white" fillOpacity="0.08"/>

      {/* Clock face */}
      <circle cx="18" cy="18" r="10" stroke="white" strokeWidth="2.4" fill="none"/>

      {/* Hands forming a checkmark — short (hour) + long (minute) */}
      <path
        d="M14.6 14.4 L18 18 L25 11.2"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Center hub */}
      <circle cx="18" cy="18" r="1.6" fill="white"/>
    </svg>
  )

  if (variant === 'mark') return mark

  const textClass =
    textColor === 'light' ? 'text-white'
    : textColor === 'dark' ? 'text-slate-900'
    : 'text-foreground'

  return (
    <div className="flex items-center gap-2.5">
      {mark}
      <span
        className={`text-xl font-bold tracking-tight ${textClass}`}
        style={{ fontFeatureSettings: '"kern" 1' }}
      >
        Schedo
      </span>
    </div>
  )
}
