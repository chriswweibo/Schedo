import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DashboardClient } from './DashboardClient'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/login')

  const bookings = await prisma.booking.findMany({
    where: { providerId: session.user.id },
    orderBy: { date: 'asc' },
  })

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const upcoming = bookings.filter(
    (b) => b.status === 'CONFIRMED' && new Date(b.date) >= startOfToday
  )
  const pending = bookings.filter((b) => b.status === 'PENDING')

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link href="/dashboard/settings" className="text-sm text-primary hover:underline">Settings</Link>
      </div>
      <DashboardClient upcoming={upcoming} pending={pending} />
    </main>
  )
}
