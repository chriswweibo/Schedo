export const dynamic = 'force-dynamic'

import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { startOfDay } from 'date-fns'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
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

  const upcoming = bookings

  return (
    <DashboardClient
      provider={provider}
      upcoming={upcoming}
      jobs={jobs}
      slug={session.user.slug}
      googleConnected={!!provider.googleId}
    />
  )
}
