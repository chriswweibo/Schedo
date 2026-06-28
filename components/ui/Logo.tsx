type LogoProps = {
  size?: number
  /** 'mark' = icon only | 'lockup' = icon + wordmark */
  variant?: 'mark' | 'lockup'
  /**
   * 'brand' (default) = green tile with a white symbol.
   * 'mono' = transparent background, symbol + wordmark drawn in `currentColor`
   *   (inherits the parent text color) — use on dark/colored backgrounds, e.g.
   *   `<Logo tone="mono" className="text-white" />`.
   */
  tone?: 'brand' | 'mono'
  /** 'auto' = adapts to theme (default) | 'light' = white | 'dark' = slate.
   *  Ignored when tone='mono' (the wordmark inherits currentColor). */
  textColor?: 'auto' | 'light' | 'dark'
  /** Extra classes for the wrapper (lockup) or the svg (mark). */
  className?: string
}

export function Logo({ size = 36, variant = 'mark', tone = 'brand', textColor = 'auto', className }: LogoProps) {
  const mono = tone === 'mono'
  // In mono the symbol uses currentColor so it inherits the parent text color.
  const ink = mono ? 'currentColor' : 'white'

  // Clock-tick fusion: a clock whose hands form a checkmark — "scheduled"
  // (time) + "confirmed" (done). 'brand' sits on a green tile; 'mono' is
  // transparent for dark backgrounds.
  const mark = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={variant === 'mark' ? className : undefined}
    >
      {!mono && (
        <>
          {/* Tile background */}
          <rect width="36" height="36" rx="9" fill="#16A34A" />
          {/* Shine overlay */}
          <rect width="36" height="18" rx="9" fill="white" fillOpacity="0.08" />
        </>
      )}

      {/* Clock face */}
      <circle cx="18" cy="18" r="10" stroke={ink} strokeWidth="2.4" fill="none" />

      {/* Hands forming a checkmark — short (hour) + long (minute) */}
      <path
        d="M14.6 14.4 L18 18 L25 11.2"
        stroke={ink}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Center hub */}
      <circle cx="18" cy="18" r="1.6" fill={ink} />
    </svg>
  )

  if (variant === 'mark') return mark

  // mono → inherit currentColor; otherwise pick an explicit wordmark color.
  const textClass = mono
    ? ''
    : textColor === 'light' ? 'text-white'
    : textColor === 'dark' ? 'text-slate-900'
    : 'text-foreground'

  return (
    <div className={`flex items-center gap-2.5 ${className ?? ''}`}>
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
