/**
 * @jest-environment node
 */
import { POST } from '@/app/api/bookings/route'
import { PATCH } from '@/app/api/bookings/[id]/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    provider: { findUnique: jest.fn() },
    booking: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    blockedSlot: { findMany: jest.fn() },
    $executeRaw: jest.fn(),
  },
}))
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/email', () => ({
  sendInstantConfirmation: jest.fn().mockResolvedValue(undefined),
  sendRequestSubmitted: jest.fn().mockResolvedValue(undefined),
  sendRequestAccepted: jest.fn().mockResolvedValue(undefined),
  sendRequestDeclined: jest.fn().mockResolvedValue(undefined),
}))
jest.mock('@/lib/crypto', () => ({
  encrypt: jest.fn((v: string | null) => (v == null ? null : `enc:${v}`)),
  decrypt: jest.fn((v: string | null) => v),
}))

import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { sendInstantConfirmation, sendRequestSubmitted } from '@/lib/email'

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
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('creates CONFIRMED booking for INSTANT mode (non-overlapping)', async () => {
    ;(prisma.provider.findUnique as jest.Mock).mockResolvedValue({
      id: 'p1', name: 'Bob', profession: 'Plumber', bookingMode: 'INSTANT', email: 'bob@example.com',
    })
    ;(prisma.$executeRaw as unknown as jest.Mock).mockResolvedValue(1)

    const req = new NextRequest('http://localhost/api/bookings', {
      method: 'POST',
      body: JSON.stringify(validBody),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.status).toBe('CONFIRMED')
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1)
    expect(sendInstantConfirmation).toHaveBeenCalledTimes(1)
    expect(sendRequestSubmitted).not.toHaveBeenCalled()
  })

  it('creates PENDING booking for REQUEST mode', async () => {
    ;(prisma.provider.findUnique as jest.Mock).mockResolvedValue({
      id: 'p1', name: 'Bob', profession: 'Plumber', bookingMode: 'REQUEST', email: 'bob@example.com',
    })
    ;(prisma.$executeRaw as unknown as jest.Mock).mockResolvedValue(1)

    const req = new NextRequest('http://localhost/api/bookings', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, bookingType: 'REQUEST' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.status).toBe('PENDING')
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1)
    expect(sendRequestSubmitted).toHaveBeenCalledTimes(1)
    expect(sendInstantConfirmation).not.toHaveBeenCalled()
  })

  it('returns 409 and does NOT send email on time overlap ($executeRaw returns 0)', async () => {
    ;(prisma.provider.findUnique as jest.Mock).mockResolvedValue({
      id: 'p1', name: 'Bob', profession: 'Plumber', bookingMode: 'INSTANT', email: 'bob@example.com',
    })
    ;(prisma.$executeRaw as unknown as jest.Mock).mockResolvedValue(0)

    const req = new NextRequest('http://localhost/api/bookings', {
      method: 'POST',
      body: JSON.stringify(validBody),
    })
    const res = await POST(req)
    expect(res.status).toBe(409)
    const data = await res.json()
    expect(data.error).toBe('This time slot is no longer available')
    expect(sendInstantConfirmation).not.toHaveBeenCalled()
    expect(sendRequestSubmitted).not.toHaveBeenCalled()
  })

  it('returns 409 on blocked slot overlap ($executeRaw returns 0)', async () => {
    ;(prisma.provider.findUnique as jest.Mock).mockResolvedValue({
      id: 'p1', name: 'Bob', profession: 'Plumber', bookingMode: 'INSTANT', email: 'bob@example.com',
    })
    ;(prisma.$executeRaw as unknown as jest.Mock).mockResolvedValue(0)

    const req = new NextRequest('http://localhost/api/bookings', {
      method: 'POST',
      body: JSON.stringify(validBody),
    })
    const res = await POST(req)
    expect(res.status).toBe(409)
    expect(sendInstantConfirmation).not.toHaveBeenCalled()
  })

  it('creates CONFIRMED booking when BOTH mode + bookingType INSTANT', async () => {
    ;(prisma.provider.findUnique as jest.Mock).mockResolvedValue({
      id: 'p1', name: 'Bob', profession: 'Plumber', bookingMode: 'BOTH', email: 'bob@example.com',
    })
    ;(prisma.$executeRaw as unknown as jest.Mock).mockResolvedValue(1)

    const req = new NextRequest('http://localhost/api/bookings', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, bookingType: 'INSTANT' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.status).toBe('CONFIRMED')
    expect(sendInstantConfirmation).toHaveBeenCalledTimes(1)
  })

  it('encrypts PII fields before insert', async () => {
    ;(prisma.provider.findUnique as jest.Mock).mockResolvedValue({
      id: 'p1', name: 'Bob', profession: 'Plumber', bookingMode: 'INSTANT', email: 'bob@example.com',
    })
    ;(prisma.$executeRaw as unknown as jest.Mock).mockResolvedValue(1)

    const { encrypt } = jest.requireMock('@/lib/crypto') as { encrypt: jest.Mock }

    const req = new NextRequest('http://localhost/api/bookings', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, guestPhone: '555-1234', notes: 'please call ahead' }),
    })
    await POST(req)

    // encrypt should have been called for all four PII fields
    expect(encrypt).toHaveBeenCalledWith('Alice')
    expect(encrypt).toHaveBeenCalledWith('alice@example.com')
    expect(encrypt).toHaveBeenCalledWith('555-1234')
    expect(encrypt).toHaveBeenCalledWith('please call ahead')
  })

  it('returns 404 when provider not found', async () => {
    ;(prisma.provider.findUnique as jest.Mock).mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/bookings', {
      method: 'POST',
      body: JSON.stringify(validBody),
    })
    const res = await POST(req)
    expect(res.status).toBe(404)
  })

  it('returns 400 on invalid body', async () => {
    const req = new NextRequest('http://localhost/api/bookings', {
      method: 'POST',
      body: JSON.stringify({ providerId: 'p1' }), // missing required fields
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('response does not include PII fields', async () => {
    ;(prisma.provider.findUnique as jest.Mock).mockResolvedValue({
      id: 'p1', name: 'Bob', profession: 'Plumber', bookingMode: 'INSTANT', email: 'bob@example.com',
    })
    ;(prisma.$executeRaw as unknown as jest.Mock).mockResolvedValue(1)

    const req = new NextRequest('http://localhost/api/bookings', {
      method: 'POST',
      body: JSON.stringify(validBody),
    })
    const res = await POST(req)
    const data = await res.json()
    expect(data.guestName).toBeUndefined()
    expect(data.guestEmail).toBeUndefined()
    expect(data.guestPhone).toBeUndefined()
    expect(data.notes).toBeUndefined()
    expect(data.id).toBeDefined()
    expect(data.status).toBe('CONFIRMED')
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

  it('returns 403 when authenticated user is not the booking provider', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'different-provider', slug: 'other' } })
    ;(prisma.booking.findUnique as jest.Mock).mockResolvedValue({
      id: 'b1', providerId: 'p1', status: 'PENDING',
      guestEmail: 'alice@example.com', guestName: 'Alice',
      provider: { name: 'Bob', profession: 'Plumber' },
      date: new Date('2026-05-04'), startTime: '10:00', endTime: '11:00',
    })

    const req = new NextRequest('http://localhost/api/bookings/b1', {
      method: 'PATCH',
      body: JSON.stringify({ status: 'CONFIRMED' }),
    })
    const res = await PATCH(req, { params: { id: 'b1' } })
    expect(res.status).toBe(403)
  })
})
