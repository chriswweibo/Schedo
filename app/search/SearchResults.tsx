'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import { ProviderCard } from '@/components/provider/ProviderCard'
import { QuoteRequestModal } from '@/components/provider/QuoteRequestModal'
import { Button } from '@/components/ui/button'
import type { MapProvider } from '@/components/map/ProviderMap'

const ProviderMap = dynamic(
  () => import('@/components/map/ProviderMap').then((m) => m.ProviderMap),
  { ssr: false, loading: () => <div className="h-full w-full bg-muted animate-pulse rounded-xl" /> }
)

const MAX_SELECT = 5

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
  const [selected, setSelected] = useState<string[]>([])
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    if (!('geolocation' in navigator)) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
      () => {} // permission denied — map will auto-fit to providers instead
    )
  }, [])

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= MAX_SELECT) {
        toast.error(`You can select up to ${MAX_SELECT} providers`)
        return prev
      }
      return [...prev, id]
    })
  }, [])

  const selectedProviders = providers
    .filter((p) => selected.includes(p.id))
    .map(({ id, name }) => ({ id, name }))

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Provider list */}
      <div className="relative flex w-full flex-col gap-3 overflow-y-auto p-6 lg:w-[420px] lg:max-w-[420px]">
        {providers.length === 0 ? (
          <p className="text-muted-foreground">No providers found. Try adjusting your search.</p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Tick up to {MAX_SELECT} providers to request quotes from them at once.
            </p>
            {providers.map((p) => (
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
                selectable
                selected={selected.includes(p.id)}
                selectDisabled={!selected.includes(p.id) && selected.length >= MAX_SELECT}
                onToggleSelect={toggleSelect}
              />
            ))}
          </>
        )}

        {/* Quote selection bar */}
        {selected.length > 0 && (
          <div className="sticky bottom-0 -mx-6 mt-auto border-t border-border bg-background/95 px-6 py-3 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-foreground">
                {selected.length} selected
                <span className="text-muted-foreground"> / {MAX_SELECT}</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelected([])}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
                <Button type="button" onClick={() => setModalOpen(true)}>
                  Request quotes
                </Button>
              </div>
            </div>
          </div>
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

      <QuoteRequestModal
        providers={selectedProviders}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSent={() => { setModalOpen(false); setSelected([]) }}
      />
    </div>
  )
}
