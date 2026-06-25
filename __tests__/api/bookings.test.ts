/**
 * @jest-environment node
 */
import { POST } from '@/app/api/bookings/route'
import { PATCH } from '@/app/api/bookings/[id]/route'
import { NextRequest } from 'next/server'

// tx stub — shared references so tests can control return values
const txBookingFindMany = jest.fn()
const txBlockedSlotFindMany = jest.fn()
const txBookingCreate = jest.fn()

jest.mock('@/lib/prisma', () => ({
  prisma: {
    provider: { findUnique: jest.fn() },
    booking: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    blockedSlot: { findMany: jest.fn() },
    // $transaction executes the callback with a tx stub
    $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        booking: {
          findMany: txBookingFindMany,
          create: txBookingCreate,
        },
        blockedSlot: { findMany: txBlockedSlotFindMany },
      })
    ),
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
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset $transaction to default passthrough after clearAllMocks wipes it
    ;(prisma.$transaction as jest.Mock).mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          booking: { findMany: txBookingFindMany, create: txBookingCreate },
          blockedSlot: { findMany: txBlockedSlotFindMany },
        })
    )
  })

  it('creates CONFIRMED booking for INSTANT mode (non-overlapping)', async () => {
    ;(prisma.provider.findUnique as jest.Mock).mockResolvedValue({
      id: 'p1', name: 'Bob', profession: 'Plumber', bookingMode: 'INSTANT', email: 'bob@example.com',
    })
    txBookingFindMany.mockResolvedValue([])
    txBlockedSlotFindMany.mockResolvedValue([])
    txBookingCreate.mockResolvedValue({ id: 'b1', status: 'CONFIRMED' })

    const req = new NextRequest('http://localhost/api/bookings', {
      method: 'POST',
      body: JSON.stringify(validBody),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.status).toBe('CONFIRMED')
    expect(txBookingCreate).toHaveBeenCalledTimes(1)
  })

  it('creates PENDING booking for REQUEST mode', async () => {
    ;(prisma.provider.findUnique as jest.Mock).mockResolvedValue({
      id: 'p1', name: 'Bob', profession: 'Plumber', bookingMode: 'REQUEST', email: 'bob@example.com',
    })
    txBookingFindMany.mockResolvedValue([])
    txBlockedSlotFindMany.mockResolvedValue([])
    txBookingCreate.mockResolvedValue({ id: 'b1', status: 'PENDING' })

    const req = new NextRequest('http://localhost/api/bookings', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, bookingType: 'REQUEST' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.status).toBe('PENDING')
    expect(txBookingCreate).toHaveBeenCalledTimes(1)
  })

  it('returns 409 and does NOT call create on time overlap (CONFIRMED booking)', async () => {
    ;(prisma.provider.findUnique as jest.Mock).mockResolvedValue({
      id: 'p1', name: 'Bob', profession: 'Plumber', bookingMode: 'INSTANT', email: 'bob@example.com',
    })
    txBookingFindMany.mockResolvedValue([
      { startTime: '10:00', endTime: '11:00', status: 'CONFIRMED' },
    ])
    txBlockedSlotFindMany.mockResolvedValue([])

    const req = new NextRequest('http://localhost/api/bookings', {
      method: 'POST',
      body: JSON.stringify(validBody),
    })
    const res = await POST(req)
    expect(res.status).toBe(409)
    expect(txBookingCreate).not.toHaveBeenCalled()
  })

  it('returns 409 on serialization failure (P2034)', async () => {
    ;(prisma.provider.findUnique as jest.Mock).mockResolvedValue({
      id: 'p1', name: 'Bob', profession: 'Plumber', bookingMode: 'INSTANT', email: 'bob@example.com',
    })
    const serializationErr = Object.assign(new Error('Transaction serialization failure'), { code: 'P2034' })
    ;(prisma.$transaction as jest.Mock).mockRejectedValue(serializationErr)

    const req = new NextRequest('http://localhost/api/bookings', {
      method: 'POST',
      body: JSON.stringify(validBody),
    })
    const res = await POST(req)
    expect(res.status).toBe(409)
    const data = await res.json()
    expect(data.error).toBe('This time slot is no longer available')
  })

  it('creates CONFIRMED booking when BOTH mode + bookingType INSTANT', async () => {
    ;(prisma.provider.findUnique as jest.Mock).mockResolvedValue({
      id: 'p1', name: 'Bob', profession: 'Plumber', bookingMode: 'BOTH', email: 'bob@example.com',
    })
    txBookingFindMany.mockResolvedValue([])
    txBlockedSlotFindMany.mockResolvedValue([])
    txBookingCreate.mockResolvedValue({ id: 'b1', status: 'CONFIRMED' })

    const req = new NextRequest('http://localhost/api/bookings', {
      method: 'POST',
      body: JSON.stringify({ ...validBody, bookingType: 'INSTANT' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
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
