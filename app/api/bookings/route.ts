import { NextRequest, NextResponse } from 'next/server'
import { parseISO, startOfDay, endOfDay, format } from 'date-fns'
import { randomUUID } from 'crypto'
import { prisma } from '@/lib/prisma'
import { CreateBookingSchema } from '@/lib/validations'
import { sendInstantConfirmation, sendRequestSubmitted } from '@/lib/email'
import { checkRateLimit, clientIp } from '@/lib/ratelimit'
import { encrypt } from '@/lib/crypto'

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
    const dateValue = parseISO(dateStr)
    const dayStart = startOfDay(dateValue)
    const dayEnd = endOfDay(dateValue)

    const provider = await prisma.provider.findUnique({
      where: { id: providerId },
      select: { id: true, name: true, email: true, bookingMode: true, profession: true },
    })
    if (!provider) return NextResponse.json({ error: 'Provider not found' }, { status: 404 })

    const isInstant =
      provider.bookingMode === 'INSTANT' ||
      (provider.bookingMode === 'BOTH' && bookingType === 'INSTANT')

    const status = isInstant ? 'CONFIRMED' : 'PENDING'

    // Encrypt PII in app code — raw INSERT bypasses the Prisma extension that
    // normally encrypts on create/update. Must match BOOKING_PII_FIELDS exactly:
    // guestName, guestEmail, guestPhone, notes.
    const id = randomUUID()
    const encName = encrypt(guestName)!
    const encEmail = encrypt(guestEmail)!
    const encPhone = guestPhone ? encrypt(guestPhone) : null
    const encNotes = notes ? encrypt(notes) : null

    // Single atomic INSERT … WHERE NOT EXISTS — avoids interactive transactions
    // which are incompatible with Neon's pgbouncer pooler (transaction mode).
    const inserted = await prisma.$executeRaw`
      INSERT INTO "Booking" ("id","providerId","guestName","guestEmail","guestPhone","date","startTime","endTime","status","notes","createdAt")
      SELECT ${id}, ${providerId}, ${encName}, ${encEmail}, ${encPhone}, ${dateValue}, ${startTime}, ${endTime}, ${status}::"BookingStatus", ${encNotes}, now()
      WHERE NOT EXISTS (
        SELECT 1 FROM "Booking" b
        WHERE b."providerId" = ${providerId}
          AND b."date" >= ${dayStart} AND b."date" <= ${dayEnd}
          AND b."status" = 'CONFIRMED'
          AND b."startTime" < ${endTime} AND b."endTime" > ${startTime}
      )
      AND NOT EXISTS (
        SELECT 1 FROM "BlockedSlot" s
        WHERE s."providerId" = ${providerId}
          AND s."date" >= ${dayStart} AND s."date" <= ${dayEnd}
          AND s."startTime" < ${endTime} AND s."endTime" > ${startTime}
      )
    `

    if (inserted === 0) {
      return NextResponse.json({ error: 'This time slot is no longer available' }, { status: 409 })
    }

    const formattedDate = format(dateValue, 'MMMM d, yyyy')
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

    return NextResponse.json({ id, status, date: dateValue, startTime, endTime }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
