import { prisma } from '@/lib/prisma'
import { haversineKm } from '@/lib/geo'

export interface SearchParams {
  lat?: number | null
  lng?: number | null
  keyword?: string
  name?: string
  date?: string
  page?: number
  pageSize?: number
}

export interface ProviderResult {
  id: string
  name: string
  slug: string
  profession: string
  avatarUrl: string | null
  keywords: string[]
  lat: number | null
  lng: number | null
  createdAt: Date
  distanceKm: number | null
}

export interface SearchResult {
  providers: ProviderResult[]
  page: number
  pageSize: number
  hasMore: boolean
}

/**
 * Unified provider search used by both the API route and the Search Server Component.
 *
 * Strategy:
 * 1. Build a Prisma `where` with `isVisible: true`.
 * 2. If lat/lng provided, add a bounding-box prefilter (±100 km) so Postgres uses
 *    the (lat, lng) B-tree index to discard far-away rows before the JS radius check.
 * 3. Fetch up to 500 matching rows (safety cap on the bbox-reduced set).
 * 4. Apply in-JS refinements for exactness:
 *    - precise haversine radius vs. each provider's acceptedRadiusKm
 *    - keyword/profession substring filter
 *    - name substring filter
 *    - day-of-week availability filter
 * 5. Sort by distance asc, tie-break by createdAt desc (Prisma returns createdAt desc).
 * 6. Paginate.
 */
export async function searchProviders(params: SearchParams): Promise<SearchResult> {
  const {
    lat = null,
    lng = null,
    keyword = '',
    name = '',
    date = '',
    page = 1,
    pageSize = 50,
  } = params

  const kw = keyword.toLowerCase().trim()
  const nm = name.toLowerCase().trim()

  // --- Build DB where clause ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { isVisible: true }

  if (lat != null && lng != null) {
    // 100 km bounding box — generous enough that the haversine check below
    // never misses a provider within their acceptedRadiusKm (max 200 km).
    const latDelta = 100 / 111
    const lngDelta = 100 / (111 * Math.cos((lat * Math.PI) / 180))
    where.lat = { gte: lat - latDelta, lte: lat + latDelta }
    where.lng = { gte: lng - lngDelta, lte: lng + lngDelta }
  }

  // Fetch bbox-reduced set from DB (safety cap: 500 rows)
  const rows = await prisma.provider.findMany({
    where,
    include: { availability: { where: { isActive: true } } },
    orderBy: [{ createdAt: 'desc' }],
    take: 500,
  })

  // --- Pre-compute distances ---
  const distanceMap = new Map<string, number>()
  if (lat != null && lng != null) {
    for (const p of rows) {
      if (p.lat != null && p.lng != null) {
        distanceMap.set(p.id, haversineKm(lat, lng, p.lat, p.lng))
      }
    }
  }

  // --- In-JS filters (identical logic to original routes) ---
  let results = rows

  // Precise haversine radius filter (each provider sets their own acceptedRadiusKm)
  if (lat != null && lng != null) {
    results = results.filter((p) => {
      const dist = distanceMap.get(p.id)
      if (dist === undefined) return false
      return dist <= p.acceptedRadiusKm
    })
  }

  // Keyword filter — profession OR tags
  if (kw) {
    results = results.filter(
      (p) =>
        p.profession.toLowerCase().includes(kw) ||
        p.keywords.some((k) => k.toLowerCase().includes(kw))
    )
  }

  // Name substring filter
  if (nm) {
    results = results.filter((p) => p.name.toLowerCase().includes(nm))
  }

  // Day-of-week filter — getUTCDay() because YYYY-MM-DD parses as UTC midnight
  if (date) {
    const dayOfWeek = new Date(date).getUTCDay()
    results = results.filter((p) => {
      if (p.availability.length === 0) return true
      return p.availability.some((a) => a.dayOfWeek === dayOfWeek && a.isActive)
    })
  }

  // --- Sort: distance asc, fallback to DB createdAt desc (already ordered) ---
  if (lat != null && lng != null) {
    results.sort((a, b) => {
      const dA = distanceMap.get(a.id) ?? Infinity
      const dB = distanceMap.get(b.id) ?? Infinity
      return dA - dB
    })
  }

  // --- Paginate ---
  const safePage = Math.max(1, page)
  const safePageSize = Math.min(Math.max(1, pageSize), 100)
  const offset = (safePage - 1) * safePageSize
  const pageSlice = results.slice(offset, offset + safePageSize)
  const hasMore = results.length > offset + safePageSize

  const providers: ProviderResult[] = pageSlice.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    profession: p.profession,
    avatarUrl: p.avatarUrl,
    keywords: p.keywords,
    lat: p.lat,
    lng: p.lng,
    createdAt: p.createdAt,
    distanceKm: distanceMap.has(p.id)
      ? Math.round(distanceMap.get(p.id)! * 10) / 10
      : null,
  }))

  return { providers, page: safePage, pageSize: safePageSize, hasMore }
}
