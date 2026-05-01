import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const providers = await prisma.provider.findMany({
      where: { isVisible: true, lat: { not: null }, lng: { not: null } },
      select: { id: true, name: true, slug: true, profession: true, lat: true, lng: true },
      take: 500,
    })
    return NextResponse.json(providers)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
