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
  try {
    const { searchParams } = req.nextUrl
    const lat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : null
    const lng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : null
    const keyword = searchParams.get('keyword')?.toLowerCase() ?? ''
    const name = searchParams.get('name')?.toLowerCase() ?? ''
    const date = searchParams.get('date')

    const providers = await prisma.provider.findMany({
      where: { isVisible: true },
      include: { availability: { where: { isActive: true } } },
      orderBy: [{ createdAt: 'desc' }],
      take: 200,
    })

    // Pre-compute distances once
    const distanceMap = new Map<string, number>()
    if (lat !== null && lng !== null) {
      for (const p of providers) {
        if (p.lat !== null && p.lng !== null) {
          distanceMap.set(p.id, haversineKm(lat, lng, p.lat, p.lng))
        }
      }
    }

    let results = providers

    // Geographic filter
    if (lat !== null && lng !== null) {
      results = results.filter((p) => {
        const dist = distanceMap.get(p.id)
        if (dist === undefined) return false
        return dist <= p.acceptedRadiusKm
      })
    }

    // Keyword filter (profession + tags)
    if (keyword) {
      results = results.filter(
        (p) =>
          p.profession.toLowerCase().includes(keyword) ||
          p.keywords.some((k) => k.toLowerCase().includes(keyword))
      )
    }

    // Name filter
    if (name) {
      results = results.filter((p) => p.name.toLowerCase().includes(name))
    }

    // Day-of-week filter — getUTCDay() because YYYY-MM-DD parses as UTC midnight
    if (date) {
      const dayOfWeek = new Date(date).getUTCDay()
      results = results.filter((p) => {
        if (p.availability.length === 0) return true
        return p.availability.some((a) => a.dayOfWeek === dayOfWeek && a.isActive)
      })
    }

    // Sort by distance asc, fallback to createdAt order (already from Prisma)
    if (lat !== null && lng !== null) {
      results.sort((a, b) => {
        const dA = distanceMap.get(a.id) ?? Infinity
        const dB = distanceMap.get(b.id) ?? Infinity
        return dA - dB
      })
    }

    const response = results.slice(0, 50).map((p) => {
      const distanceKm = distanceMap.has(p.id)
        ? Math.round(distanceMap.get(p.id)! * 10) / 10
        : null
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        profession: p.profession,
        avatarUrl: p.avatarUrl,
        keywords: p.keywords,
        lat: p.lat,
        lng: p.lng,
        createdAt: p.createdAt,
        distanceKm,
      }
    })

    return NextResponse.json(response)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
