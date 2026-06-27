import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { format } from 'date-fns'
import { waitUntil } from '@vercel/functions'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendRequestAccepted, sendRequestDeclined, sendBookingCancelled } from '@/lib/email'
import { bookingManageUrl } from '@/lib/bookingToken'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const booking = await prisma.booking.findUnique({
      where: { id: params.id },
      include: { provider: { select: { name: true, profession: true, id: true } } },
    })
    if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    if (booking.providerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { status } = await req.json()
    if (!['CONFIRMED', 'DECLINED', 'CANCELLED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const updated = await prisma.booking.update({
      where: { id: params.id },
      data: { status },
    })

    const formattedDate = format(booking.date, 'MMMM d, yyyy')
    if (status === 'CONFIRMED') {
      waitUntil(
        sendRequestAccepted({
          guestEmail: booking.guestEmail,
          guestName: booking.guestName,
          providerName: booking.provider.name,
          date: formattedDate,
          startTime: booking.startTime,
          endTime: booking.endTime,
          profession: booking.provider.profession,
          manageUrl: bookingManageUrl(booking.id),
        }).catch((e) => console.error('[email] sendRequestAccepted failed', e))
      )
    } else if (status === 'DECLINED') {
      waitUntil(
        sendRequestDeclined({
          guestEmail: booking.guestEmail,
          guestName: booking.guestName,
          providerName: booking.provider.name,
          date: formattedDate,
        }).catch((e) => console.error('[email] sendRequestDeclined failed', e))
      )
    } else if (status === 'CANCELLED') {
      waitUntil(
        sendBookingCancelled({
          guestEmail: booking.guestEmail,
          guestName: booking.guestName,
          providerName: booking.provider.name,
          date: formattedDate,
        }).catch((e) => console.error('[email] sendBookingCancelled failed', e))
      )
    }

    return NextResponse.json(updated)
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
