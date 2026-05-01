import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const Schema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  isActive: z.boolean(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const parsed = Schema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

    const { dayOfWeek, startTime, endTime, isActive } = parsed.data

    const availability = await prisma.availability.upsert({
      where: { providerId_dayOfWeek: { providerId: session.user.id, dayOfWeek } },
      update: { startTime, endTime, isActive },
      create: { providerId: session.user.id, dayOfWeek, startTime, endTime, isActive },
    })

    return NextResponse.json(availability)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
