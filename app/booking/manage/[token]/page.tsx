import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { Card } from '@/components/ui/Card'
import { prisma } from '@/lib/prisma'
import { ManageBookingClient } from '@/components/booking/ManageBookingClient'

export default async function ManageBookingPage({
  params,
}: {
  params: { token: string }
}) {
  const booking = await prisma.booking.findUnique({
    where: { manageToken: params.token },
    include: { provider: { select: { id: true, name: true, profession: true } } },
  })
  if (!booking) notFound()

  const [h, m] = booking.startTime.split(':').map(Number)
  const start = new Date(booking.date)
  start.setHours(h, m, 0, 0)
  const editable =
    start.getTime() > Date.now() &&
    booking.status !== 'CANCELLED' &&
    booking.status !== 'DECLINED'

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold">Manage your booking</h1>
      <p className="mb-6 text-stone-500">
        {booking.provider.name} · {booking.provider.profession}
      </p>
      <Card className="p-6">
        {editable ? (
          <ManageBookingClient
            token={params.token}
            providerId={booking.provider.id}
            initial={{
              date: format(booking.date, 'yyyy-MM-dd'),
              startTime: booking.startTime,
              endTime: booking.endTime,
              status: booking.status,
              guestName: booking.guestName,
              guestPhone: booking.guestPhone ?? '',
              notes: booking.notes ?? '',
            }}
          />
        ) : (
          <div>
            <p className="mb-1 text-sm text-stone-700">
              {format(booking.date, 'MMMM d, yyyy')} · {booking.startTime} – {booking.endTime}
            </p>
            <p className="text-sm font-medium text-stone-500">
              Status: {booking.status}
            </p>
            <p className="mt-4 text-sm text-stone-500">
              This booking can no longer be modified.
            </p>
          </div>
        )}
      </Card>
    </main>
  )
}
