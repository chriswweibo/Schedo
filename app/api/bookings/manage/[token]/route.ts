import { NextRequest, NextResponse } from 'next/server'
import { parseISO, startOfDay, endOfDay, format } from 'date-fns'
import { prisma } from '@/lib/prisma'
import { ManageBookingSchema } from '@/lib/validations'
import { timesOverlap } from '@/lib/availability'
import {
  sendBookingCancelledByGuest,
  sendBookingRescheduledByGuest,
  sendBookingDetailsUpdatedByGuest,
} from '@/lib/email'

function appointmentHasStarted(date: Date, startTime: string): boolean {
  const [h, m] = startTime.split(':').map(Number)
  const start = new Date(date)
  start.setHours(h, m, 0, 0)
  return start.getTime() <= Date.now()
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const body = await req.json()
    const parsed = ManageBookingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const booking = await prisma.booking.findUnique({
      where: { manageToken: params.token },
      include: {
        provider: { select: { name: true, email: true, profession: true, bookingMode: true } },
      },
    })
    if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (
      booking.status === 'CANCELLED' ||
      booking.status === 'DECLINED' ||
      appointmentHasStarted(booking.date, booking.startTime)
    ) {
      return NextResponse.json(
        { error: 'This booking can no longer be modified' },
        { status: 409 }
      )
    }

    const formattedDate = format(booking.date, 'MMMM d, yyyy')
    const data = parsed.data

    if (data.action === 'cancel') {
      const updated = await prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'CANCELLED' },
      })
      sendBookingCancelledByGuest({
        providerEmail: booking.provider.email,
        guestName: booking.guestName,
        date: formattedDate,
        startTime: booking.startTime,
        endTime: booking.endTime,
      }).catch((err) => console.error('[manage] cancel email failed:', err))
      return NextResponse.json(updated)
    }

    if (data.action === 'edit') {
      const updated = await prisma.booking.update({
        where: { id: booking.id },
        data: {
          guestName: data.guestName ?? booking.guestName,
          guestPhone: data.guestPhone ?? booking.guestPhone,
          notes: data.notes ?? booking.notes,
        },
      })
      sendBookingDetailsUpdatedByGuest({
        providerEmail: booking.provider.email,
        guestName: updated.guestName,
        date: formattedDate,
        startTime: booking.startTime,
        endTime: booking.endTime,
      }).catch((err) => console.error('[manage] edit email failed:', err))
      return NextResponse.json(updated)
    }

    // action === 'reschedule'
    const date = parseISO(data.date)
    const dayStart = startOfDay(date)
    const dayEnd = endOfDay(date)

    const [existingBookings, blockedSlots] = await Promise.all([
      prisma.booking.findMany({
        where: {
          providerId: booking.providerId,
          date: { gte: dayStart, lte: dayEnd },
          status: 'CONFIRMED',
          NOT: { id: booking.id },
        },
        select: { startTime: true, endTime: true },
      }),
      prisma.blockedSlot.findMany({
        where: { providerId: booking.providerId, date: { gte: dayStart, lte: dayEnd } },
        select: { startTime: true, endTime: true },
      }),
    ])

    const overlap = [...existingBookings, ...blockedSlots].some((b) =>
      timesOverlap(data.startTime, data.endTime, b.startTime, b.endTime)
    )
    if (overlap) {
      return NextResponse.json(
        { error: 'This time slot is no longer available' },
        { status: 409 }
      )
    }

    const isInstant =
      booking.provider.bookingMode === 'INSTANT' || booking.provider.bookingMode === 'BOTH'
    const newStatus = isInstant ? 'CONFIRMED' : 'PENDING'

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: { date, startTime: data.startTime, endTime: data.endTime, status: newStatus },
    })

    sendBookingRescheduledByGuest({
      guestEmail: booking.guestEmail,
      guestName: booking.guestName,
      providerName: booking.provider.name,
      providerEmail: booking.provider.email,
      date: format(date, 'MMMM d, yyyy'),
      startTime: data.startTime,
      endTime: data.endTime,
      profession: booking.provider.profession,
      manageToken: booking.manageToken ?? undefined,
      pending: !isInstant,
    }).catch((err) => console.error('[manage] reschedule email failed:', err))

    return NextResponse.json(updated)
  } catch (err) {
    console.error('[manage] PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
