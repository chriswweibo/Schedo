import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { UpdateProviderSettingsSchema } from '@/lib/validations'

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const provider = await prisma.provider.findUnique({
      where: { slug: params.slug },
      select: {
        id: true, name: true, slug: true, bio: true, avatarUrl: true,
        profession: true, keywords: true, lat: true, lng: true,
        acceptedRadiusKm: true, bookingMode: true, isVisible: true,
        createdAt: true,
        availability: { where: { isActive: true } },
        completedJobs: {
          orderBy: { completedAt: 'desc' },
          take: 24,
          select: { id: true, title: true, description: true, imageUrl: true, completedAt: true },
        },
      },
    })

    if (!provider) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(provider)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.user.slug !== params.slug) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const parsed = UpdateProviderSettingsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { address, ...rest } = parsed.data
    let geoUpdate: { lat?: number; lng?: number } = {}

    if (address) {
      try {
        const token = process.env.MAPBOX_TOKEN
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${token}&limit=1`
        const geoRes = await fetch(url)
        const geoData = await geoRes.json()
        const [geoLng, geoLat] = geoData.features?.[0]?.center ?? [null, null]
        if (geoLat !== null && geoLng !== null) geoUpdate = { lat: geoLat, lng: geoLng }
      } catch {
        // Geocoding failure is non-fatal — proceed without updating location
      }
    }

    const updated = await prisma.provider.update({
      where: { slug: params.slug },
      data: { ...rest, ...geoUpdate },
      select: {
        id: true, name: true, slug: true, bio: true, avatarUrl: true,
        profession: true, keywords: true, lat: true, lng: true,
        acceptedRadiusKm: true, bookingMode: true, isVisible: true,
      },
    })

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
