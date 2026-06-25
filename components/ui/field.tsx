import * as React from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export interface FieldProps extends React.ComponentProps<'input'> {
  label?: string
  error?: string
}

const Field = React.forwardRef<HTMLInputElement, FieldProps>(
  ({ label, error, id, className, ...props }, ref) => {
    const reactId = React.useId()
    const inputId = id ?? reactId
    return (
      <div className="flex flex-col gap-1.5">
        {label && <Label htmlFor={inputId}>{label}</Label>}
        <Input
          id={inputId}
          ref={ref}
          className={cn(error && 'border-destructive focus-visible:ring-destructive', className)}
          {...props}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    )
  }
)
Field.displayName = 'Field'

export { Field }
