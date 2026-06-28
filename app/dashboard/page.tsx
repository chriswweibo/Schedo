export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { startOfDay } from 'date-fns'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decrypt } from '@/lib/crypto'
import { DashboardClient } from './DashboardClient'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/login')

  const [provider, bookings, jobs] = await Promise.all([
    prisma.provider.findUnique({
      where: { id: session.user.id },
      select: {
        id: true, name: true, slug: true, bio: true, profession: true,
        keywords: true, lat: true, lng: true,
        acceptedRadiusKm: true, bookingMode: true, isVisible: true,
        googleId: true,
        availability: { orderBy: { dayOfWeek: 'asc' } },
      },
    }),
    prisma.booking.findMany({
      where: {
        providerId: session.user.id,
        date: { gte: startOfDay(new Date()) },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      orderBy: { date: 'asc' },
      take: 200,
      select: {
        id: true, date: true, startTime: true, endTime: true,
        status: true, guestName: true, guestEmail: true,
      },
    }),
    prisma.completedJob.findMany({
      where: { providerId: session.user.id },
      orderBy: { completedAt: 'desc' },
      take: 24,
      select: { id: true, title: true, description: true, imageUrl: true, completedAt: true },
    }),
  ])

  if (!provider) redirect('/auth/login')

  // Quote requests group-sent to this provider. PII is encrypted at rest and
  // the booking crypto extension doesn't cover QuoteRequest, so decrypt here.
  // Wrapped defensively so the dashboard still loads if the migration that
  // creates these tables hasn't been applied yet.
  let quoteRequests: Array<{
    id: string; createdAt: Date; guestName: string; guestEmail: string; guestPhone: string | null; message: string
  }> = []
  try {
    const quoteLinks = await prisma.quoteRequestProvider.findMany({
      where: { providerId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        createdAt: true,
        quoteRequest: { select: { guestName: true, guestEmail: true, guestPhone: true, message: true } },
      },
    })
    quoteRequests = quoteLinks.map((q) => ({
      id: q.id,
      createdAt: q.createdAt,
      guestName: decrypt(q.quoteRequest.guestName) ?? '',
      guestEmail: decrypt(q.quoteRequest.guestEmail) ?? '',
      guestPhone: q.quoteRequest.guestPhone ? decrypt(q.quoteRequest.guestPhone) : null,
      message: decrypt(q.quoteRequest.message) ?? '',
    }))
  } catch (err) {
    console.error('[dashboard] quote requests query failed', err)
  }

  const upcoming = bookings

  return (
    <DashboardClient
      provider={provider}
      upcoming={upcoming}
      jobs={jobs}
      quoteRequests={quoteRequests}
      slug={session.user.slug}
      googleConnected={!!provider.googleId}
    />
  )
}
