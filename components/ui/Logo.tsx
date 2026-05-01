type LogoProps = {
  size?: number
  /** 'mark' = icon only | 'lockup' = icon + wordmark */
  variant?: 'mark' | 'lockup'
  /** 'dark' text for light backgrounds | 'light' text for dark backgrounds */
  textColor?: 'dark' | 'light'
}

export function Logo({ size = 36, variant = 'mark', textColor = 'dark' }: LogoProps) {
  const mark = (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Background */}
      <rect width="36" height="36" rx="9" fill="#3730A3"/>

      {/* Shine overlay */}
      <rect width="36" height="18" rx="9" fill="white" fillOpacity="0.07"/>

      {/* Calendar card */}
      <rect x="6" y="10" width="24" height="21" rx="3" fill="white"/>

      {/* Header band */}
      <rect x="6" y="10" width="24" height="7.5" rx="3" fill="#4F46E5"/>
      <rect x="6" y="14.5" width="24" height="3" fill="#4F46E5"/>

      {/* Binding posts */}
      <rect x="11.5" y="7" width="3" height="6" rx="1.5" fill="white"/>
      <rect x="21.5" y="7" width="3" height="6" rx="1.5" fill="white"/>

      {/* Day cells — row 1 */}
      <rect x="8.5" y="20" width="5" height="3.5" rx="1" fill="#E0E7FF"/>
      <rect x="15.5" y="20" width="5" height="3.5" rx="1" fill="#4F46E5"/>
      <rect x="22.5" y="20" width="5" height="3.5" rx="1" fill="#E0E7FF"/>

      {/* Day cells — row 2 */}
      <rect x="8.5" y="25" width="5" height="3.5" rx="1" fill="#4F46E5"/>
      <rect x="15.5" y="25" width="5" height="3.5" rx="1" fill="#E0E7FF"/>
      <rect x="22.5" y="25" width="5" height="3.5" rx="1" fill="#10B981"/>

      {/* Checkmark on the green cell */}
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

  return (
    <div className="flex items-center gap-2.5">
      {mark}
      <span
        className={`text-xl font-bold tracking-tight ${
          textColor === 'light' ? 'text-white' : 'text-slate-900'
        }`}
        style={{ fontFeatureSettings: '"kern" 1' }}
      >
        Schedo
      </span>
    </div>
  )
}
