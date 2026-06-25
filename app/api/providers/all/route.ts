import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, clientIp } from '@/lib/ratelimit'

export async function GET(req: NextRequest) {
  const { ok } = await checkRateLimit('all:' + clientIp(req), 60, 60)
  if (!ok) {
    return NextResponse.json({ error: 'Too many requests, please try again shortly.' }, { status: 429 })
  }

  try {
    const providers = await prisma.provider.findMany({
      where: { isVisible: true, lat: { not: null }, lng: { not: null } },
      select: { id: true, name: true, slug: true, profession: true, lat: true, lng: true },
      take: 500,
    })
    return NextResponse.json(providers, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
