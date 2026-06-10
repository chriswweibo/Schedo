import { NextRequest, NextResponse } from 'next/server'
import { parseISO, startOfDay, endOfDay, format } from 'date-fns'
import { prisma } from '@/lib/prisma'
import { CreateBookingSchema } from '@/lib/validations'
import { timesOverlap } from '@/lib/availability'
import { sendInstantConfirmation, sendRequestSubmitted } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = CreateBookingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const {
      providerId, date: dateStr, startTime, endTime,
      guestName, guestEmail, guestPhone, notes, bookingType,
    } = parsed.data
    const date = parseISO(dateStr)
    const dayStart = startOfDay(date)
    const dayEnd = endOfDay(date)

    const provider = await prisma.provider.findUnique({ where: { id: providerId } })
    if (!provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 })

    const [existingBookings, blockedSlots] = await Promise.all([
      prisma.booking.findMany({
        where: { providerId, date: { gte: dayStart, lte: dayEnd }, status: 'CONFIRMED' },
        select: { startTime: true, endTime: true, status: true },
      }),
      prisma.blockedSlot.findMany({
        where: { providerId, date: { gte: dayStart, lte: dayEnd } },
        select: { startTime: true, endTime: true },
      }),
    ])

    const allBlocked = [
      ...existingBookings.map((b) => ({ startTime: b.startTime, endTime: b.endTime })),
      ...blockedSlots,
    ]

    const overlap = allBlocked.some((b) =>
      timesOverlap(startTime, endTime, b.startTime, b.endTime)
    )
    if (overlap) {
      return NextResponse.json({ error: 'This time slot is no longer available' }, { status: 409 })
    }

    const isInstant =
      provider.bookingMode === 'INSTANT' ||
      (provider.bookingMode === 'BOTH' && bookingType === 'INSTANT')

    const booking = await prisma.booking.create({
      data: {
        providerId, date, startTime, endTime,
        guestName, guestEmail, guestPhone, notes,
        status: isInstant ? 'CONFIRMED' : 'PENDING',
      },
    })

    const formattedDate = format(date, 'MMMM d, yyyy')
    const emailParams = {
      guestEmail, guestName, providerName: provider.name,
      providerEmail: provider.email, date: formattedDate,
      startTime, endTime, profession: provider.profession,
    }

    if (isInstant) {
      sendInstantConfirmation(emailParams).catch((err) =>
        console.error('[email] sendInstantConfirmation failed:', err)
      )
    } else {
      sendRequestSubmitted(emailParams).catch((err) =>
        console.error('[email] sendRequestSubmitted failed:', err)
      )
    }

    return NextResponse.json(booking, { status: 201 })
  } catch (err) {
    console.error('[bookings] POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
