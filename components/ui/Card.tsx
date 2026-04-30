import { HTMLAttributes } from 'react'

export function Card({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-stone-200 bg-white shadow-sm ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
