import { prisma } from '@/lib/prisma'
import { haversineKm } from '@/lib/geo'
import { SearchFilters } from './SearchFilters'
import { SearchResults } from './SearchResults'
import type { MapProvider } from '@/components/map/ProviderMap'

interface SearchPageProps {
  searchParams: { keyword?: string; name?: string; date?: string; lat?: string; lng?: string }
}

async function queryProviders(params: SearchPageProps['searchParams']) {
  const lat = params.lat ? parseFloat(params.lat) : null
  const lng = params.lng ? parseFloat(params.lng) : null
  const keyword = params.keyword?.toLowerCase().trim() ?? ''
  const name    = params.name?.toLowerCase().trim() ?? ''
  const date    = params.date ?? ''

  const all = await prisma.provider.findMany({
    where: { isVisible: true },
    include: { availability: { where: { isActive: true } } },
    orderBy: { createdAt: 'desc' },
    take: 500,
  })

  // Pre-compute distances
  const distMap = new Map<string, number>()
  if (lat !== null && lng !== null) {
    for (const p of all) {
      if (p.lat !== null && p.lng !== null) {
        distMap.set(p.id, haversineKm(lat, lng, p.lat, p.lng))
      }
    }
  }

  let results = all

  // Keyword filter — profession OR tags
  if (keyword) {
    results = results.filter(
      (p) =>
        p.profession.toLowerCase().includes(keyword) ||
        p.keywords.some((k) => k.toLowerCase().includes(keyword))
    )
  }

  // Name filter
  if (name) {
    results = results.filter((p) => p.name.toLowerCase().includes(name))
  }

  // Day-of-week filter — use getUTCDay() because YYYY-MM-DD strings parse as UTC midnight
  if (date) {
    const dow = new Date(date).getUTCDay()
    results = results.filter((p) => {
      // No availability set → treat as available (provider hasn't blocked anything)
      if (p.availability.length === 0) return true
      return p.availability.some((a) => a.dayOfWeek === dow)
    })
  }

  // Geographic filter (only when lat/lng supplied)
  if (lat !== null && lng !== null) {
    results = results.filter((p) => {
      const dist = distMap.get(p.id)
      return dist !== undefined && dist <= p.acceptedRadiusKm
    })
  }

  // Sort by distance if available, otherwise keep DB order
  if (lat !== null && lng !== null) {
    results.sort((a, b) => (distMap.get(a.id) ?? Infinity) - (distMap.get(b.id) ?? Infinity))
  }

  return results.slice(0, 100).map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    profession: p.profession,
    avatarUrl: p.avatarUrl,
    keywords: p.keywords,
    lat: p.lat,
    lng: p.lng,
    distanceKm: distMap.has(p.id) ? Math.round(distMap.get(p.id)! * 10) / 10 : null,
  }))
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const providers = await queryProviders(searchParams)

  const mapProviders: MapProvider[] = providers
    .filter((p) => p.lat !== null && p.lng !== null)
    .map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      profession: p.profession,
      lat: p.lat as number,
      lng: p.lng as number,
    }))

  return (
    <div className="flex h-screen flex-col">
      <div className="sticky top-0 z-10 border-b border-stone-200 bg-white px-6 py-3">
        <SearchFilters initialValues={searchParams} />
      </div>
      <SearchResults providers={providers} mapProviders={mapProviders} />
    </div>
  )
}
