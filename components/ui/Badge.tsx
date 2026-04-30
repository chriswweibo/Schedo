type BadgeVariant = 'pending' | 'confirmed' | 'declined' | 'cancelled'

const styles: Record<BadgeVariant, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-primary-light text-primary',
  declined: 'bg-red-100 text-red-700',
  cancelled: 'bg-stone-100 text-stone-600',
}

export function Badge({ variant }: { variant: BadgeVariant }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${styles[variant]}`}>
      {variant}
    </span>
  )
}
