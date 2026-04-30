import { SearchFilters } from './SearchFilters'
import { SearchResults } from './SearchResults'
import type { MapProvider } from '@/components/map/ProviderMap'

interface ProviderResult {
  id: string
  name: string
  slug: string
  profession: string
  avatarUrl: string | null
  keywords: string[]
  lat: number | null
  lng: number | null
  createdAt: string
  distanceKm: number | null
}

interface SearchPageProps {
  searchParams: { keyword?: string; location?: string; date?: string; lat?: string; lng?: string }
}

async function fetchProviders(params: SearchPageProps['searchParams']): Promise<ProviderResult[] | null> {
  try {
    const qs = new URLSearchParams()
    if (params.keyword) qs.set('keyword', params.keyword)
    if (params.date) qs.set('date', params.date)
    if (params.lat) qs.set('lat', params.lat)
    if (params.lng) qs.set('lng', params.lng)
    const res = await fetch(`${process.env.NEXTAUTH_URL}/api/providers?${qs}`, {
      cache: 'no-store',
    })
    if (!res.ok) return null
    return res.json() as Promise<ProviderResult[]>
  } catch {
    return null
  }
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const providers = await fetchProviders(searchParams)

  if (providers === null) {
    return (
      <div className="flex h-screen flex-col">
        <div className="sticky top-0 z-10 border-b border-stone-200 bg-white px-6 py-3">
          <SearchFilters initialValues={searchParams} />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <p className="text-red-600">Unable to load results. Please try again.</p>
        </div>
      </div>
    )
  }

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
      {/* Filter bar */}
      <div className="sticky top-0 z-10 border-b border-stone-200 bg-white px-6 py-3">
        <SearchFilters initialValues={searchParams} />
      </div>
      <SearchResults providers={providers} mapProviders={mapProviders} />
    </div>
  )
}
