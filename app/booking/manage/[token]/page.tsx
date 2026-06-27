import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { verifyBookingToken } from '@/lib/bookingToken'
import { Card } from '@/components/ui/card'
import { ManageBooking } from '@/components/booking/ManageBooking'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Manage your booking — Schedo' }

export default async function ManageBookingPage({ params }: { params: { token: string } }) {
  const id = verifyBookingToken(params.token)
  if (!id) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16">
        <Card className="p-8 text-center">
          <h1 className="text-xl font-bold mb-2">Link not valid</h1>
          <p className="text-sm text-muted-foreground">This booking link is invalid or has expired.</p>
        </Card>
      </main>
    )
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    select: {
      status: true, date: true, startTime: true, endTime: true, guestName: true, providerId: true,
      provider: {
        select: {
          name: true,
          availability: { where: { isActive: true }, select: { dayOfWeek: true, isActive: true } },
        },
      },
    },
  })
  if (!booking) notFound()

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <h1 className="text-2xl font-bold mb-1">Your booking</h1>
      <p className="text-sm text-muted-foreground mb-6">Hi {booking.guestName} — manage your booking below.</p>
      <ManageBooking
        token={params.token}
        providerId={booking.providerId}
        availability={booking.provider.availability}
        initial={{
          status: booking.status,
          providerName: booking.provider.name,
          date: format(booking.date, 'yyyy-MM-dd'),
          startTime: booking.startTime,
          endTime: booking.endTime,
        }}
      />
    </main>
  )
}
