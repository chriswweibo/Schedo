'use client'
import { useEffect, useRef } from 'react'
import type { Map as LeafletMap, Marker } from 'leaflet'
import 'leaflet/dist/leaflet.css'

export interface MapProvider {
  id: string
  name: string
  slug: string
  profession: string
  lat: number
  lng: number
}

interface ProviderMapProps {
  providers: MapProvider[]
  center?: [number, number]
  zoom?: number
  highlightedId?: string | null
  onPinClick?: (slug: string) => void
}

// Sydney CBD as fallback — change if deploying elsewhere
const FALLBACK_CENTER: [number, number] = [-33.8688, 151.2093]

function buildIcon(L: typeof import('leaflet'), provider: MapProvider, isHighlighted: boolean) {
  const el = document.createElement('div')
  el.className = [
    'w-8 h-8 rounded-full border-2 flex items-center justify-center',
    'text-xs font-bold cursor-pointer transition-transform select-none shadow',
    isHighlighted
      ? 'bg-indigo-600 border-white scale-125 text-white shadow-lg'
      : 'bg-white border-indigo-500 text-indigo-600 hover:scale-110',
  ].join(' ')
  el.textContent = provider.name[0]
  return L.divIcon({
    html: el.outerHTML,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  })
}

export function ProviderMap({
  providers,
  center,
  zoom = 12,
  highlightedId,
  onPinClick,
}: ProviderMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<LeafletMap | null>(null)
  // Keyed marker store for efficient per-marker icon updates (avoids full redraw on hover)
  const markerMapRef = useRef<globalThis.Map<string, Marker>>(new globalThis.Map())
  const onPinClickRef = useRef(onPinClick)
  // Stable ref to providers so the highlight effect can look up by id without re-running
  const providersRef = useRef<MapProvider[]>(providers)

  useEffect(() => {
    onPinClickRef.current = onPinClick
  })

  useEffect(() => {
    providersRef.current = providers
  }, [providers])

  // ── Init map once ──────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    import('leaflet').then((L) => {
      if (!containerRef.current || mapRef.current) return

      // @ts-expect-error leaflet internal
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        iconUrl: require('leaflet/dist/images/marker-icon.png'),
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
      })

      mapRef.current = L.map(containerRef.current).setView(
        center ?? FALLBACK_CENTER,
        zoom
      )

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(mapRef.current)
    })

    return () => {
      // Capture ref values at cleanup time to satisfy react-hooks/exhaustive-deps
      const mm = markerMapRef.current
      mapRef.current?.remove()
      mapRef.current = null
      mm.clear()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Fly to user location when center prop arrives/changes ──
  useEffect(() => {
    if (!mapRef.current || !center) return
    mapRef.current.flyTo(center, zoom, { animate: true, duration: 1 })
  }, [center, zoom])

  // ── Re-draw markers when providers/center change (NOT highlightedId) ──
  useEffect(() => {
    if (!mapRef.current) return

    import('leaflet').then((L) => {
      if (!mapRef.current) return

      // Remove all existing markers
      markerMapRef.current.forEach((m) => m.remove())
      markerMapRef.current.clear()

      providers.forEach((p) => {
        const isHighlighted = highlightedId === p.id
        const icon = buildIcon(L, p, isHighlighted)

        const marker = L.marker([p.lat, p.lng], { icon })
          .addTo(mapRef.current!)
          .bindTooltip(
            `<a href="/p/${p.slug}" class="block text-sm font-semibold text-stone-900 hover:text-indigo-600 whitespace-nowrap">${p.name}<span class="block text-xs font-normal text-stone-400">${p.profession}</span></a>`,
            { direction: 'top', offset: [0, -8], interactive: true, opacity: 1 }
          )

        marker.on('click', () => onPinClickRef.current?.(p.slug))
        markerMapRef.current.set(p.id, marker)
      })

      // Auto-fit to show all providers when no explicit center is provided
      if (!center && providers.length > 0 && mapRef.current) {
        const bounds = L.latLngBounds(providers.map((p) => [p.lat, p.lng] as [number, number]))
        mapRef.current.fitBounds(bounds, { padding: [48, 48], maxZoom: 13 })
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providers, center])

  // ── Update only affected markers' icons when highlightedId changes ──
  useEffect(() => {
    if (markerMapRef.current.size === 0) return
    import('leaflet').then((L) => {
      markerMapRef.current.forEach((marker, id) => {
        const provider = providersRef.current.find((p) => p.id === id)
        if (!provider) return
        marker.setIcon(buildIcon(L, provider, highlightedId === id))
      })
    })
  }, [highlightedId])

  return <div ref={containerRef} className="h-full w-full rounded-xl" />
}
