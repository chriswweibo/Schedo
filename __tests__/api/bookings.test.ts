/**
 * @jest-environment node
 */
import { POST } from '@/app/api/bookings/route'
import { PATCH } from '@/app/api/bookings/[id]/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    provider: { findUnique: jest.fn() },
    booking: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    blockedSlot: { findMany: jest.fn() },
  },
}))
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/email', () => ({
  sendInstantConfirmation: jest.fn(),
  sendRequestSubmitted: jest.fn(),
  sendRequestAccepted: jest.fn(),
  sendRequestDeclined: jest.fn(),
}))

import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'

const validBody = {
  providerId: 'p1',
  date: '2026-05-04',
  startTime: '10:00',
  endTime: '11:00',
  guestName: 'Alice',
  guestEmail: 'alice@example.com',
  bookingType: 'INSTANT',
}

describe('POST /api/bookings', () => {
  beforeEach(() => jest.clearAllMocks())

  it('creates CONFIRMED booking for INSTANT mode', async () => {
    ;(prisma.provider.findUnique as jest.Mock).mockResolvedValue({
      id: 'p1', name: 'Bob', profession: 'Plumber', bookingMode: 'INSTANT', email: 'bob@example.com',
    })
    ;(prisma.booking.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.blockedSlot.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.booking.create as jest.Mock).mockResolvedValue({ id: 'b1', status: 'CONFIRMED' })

    const req = new NextRequest('http://localhost/api/bookings', {
      method: 'POST',
      body: JSON.stringify(validBody),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.status).toBe('CONFIRMED')
  })

  it('creates PENDING booking for REQUEST mode', async () => {
    ;(prisma.provider.findUnique as jest.Mock).mockResolvedValue({
      id: 'p1', name: 'Bob', profession: 'Plumber', bookingMode: 'REQUEST', email: 'bob@example.com',
    })
    ;(prisma.booking.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.blockedSlot.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.booking.create as jest.Mock).mockResolvedValue({ id: 'b1', status: 'PENDING' })

    const req = new NextRequest('http://localhost/api/bookings', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, bookingType: 'REQUEST' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.status).toBe('PENDING')
  })

  it('returns 409 on time overlap', async () => {
    ;(prisma.provider.findUnique as jest.Mock).mockResolvedValue({
      id: 'p1', name: 'Bob', profession: 'Plumber', bookingMode: 'INSTANT', email: 'bob@example.com',
    })
    ;(prisma.booking.findMany as jest.Mock).mockResolvedValue([
      { startTime: '10:00', endTime: '11:00', status: 'CONFIRMED' },
    ])
    ;(prisma.blockedSlot.findMany as jest.Mock).mockResolvedValue([])

    const req = new NextRequest('http://localhost/api/bookings', {
      method: 'POST',
      body: JSON.stringify(validBody),
    })
    const res = await POST(req)
    expect(res.status).toBe(409)
  })
})

describe('PATCH /api/bookings/[id]', () => {
  beforeEach(() => jest.clearAllMocks())

  it('allows provider to accept a pending booking', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'p1', slug: 'bob' } })
    ;(prisma.booking.findUnique as jest.Mock).mockResolvedValue({
      id: 'b1', providerId: 'p1', status: 'PENDING',
      guestEmail: 'alice@example.com', guestName: 'Alice',
      provider: { name: 'Bob', profession: 'Plumber' },
      date: new Date('2026-05-04'), startTime: '10:00', endTime: '11:00',
    })
    ;(prisma.booking.update as jest.Mock).mockResolvedValue({ id: 'b1', status: 'CONFIRMED' })

    const req = new NextRequest('http://localhost/api/bookings/b1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'CONFIRMED' }),
    })
    const res = await PATCH(req, { params: { id: 'b1' } })
    expect(res.status).toBe(200)
  })

  it('returns 401 when not authenticated', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/bookings/b1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'CONFIRMED' }),
    })
    const res = await PATCH(req, { params: { id: 'b1' } })
    expect(res.status).toBe(401)
  })
})
