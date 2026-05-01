import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    if (!from || !to) return NextResponse.json({ error: 'Missing from/to' }, { status: 400 })

    const fromDate = new Date(from)
    const toDate = new Date(to)
    toDate.setDate(toDate.getDate() + 1) // inclusive end

    const [bookings, blockedSlots] = await Promise.all([
      prisma.booking.findMany({
        where: {
          providerId: session.user.id,
          date: { gte: fromDate, lt: toDate },
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
        select: { id: true, date: true, startTime: true, endTime: true, status: true, guestName: true },
        orderBy: { date: 'asc' },
      }),
      prisma.blockedSlot.findMany({
        where: {
          providerId: session.user.id,
          date: { gte: fromDate, lt: toDate },
        },
        select: { id: true, date: true, startTime: true, endTime: true },
        orderBy: { date: 'asc' },
      }),
    ])

    return NextResponse.json({ bookings, blockedSlots })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
