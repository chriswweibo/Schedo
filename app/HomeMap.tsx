'use client'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import type { MapProvider } from '@/components/map/ProviderMap'

const ProviderMap = dynamic(
  () => import('@/components/map/ProviderMap').then((m) => m.ProviderMap),
  { ssr: false, loading: () => <div className="h-full w-full rounded-xl bg-stone-100 animate-pulse" /> }
)

export function HomeMap() {
  const [center, setCenter] = useState<[number, number] | null>(null)
  const [providers, setProviders] = useState<MapProvider[]>([])

  useEffect(() => {
    // Always fetch all providers regardless of location
    async function fetchProviders(centerLat: number, centerLng: number) {
      try {
        const res = await fetch('/api/providers/all')
        if (res.ok) {
          const data = await res.json()
          setProviders(
            data
              .filter((p: MapProvider & { lat: number | null; lng: number | null }) => p.lat !== null && p.lng !== null)
              .map((p: MapProvider) => ({
                id: p.id,
                name: p.name,
                slug: p.slug,
                profession: p.profession,
                lat: p.lat,
                lng: p.lng,
              }))
          )
        }
      } catch {
        // silently ignore
      }
      setCenter([centerLat, centerLng])
    }

    if (!('geolocation' in navigator)) {
      fetchProviders(-33.8688, 151.2093) // Sydney default
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => fetchProviders(pos.coords.latitude, pos.coords.longitude),
      ()    => fetchProviders(-33.8688, 151.2093) // denied — centre on Sydney
    )
  }, [])

  if (!center) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-xl bg-stone-100 text-sm text-stone-400">
        Allow location access to see providers near you
      </div>
    )
  }

  return <ProviderMap providers={providers} center={center} zoom={12} />
}
