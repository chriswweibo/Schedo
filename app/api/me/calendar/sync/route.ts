import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { syncProviderCalendar } from '@/lib/googleCalendar'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const result = await syncProviderCalendar(session.user.id)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed'
    const notConnected = /not connected/i.test(message)
    return NextResponse.json(
      { error: notConnected ? 'Google Calendar not connected' : 'Calendar sync failed' },
      { status: notConnected ? 400 : 500 },
    )
  }
}
