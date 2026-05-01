'use client'
import { useEffect, useRef } from 'react'
import type { Map, Marker } from 'leaflet'

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

function ensureLeafletCSS() {
  if (document.querySelector('link[data-leaflet]')) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
  link.setAttribute('data-leaflet', '1')
  document.head.appendChild(link)
}

// Sydney CBD as fallback — change if deploying elsewhere
const FALLBACK_CENTER: [number, number] = [-33.8688, 151.2093]

export function ProviderMap({
  providers,
  center,
  zoom = 12,
  highlightedId,
  onPinClick,
}: ProviderMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const markersRef = useRef<Marker[]>([])
  const onPinClickRef = useRef(onPinClick)

  useEffect(() => {
    onPinClickRef.current = onPinClick
  })

  // ── Init map once ──────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    import('leaflet').then((L) => {
      if (!containerRef.current || mapRef.current) return

      ensureLeafletCSS()

      // @ts-expect-error leaflet internal
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
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
      mapRef.current?.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Fly to user location when center prop arrives/changes ──
  useEffect(() => {
    if (!mapRef.current || !center) return
    mapRef.current.flyTo(center, zoom, { animate: true, duration: 1 })
  }, [center, zoom])

  // ── Re-draw markers; auto-fit bounds when no center given ──
  useEffect(() => {
    if (!mapRef.current) return

    import('leaflet').then((L) => {
      if (!mapRef.current) return

      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []

      providers.forEach((p) => {
        const isHighlighted = highlightedId === p.id

        const el = document.createElement('div')
        el.className = [
          'w-8 h-8 rounded-full border-2 flex items-center justify-center',
          'text-xs font-bold cursor-pointer transition-transform select-none shadow',
          isHighlighted
            ? 'bg-indigo-600 border-white scale-125 text-white shadow-lg'
            : 'bg-white border-indigo-500 text-indigo-600 hover:scale-110',
        ].join(' ')
        el.textContent = p.profession[0]

        const icon = L.divIcon({
          html: el.outerHTML,
          className: '',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -18],
        })

        const marker = L.marker([p.lat, p.lng], { icon })
          .addTo(mapRef.current!)
          .bindPopup(
            `<strong class="text-sm">${p.name}</strong><br/><span class="text-xs text-stone-500">${p.profession}</span>`
          )

        marker.on('click', () => onPinClickRef.current?.(p.slug))
        markersRef.current.push(marker)
      })

      // Auto-fit to show all providers when no explicit center is provided
      if (!center && providers.length > 0 && mapRef.current) {
        const bounds = L.latLngBounds(providers.map((p) => [p.lat, p.lng] as [number, number]))
        mapRef.current.fitBounds(bounds, { padding: [48, 48], maxZoom: 13 })
      }
    })
  }, [providers, highlightedId, center])

  return <div ref={containerRef} className="h-full w-full rounded-xl" />
}
