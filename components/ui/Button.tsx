import { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'

const styles: Record<Variant, string> = {
  primary:
    'bg-primary text-white hover:bg-primary-hover active:bg-primary-hover disabled:opacity-50',
  secondary:
    'border border-stone-300 bg-white text-stone-800 hover:bg-stone-50 disabled:opacity-50',
  ghost: 'text-stone-600 hover:text-stone-900 hover:bg-stone-100 disabled:opacity-50',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
