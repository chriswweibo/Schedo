import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CreateQuoteRequestSchema } from '@/lib/validations'
import { waitUntil } from '@vercel/functions'
import { sendQuoteRequestToProvider, sendQuoteRequestConfirmation } from '@/lib/email'
import { checkRateLimit, clientIp } from '@/lib/ratelimit'
import { encrypt } from '@/lib/crypto'

export async function POST(req: NextRequest) {
  const { ok } = await checkRateLimit('quote:' + clientIp(req), 5, 60)
  if (!ok) {
    return NextResponse.json({ error: 'Too many requests, please try again shortly.' }, { status: 429 })
  }

  try {
    const body = await req.json()
    const parsed = CreateQuoteRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { providerIds, guestName, guestEmail, guestPhone, message } = parsed.data
    const uniqueIds = Array.from(new Set(providerIds)).slice(0, 5)

    // Only visible providers with a contact email.
    const providers = await prisma.provider.findMany({
      where: { id: { in: uniqueIds }, isVisible: true },
      select: { id: true, name: true, email: true },
    })
    if (providers.length === 0) {
      return NextResponse.json({ error: 'No valid providers selected.' }, { status: 400 })
    }

    // Encrypt PII at rest (the booking crypto extension is scoped to Booking,
    // so encrypt explicitly here). Single create + single createMany are each
    // one statement — safe on the Neon pgbouncer pooler.
    const created = await prisma.quoteRequest.create({
      data: {
        guestName: encrypt(guestName)!,
        guestEmail: encrypt(guestEmail)!,
        guestPhone: guestPhone ? encrypt(guestPhone) : null,
        message: encrypt(message)!,
      },
      select: { id: true },
    })

    await prisma.quoteRequestProvider.createMany({
      data: providers.map((p) => ({ quoteRequestId: created.id, providerId: p.id })),
      skipDuplicates: true,
    })

    // Group-send after responding (serverless-safe via waitUntil).
    waitUntil(
      Promise.all([
        ...providers.map((p) =>
          p.email
            ? sendQuoteRequestToProvider({
                providerEmail: p.email,
                providerName: p.name,
                guestName,
                guestEmail,
                guestPhone,
                message,
              })
            : Promise.resolve()
        ),
        sendQuoteRequestConfirmation({
          guestName,
          guestEmail,
          guestPhone,
          message,
          providerNames: providers.map((p) => p.name),
        }),
      ])
    )

    return NextResponse.json({ id: created.id, sentTo: providers.length })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
