import { NextRequest, NextResponse } from 'next/server'
import * as bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { RegisterProviderSchema } from '@/lib/validations'
import { haversineKm } from '@/lib/geo'

function generateSlug(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const suffix = Math.random().toString(36).slice(2, 7)
  return `${base}-${suffix}`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = RegisterProviderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { name, email, password, profession } = parsed.data

    const existing = await prisma.provider.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const slug = generateSlug(name)

    const provider = await prisma.provider.create({
      data: { name, email, passwordHash, profession, slug },
      select: { id: true, name: true, slug: true, email: true, profession: true },
    })

    return NextResponse.json(provider, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const lat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : null
  const lng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : null
  const keyword = searchParams.get('keyword')?.toLowerCase() ?? ''
  const date = searchParams.get('date') // YYYY-MM-DD

  const providers = await prisma.provider.findMany({
    where: { isVisible: true },
    include: { availability: { where: { isActive: true } } },
    orderBy: [{ createdAt: 'desc' }],
    take: 200,
  })

  let results = providers

  // Geographic filter: only include providers whose accepted radius covers the search point
  if (lat !== null && lng !== null) {
    results = results.filter((p) => {
      if (p.lat === null || p.lng === null) return false
      const dist = haversineKm(lat, lng, p.lat, p.lng)
      return dist <= p.acceptedRadiusKm
    })
  }

  // Keyword filter against profession and keywords array
  if (keyword) {
    results = results.filter(
      (p) =>
        p.profession.toLowerCase().includes(keyword) ||
        p.keywords.some((k) => k.toLowerCase().includes(keyword))
    )
  }

  // Day-of-week filter: only providers who have availability on that day
  if (date) {
    const dayOfWeek = new Date(date).getDay()
    results = results.filter((p) =>
      p.availability.some((a) => a.dayOfWeek === dayOfWeek && a.isActive)
    )
  }

  // Sort by distance asc (when location given), then createdAt desc
  if (lat !== null && lng !== null) {
    results.sort((a, b) => {
      const dA = a.lat !== null ? haversineKm(lat, lng!, a.lat, a.lng!) : Infinity
      const dB = b.lat !== null ? haversineKm(lat, lng!, b.lat, b.lng!) : Infinity
      return dA - dB
    })
  }

  const response = results.slice(0, 50).map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    profession: p.profession,
    avatarUrl: p.avatarUrl,
    keywords: p.keywords,
    lat: p.lat,
    lng: p.lng,
    createdAt: p.createdAt,
    distanceKm:
      lat !== null && p.lat !== null
        ? Math.round(haversineKm(lat, lng!, p.lat, p.lng!) * 10) / 10
        : null,
  }))

  return NextResponse.json(response)
}
