import { NextRequest, NextResponse } from 'next/server'
import { startOfDay, endOfDay, parseISO } from 'date-fns'
import { prisma } from '@/lib/prisma'
import { getAvailableSlots } from '@/lib/availability'

export async function GET(
  req: NextRequest,
  { params }: { params: { providerId: string } }
) {
  try {
    const dateParam = req.nextUrl.searchParams.get('date')
    if (!dateParam) return NextResponse.json({ error: 'date required' }, { status: 400 })

    const date = parseISO(dateParam)

    const provider = await prisma.provider.findUnique({
      where: { id: params.providerId },
      include: { availability: { where: { isActive: true } } },
    })
    if (!provider) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const dayStart = startOfDay(date)
    const dayEnd = endOfDay(date)

    const [bookings, blocked] = await Promise.all([
      prisma.booking.findMany({
        where: { providerId: params.providerId, date: { gte: dayStart, lte: dayEnd } },
        select: { startTime: true, endTime: true, status: true },
      }),
      prisma.blockedSlot.findMany({
        where: { providerId: params.providerId, date: { gte: dayStart, lte: dayEnd } },
        select: { startTime: true, endTime: true },
      }),
    ])

    const slots = getAvailableSlots(provider.availability, bookings, blocked, date)
    return NextResponse.json(slots)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
