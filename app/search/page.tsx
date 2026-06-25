import { searchProviders } from '@/lib/search'
import { SearchFilters } from './SearchFilters'
import { SearchResults } from './SearchResults'
import type { MapProvider } from '@/components/map/ProviderMap'

interface SearchPageProps {
  searchParams: { keyword?: string; name?: string; date?: string; lat?: string; lng?: string }
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const lat = searchParams.lat ? parseFloat(searchParams.lat) : null
  const lng = searchParams.lng ? parseFloat(searchParams.lng) : null

  const { providers } = await searchProviders({
    lat,
    lng,
    keyword: searchParams.keyword ?? '',
    name: searchParams.name ?? '',
    date: searchParams.date ?? '',
    page: 1,
    pageSize: 100,
  })

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
      <div className="sticky top-0 z-10 border-b border-border bg-background px-6 py-3">
        <SearchFilters initialValues={searchParams} />
      </div>
      <SearchResults providers={providers} mapProviders={mapProviders} />
    </div>
  )
}
