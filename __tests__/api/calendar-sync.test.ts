/**
 * @jest-environment node
 */
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/googleCalendar', () => ({ syncProviderCalendar: jest.fn() }))

import { POST } from '@/app/api/me/calendar/sync/route'
import { getServerSession } from 'next-auth'
import { syncProviderCalendar } from '@/lib/googleCalendar'

function req() {
  return new Request('http://localhost/api/me/calendar/sync', { method: 'POST' })
}

describe('POST /api/me/calendar/sync', () => {
  beforeEach(() => jest.clearAllMocks())

  it('401 when unauthenticated', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(null)
    const res = await POST(req() as never)
    expect(res.status).toBe(401)
  })

  it('200 with syncedAt + blockCount on success', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'p1' } })
    ;(syncProviderCalendar as jest.Mock).mockResolvedValue({ syncedAt: new Date('2026-06-11T00:00:00Z'), blockCount: 3 })
    const res = await POST(req() as never)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.blockCount).toBe(3)
  })

  it('400 when not connected', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'p1' } })
    ;(syncProviderCalendar as jest.Mock).mockRejectedValue(new Error('Google Calendar not connected'))
    const res = await POST(req() as never)
    expect(res.status).toBe(400)
  })

  it('500 on an unexpected sync error', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'p1' } })
    ;(syncProviderCalendar as jest.Mock).mockRejectedValue(new Error('boom'))
    const res = await POST(req() as never)
    expect(res.status).toBe(500)
  })
})
