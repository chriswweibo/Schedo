import { NextResponse } from 'next/server'
import { z } from 'zod'
import { parseISO, startOfDay, endOfDay, format } from 'date-fns'
import { waitUntil } from '@vercel/functions'
import { prisma } from '@/lib/prisma'
import { verifyBookingToken } from '@/lib/bookingToken'
import { sendProviderBookingCancelled, sendProviderBookingRescheduled } from '@/lib/email'

const Schema = z.object({
  token: z.string().min(1),
  action: z.enum(['cancel', 'reschedule']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
})

export async function POST(req: Request) {
  try {
    const parsed = Schema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
    const { token, action } = parsed.data

    const bookingId = verifyBookingToken(token)
    if (!bookingId) return NextResponse.json({ error: 'Invalid or expired link' }, { status: 401 })

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true, providerId: true, status: true, date: true, startTime: true, endTime: true,
        guestName: true,
        provider: { select: { name: true, email: true } },
      },
    })
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 })

    if (action === 'cancel') {
      if (booking.status === 'CANCELLED' || booking.status === 'DECLINED') {
        return NextResponse.json({ ok: true, status: booking.status })
      }
      await prisma.booking.update({ where: { id: booking.id }, data: { status: 'CANCELLED' } })
      waitUntil(
        sendProviderBookingCancelled({
          providerEmail: booking.provider.email,
          guestName: booking.guestName,
          date: format(booking.date, 'MMMM d, yyyy'),
          startTime: booking.startTime,
          endTime: booking.endTime,
        }).catch((e) => console.error('[email] provider cancel notice failed', e)),
      )
      return NextResponse.json({ ok: true, status: 'CANCELLED' })
    }

    // action === 'reschedule'
    const { date, startTime, endTime } = parsed.data
    if (!date || !startTime || !endTime) {
      return NextResponse.json({ error: 'New date and time are required' }, { status: 400 })
    }
    if (booking.status !== 'PENDING' && booking.status !== 'CONFIRMED') {
      return NextResponse.json({ error: 'This booking can no longer be changed' }, { status: 409 })
    }
    if (startTime >= endTime) {
      return NextResponse.json({ error: 'Invalid time range' }, { status: 400 })
    }

    const dateValue = parseISO(date)
    const dayStart = startOfDay(dateValue)
    const dayEnd = endOfDay(dateValue)

    // Atomic move: only if the new slot is free of OTHER pending/confirmed
    // bookings and blocked slots (excludes this booking itself).
    const updated = await prisma.$executeRaw`
      UPDATE "Booking"
      SET "date" = ${dateValue}, "startTime" = ${startTime}, "endTime" = ${endTime}
      WHERE id = ${booking.id}
        AND status IN ('PENDING', 'CONFIRMED')
        AND NOT EXISTS (
          SELECT 1 FROM "Booking" b
          WHERE b."providerId" = ${booking.providerId} AND b.id <> ${booking.id}
            AND b."date" >= ${dayStart} AND b."date" <= ${dayEnd}
            AND b."status" IN ('CONFIRMED', 'PENDING')
            AND b."startTime" < ${endTime} AND b."endTime" > ${startTime}
        )
        AND NOT EXISTS (
          SELECT 1 FROM "BlockedSlot" s
          WHERE s."providerId" = ${booking.providerId}
            AND s."date" >= ${dayStart} AND s."date" <= ${dayEnd}
            AND s."startTime" < ${endTime} AND s."endTime" > ${startTime}
        )
    `
    if (updated === 0) {
      return NextResponse.json({ error: 'That time is no longer available' }, { status: 409 })
    }

    waitUntil(
      sendProviderBookingRescheduled({
        providerEmail: booking.provider.email,
        guestName: booking.guestName,
        date: format(dateValue, 'MMMM d, yyyy'),
        startTime,
        endTime,
      }).catch((e) => console.error('[email] provider reschedule notice failed', e)),
    )
    return NextResponse.json({ ok: true, status: booking.status, date, startTime, endTime })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
