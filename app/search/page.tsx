import dynamic from 'next/dynamic'
import { ProviderCard } from '@/components/provider/ProviderCard'
import { SearchFilters } from './SearchFilters'

const ProviderMap = dynamic(
  () => import('@/components/map/ProviderMap').then((m) => m.ProviderMap),
  { ssr: false, loading: () => <div className="h-full w-full bg-stone-200 animate-pulse rounded-xl" /> }
)

interface SearchPageProps {
  searchParams: { keyword?: string; location?: string; date?: string; lat?: string; lng?: string }
}

async function fetchProviders(params: SearchPageProps['searchParams']) {
  const qs = new URLSearchParams()
  if (params.keyword) qs.set('keyword', params.keyword)
  if (params.date) qs.set('date', params.date)
  if (params.lat) qs.set('lat', params.lat)
  if (params.lng) qs.set('lng', params.lng)
  const res = await fetch(`${process.env.NEXTAUTH_URL}/api/providers?${qs}`, {
    cache: 'no-store',
  })
  if (!res.ok) return []
  return res.json()
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const providers = await fetchProviders(searchParams)
  const mapProviders = providers.filter((p: any) => p.lat && p.lng)

  return (
    <div className="flex h-screen flex-col">
      {/* Filter bar */}
      <div className="sticky top-0 z-10 border-b border-stone-200 bg-white px-6 py-3">
        <SearchFilters initialValues={searchParams} />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Provider list */}
        <div className="flex w-full flex-col gap-3 overflow-y-auto p-6 lg:w-[420px]">
          {providers.length === 0 ? (
            <p className="text-stone-500">No providers found. Try adjusting your search.</p>
          ) : (
            providers.map((p: any) => (
              <ProviderCard
                key={p.id}
                id={p.id}
                name={p.name}
                slug={p.slug}
                profession={p.profession}
                avatarUrl={p.avatarUrl}
                distanceKm={p.distanceKm}
              />
            ))
          )}
        </div>

        {/* Map */}
        <div className="hidden flex-1 lg:block">
          <ProviderMap providers={mapProviders} />
        </div>
      </div>
    </div>
  )
}
