'use client'
import { useEffect, useRef, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

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

export function ProviderMap({
  providers,
  center = [-0.1278, 51.5074],
  zoom = 11,
  highlightedId,
  onPinClick,
}: ProviderMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<mapboxgl.Marker[]>([])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''

    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center,
      zoom,
    })

    return () => {
      mapRef.current?.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onPinClickRef = useRef(onPinClick)
  useEffect(() => {
    onPinClickRef.current = onPinClick
  })

  useEffect(() => {
    if (!mapRef.current) return
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    providers.forEach((p) => {
      const el = document.createElement('div')
      const isHighlighted = highlightedId === p.id
      el.className = [
        'w-8 h-8 rounded-full border-2 flex items-center justify-center',
        'text-xs font-bold cursor-pointer transition-transform select-none',
        isHighlighted
          ? 'bg-green-600 border-white scale-125 text-white shadow-lg'
          : 'bg-white border-green-600 text-green-600 hover:scale-110',
      ].join(' ')
      el.textContent = p.profession[0]

      el.addEventListener('click', () => onPinClickRef.current?.(p.slug))

      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(
        `<strong class="text-sm">${p.name}</strong><br/><span class="text-xs text-gray-500">${p.profession}</span>`
      )

      const marker = new mapboxgl.Marker(el)
        .setLngLat([p.lng, p.lat])
        .setPopup(popup)
        .addTo(mapRef.current!)

      markersRef.current.push(marker)
    })
  }, [providers, highlightedId])

  return <div ref={containerRef} className="h-full w-full rounded-xl" />
}
