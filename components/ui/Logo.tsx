type LogoProps = {
  size?: number
  /** 'mark' = icon only | 'lockup' = icon + wordmark */
  variant?: 'mark' | 'lockup'
  /** 'auto' = adapts to theme (default) | 'light' = white text for dark/colored backgrounds */
  textColor?: 'auto' | 'light' | 'dark'
}

export function Logo({ size = 36, variant = 'mark', textColor = 'auto' }: LogoProps) {
  // Calendar card with a confirmed (checked) day — Schedo's "book a time slot"
  // concept — in the green brand palette (#16A34A).
  const mark = (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background */}
      <rect width="36" height="36" rx="9" fill="#16A34A"/>

      {/* Shine overlay */}
      <rect width="36" height="18" rx="9" fill="white" fillOpacity="0.08"/>

      {/* Calendar card */}
      <rect x="6" y="10" width="24" height="21" rx="3" fill="white"/>

      {/* Header band */}
      <rect x="6" y="10" width="24" height="7.5" rx="3" fill="#15803D"/>
      <rect x="6" y="14.5" width="24" height="3" fill="#15803D"/>

      {/* Binding posts */}
      <rect x="11.5" y="7" width="3" height="6" rx="1.5" fill="white"/>
      <rect x="21.5" y="7" width="3" height="6" rx="1.5" fill="white"/>

      {/* Day cells — row 1 */}
      <rect x="8.5" y="20" width="5" height="3.5" rx="1" fill="#DCFCE7"/>
      <rect x="15.5" y="20" width="5" height="3.5" rx="1" fill="#16A34A"/>
      <rect x="22.5" y="20" width="5" height="3.5" rx="1" fill="#DCFCE7"/>

      {/* Day cells — row 2 */}
      <rect x="8.5" y="25" width="5" height="3.5" rx="1" fill="#16A34A"/>
      <rect x="15.5" y="25" width="5" height="3.5" rx="1" fill="#DCFCE7"/>
      <rect x="22.5" y="25" width="5" height="3.5" rx="1" fill="#16A34A"/>

      {/* Checkmark on the confirmed day */}
      <path
        d="M23.5 26.8 L24.5 27.8 L26.2 25.8"
        stroke="white"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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
