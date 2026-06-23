'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { ProviderCard } from '@/components/provider/ProviderCard'
import type { MapProvider } from '@/components/map/ProviderMap'

const ProviderMap = dynamic(
  () => import('@/components/map/ProviderMap').then((m) => m.ProviderMap),
  { ssr: false, loading: () => <div className="h-full w-full bg-stone-200 animate-pulse rounded-xl" /> }
)

interface ProviderResult {
  id: string
  name: string
  slug: string
  profession: string
  avatarUrl: string | null
  distanceKm: number | null
}

interface SearchResultsProps {
  providers: ProviderResult[]
  mapProviders: MapProvider[]
}

export function SearchResults({ providers, mapProviders }: SearchResultsProps) {
  const router = useRouter()
  const [highlightedId, setHighlightedId] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<[number, number] | undefined>(undefined)

  useEffect(() => {
    if (!('geolocation' in navigator)) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
      () => {} // permission denied — map will auto-fit to providers instead
    )
  }, [])

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Provider list */}
      <div className="flex w-full flex-col gap-3 overflow-y-auto p-6 lg:w-[420px] lg:max-w-[420px]">
        {providers.length === 0 ? (
          <p className="text-stone-500">No providers found. Try adjusting your search.</p>
        ) : (
          providers.map((p) => (
            <ProviderCard
              key={p.id}
              id={p.id}
              name={p.name}
              slug={p.slug}
              profession={p.profession}
              avatarUrl={p.avatarUrl}
              distanceKm={p.distanceKm}
              highlighted={highlightedId === p.id}
              onHover={setHighlightedId}
            />
          ))
        )}
      </div>

      {/* Map */}
      <div className="hidden flex-1 lg:block">
        <ProviderMap
          providers={mapProviders}
          center={userLocation}
          zoom={12}
          highlightedId={highlightedId}
          onPinClick={(slug) => router.push(`/p/${slug}`)}
        />
      </div>
    </div>
  )
}
