import { NextRequest, NextResponse } from 'next/server'
import { parseISO, startOfDay, endOfDay, format } from 'date-fns'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { CreateBookingSchema } from '@/lib/validations'
import { timesOverlap } from '@/lib/availability'
import { sendInstantConfirmation, sendRequestSubmitted } from '@/lib/email'
import { checkRateLimit, clientIp } from '@/lib/ratelimit'

// Minimal shape of the interactive transaction client we need inside the tx callback.
type TxClient = {
  booking: {
    findMany: typeof prisma.booking.findMany
    create: typeof prisma.booking.create
  }
  blockedSlot: {
    findMany: typeof prisma.blockedSlot.findMany
  }
}

export async function POST(req: NextRequest) {
  const { ok } = await checkRateLimit('booking:' + clientIp(req), 5, 60)
  if (!ok) {
    return NextResponse.json({ error: 'Too many requests, please try again shortly.' }, { status: 429 })
  }

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

    const isInstant =
      provider.bookingMode === 'INSTANT' ||
      (provider.bookingMode === 'BOTH' && bookingType === 'INSTANT')

    let booking: Awaited<ReturnType<typeof prisma.booking.create>>

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      booking = await (prisma as any).$transaction(
        async (tx: TxClient) => {
          const [existingBookings, blockedSlots] = await Promise.all([
            tx.booking.findMany({
              where: { providerId, date: { gte: dayStart, lte: dayEnd }, status: 'CONFIRMED' },
              select: { startTime: true, endTime: true, status: true },
            }),
            tx.blockedSlot.findMany({
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
            throw Object.assign(new Error('This time slot is no longer available'), { code: 'OVERLAP' })
          }

          return tx.booking.create({
            data: {
              providerId, date, startTime, endTime,
              guestName, guestEmail, guestPhone, notes,
              status: isInstant ? 'CONFIRMED' : 'PENDING',
            },
          })
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      )
    } catch (txErr) {
      const err = txErr as { code?: string }
      if (err.code === 'OVERLAP' || err.code === 'P2034') {
        return NextResponse.json({ error: 'This time slot is no longer available' }, { status: 409 })
      }
      throw txErr
    }

    const formattedDate = format(date, 'MMMM d, yyyy')
    const emailParams = {
      guestEmail, guestName, providerName: provider.name,
      providerEmail: provider.email, date: formattedDate,
      startTime, endTime, profession: provider.profession,
    }

    if (isInstant) {
      void sendInstantConfirmation(emailParams).catch((e) => console.error('[email] sendInstantConfirmation failed', e))
    } else {
      void sendRequestSubmitted(emailParams).catch((e) => console.error('[email] sendRequestSubmitted failed', e))
    }

    return NextResponse.json(booking, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
