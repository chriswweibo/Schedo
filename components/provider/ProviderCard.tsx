import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

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
      id={`card-${slug}`}
      className={`flex items-center gap-4 p-4 transition ${highlighted ? 'ring-2 ring-primary' : ''}`}
      onMouseEnter={() => onHover?.(id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-muted text-xl font-bold text-muted-foreground">
        {avatarUrl ? (
          <Image src={avatarUrl} alt={name} fill sizes="56px" className="rounded-full object-cover" />
        ) : (
          name[0]?.toUpperCase() ?? '?'
        )}
      </div>
      <div className="flex-1 min-w-0">
        <Link href={`/p/${slug}`} className="font-semibold truncate hover:underline">{name}</Link>
        <p className="text-sm text-muted-foreground">{profession}</p>
        {distanceKm !== null && (
          <p className="text-xs text-muted-foreground">{distanceKm.toFixed(1)} km away</p>
        )}
      </div>
      <Link href={`/p/${slug}`}>
        <Button variant="outline" className="shrink-0">View</Button>
      </Link>
    </Card>
  )
}
