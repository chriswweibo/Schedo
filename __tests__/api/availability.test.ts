/**
 * @jest-environment node
 */
import { GET } from '@/app/api/availability/[providerId]/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    provider: { findUnique: jest.fn() },
    booking: { findMany: jest.fn() },
    blockedSlot: { findMany: jest.fn() },
  },
}))

import { prisma } from '@/lib/prisma'

describe('GET /api/availability/[providerId]', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns available slots for a valid date', async () => {
    ;(prisma.provider.findUnique as jest.Mock).mockResolvedValue({
      id: 'p1',
      availability: [{ dayOfWeek: 1, startTime: '09:00', endTime: '11:00', isActive: true }],
    })
    ;(prisma.booking.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.blockedSlot.findMany as jest.Mock).mockResolvedValue([])

    const req = new NextRequest(
      'http://localhost/api/availability/p1?date=2026-05-04'
    )
    const res = await GET(req, { params: { providerId: 'p1' } })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveLength(2) // 09:00-10:00, 10:00-11:00
  })

  it('returns 400 for missing date', async () => {
    const req = new NextRequest('http://localhost/api/availability/p1')
    const res = await GET(req, { params: { providerId: 'p1' } })
    expect(res.status).toBe(400)
  })

  it('returns 404 for unknown provider', async () => {
    ;(prisma.provider.findUnique as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/availability/bad?date=2026-05-04')
    const res = await GET(req, { params: { providerId: 'bad' } })
    expect(res.status).toBe(404)
  })
})
