import { NextRequest, NextResponse } from 'next/server'
import { startOfDay, endOfDay, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, format } from 'date-fns'
import { prisma } from '@/lib/prisma'
import { getAllSlots } from '@/lib/availability'

export async function GET(
  req: NextRequest,
  { params }: { params: { providerId: string } }
) {
  try {
    const monthParam = req.nextUrl.searchParams.get('month')
    if (monthParam) {
      // Return per-day fully-booked status for the month
      const monthStart = startOfMonth(parseISO(`${monthParam}-01`))
      const monthEnd = endOfMonth(monthStart)

      const provider = await prisma.provider.findUnique({
        where: { id: params.providerId },
        include: { availability: { where: { isActive: true } } },
      })
      if (!provider) return NextResponse.json({ error: 'Not found' }, { status: 404 })

      const [bookings, blocked] = await Promise.all([
        prisma.booking.findMany({
          where: { providerId: params.providerId, date: { gte: monthStart, lte: monthEnd } },
          select: { startTime: true, endTime: true, status: true, date: true },
        }),
        prisma.blockedSlot.findMany({
          where: { providerId: params.providerId, date: { gte: monthStart, lte: monthEnd } },
          select: { startTime: true, endTime: true, date: true },
        }),
      ])

      const result: Record<string, boolean> = {}
      for (const day of eachDayOfInterval({ start: monthStart, end: monthEnd })) {
        const key = format(day, 'yyyy-MM-dd')
        const dayBookings = bookings.filter((b) => format(b.date, 'yyyy-MM-dd') === key)
        const dayBlocked = blocked.filter((b) => format(b.date, 'yyyy-MM-dd') === key)
        const slots = getAllSlots(provider.availability, dayBookings, dayBlocked, day)
        result[key] = slots.length > 0 && slots.every((s) => s.status !== 'available')
      }

      return NextResponse.json(result)
    }

    const dateParam = req.nextUrl.searchParams.get('date')
    if (!dateParam) return NextResponse.json({ error: 'date or month required' }, { status: 400 })

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

    const slots = getAllSlots(provider.availability, bookings, blocked, date)
    return NextResponse.json(slots)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
