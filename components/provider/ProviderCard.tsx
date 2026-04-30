import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

interface ProviderCardProps {
  id: string
  name: string
  slug: string
  profession: string
  avatarUrl: string | null
  distanceKm: number | null
  highlighted?: boolean
  onHover?: (id: string | null) => void
}

export function ProviderCard({ id, name, slug, profession, avatarUrl, distanceKm, highlighted, onHover }: ProviderCardProps) {
  return (
    <Card
      className={`flex items-center gap-4 p-4 transition ${highlighted ? 'ring-2 ring-primary' : ''}`}
      onMouseEnter={() => onHover?.(id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xl font-bold text-stone-500">
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="h-full w-full rounded-full object-cover" />
        ) : (
          name[0]
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{name}</p>
        <p className="text-sm text-stone-500">{profession}</p>
        {distanceKm !== null && (
          <p className="text-xs text-stone-400">{distanceKm} km away</p>
        )}
      </div>
      <Link href={`/p/${slug}`}>
        <Button variant="secondary" className="shrink-0">View</Button>
      </Link>
    </Card>
  )
}
