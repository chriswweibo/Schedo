import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-destructive-foreground',
        outline: 'text-foreground',
        pending: 'border-transparent bg-amber-100 text-amber-800 capitalize dark:bg-amber-950 dark:text-amber-300',
        confirmed: 'border-transparent bg-primary-light text-primary capitalize',
        declined: 'border-transparent bg-red-100 text-red-700 capitalize dark:bg-red-950 dark:text-red-300',
        cancelled: 'border-transparent bg-stone-100 text-stone-600 capitalize dark:bg-stone-800 dark:text-stone-300',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export type BadgeVariant =
  | 'default' | 'secondary' | 'destructive' | 'outline'
  | 'pending' | 'confirmed' | 'declined' | 'cancelled'

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
