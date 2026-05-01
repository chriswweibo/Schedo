import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
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
        availability: { orderBy: { dayOfWeek: 'asc' } },
      },
    }),
    prisma.booking.findMany({
      where: { providerId: session.user.id },
      orderBy: { date: 'asc' },
    }),
    prisma.completedJob.findMany({
      where: { providerId: session.user.id },
      orderBy: { completedAt: 'desc' },
    }),
  ])

  if (!provider) redirect('/auth/login')

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const pending = bookings.filter((b) => b.status === 'PENDING')
  const upcoming = bookings.filter(
    (b) => b.status === 'CONFIRMED' && new Date(b.date) >= startOfToday
  )

  return (
    <DashboardClient
      provider={provider}
      pending={pending}
      upcoming={upcoming}
      jobs={jobs}
      slug={session.user.slug}
    />
  )
}
