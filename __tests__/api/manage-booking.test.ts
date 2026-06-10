/**
 * @jest-environment node
 */
import { PATCH } from '@/app/api/bookings/manage/[token]/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    booking: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    blockedSlot: { findMany: jest.fn() },
  },
}))
jest.mock('@/lib/email', () => ({
  sendBookingCancelledByGuest: jest.fn().mockResolvedValue(undefined),
  sendBookingRescheduledByGuest: jest.fn().mockResolvedValue(undefined),
  sendBookingDetailsUpdatedByGuest: jest.fn().mockResolvedValue(undefined),
}))

import { prisma } from '@/lib/prisma'

const FUTURE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // +7 days
const futureDateStr = FUTURE.toISOString().slice(0, 10)

function bookingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'b1', providerId: 'p1', status: 'CONFIRMED',
    guestName: 'Alice', guestEmail: 'alice@example.com', guestPhone: null, notes: null,
    date: FUTURE, startTime: '10:00', endTime: '11:00', manageToken: 'tok123',
    provider: { name: 'Bob', email: 'bob@example.com', profession: 'Plumber', bookingMode: 'INSTANT' },
    ...overrides,
  }
}

function patch(token: string, body: unknown) {
  const req = new NextRequest(`http://localhost/api/bookings/manage/${token}`, {
    method: 'PATCH', body: JSON.stringify(body),
  })
  return PATCH(req, { params: { token } })
}

describe('PATCH /api/bookings/manage/[token]', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 404 for an unknown token', async () => {
    ;(prisma.booking.findUnique as jest.Mock).mockResolvedValue(null)
    const res = await patch('nope', { action: 'cancel' })
    expect(res.status).toBe(404)
  })

  it('cancels a booking', async () => {
    ;(prisma.booking.findUnique as jest.Mock).mockResolvedValue(bookingRow())
    ;(prisma.booking.update as jest.Mock).mockResolvedValue({ id: 'b1', status: 'CANCELLED' })
    const res = await patch('tok123', { action: 'cancel' })
    expect(res.status).toBe(200)
    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'CANCELLED' }) })
    )
  })

  it('reschedules and keeps CONFIRMED for an INSTANT provider', async () => {
    ;(prisma.booking.findUnique as jest.Mock).mockResolvedValue(bookingRow())
    ;(prisma.booking.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.blockedSlot.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.booking.update as jest.Mock).mockResolvedValue({ id: 'b1', status: 'CONFIRMED' })
    const res = await patch('tok123', {
      action: 'reschedule', date: futureDateStr, startTime: '14:00', endTime: '15:00',
    })
    expect(res.status).toBe(200)
    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'CONFIRMED', startTime: '14:00' }) })
    )
  })

  it('reschedules to PENDING for a REQUEST provider', async () => {
    ;(prisma.booking.findUnique as jest.Mock).mockResolvedValue(
      bookingRow({ provider: { name: 'Bob', email: 'bob@example.com', profession: 'Plumber', bookingMode: 'REQUEST' } })
    )
    ;(prisma.booking.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.blockedSlot.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.booking.update as jest.Mock).mockResolvedValue({ id: 'b1', status: 'PENDING' })
    const res = await patch('tok123', {
      action: 'reschedule', date: futureDateStr, startTime: '14:00', endTime: '15:00',
    })
    expect(res.status).toBe(200)
    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'PENDING' }) })
    )
  })

  it('returns 409 when the reschedule slot overlaps an existing booking', async () => {
    ;(prisma.booking.findUnique as jest.Mock).mockResolvedValue(bookingRow())
    ;(prisma.booking.findMany as jest.Mock).mockResolvedValue([{ startTime: '14:00', endTime: '15:00' }])
    ;(prisma.blockedSlot.findMany as jest.Mock).mockResolvedValue([])
    const res = await patch('tok123', {
      action: 'reschedule', date: futureDateStr, startTime: '14:00', endTime: '15:00',
    })
    expect(res.status).toBe(409)
  })

  it('edits guest details without changing status', async () => {
    ;(prisma.booking.findUnique as jest.Mock).mockResolvedValue(bookingRow())
    ;(prisma.booking.update as jest.Mock).mockResolvedValue({ id: 'b1', status: 'CONFIRMED' })
    const res = await patch('tok123', { action: 'edit', guestName: 'Alicia', notes: 'gate code 1234' })
    expect(res.status).toBe(200)
    const arg = (prisma.booking.update as jest.Mock).mock.calls[0][0]
    expect(arg.data.guestName).toBe('Alicia')
    expect(arg.data.status).toBeUndefined()
  })

  it('returns 409 when the appointment start has passed', async () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000)
    ;(prisma.booking.findUnique as jest.Mock).mockResolvedValue(bookingRow({ date: past }))
    const res = await patch('tok123', { action: 'cancel' })
    expect(res.status).toBe(409)
    expect(prisma.booking.update).not.toHaveBeenCalled()
  })

  it('returns 409 for an already-cancelled booking', async () => {
    ;(prisma.booking.findUnique as jest.Mock).mockResolvedValue(bookingRow({ status: 'CANCELLED' }))
    const res = await patch('tok123', { action: 'cancel' })
    expect(res.status).toBe(409)
  })

  it('reschedule keeps a CONFIRMED booking CONFIRMED for a BOTH provider', async () => {
    ;(prisma.booking.findUnique as jest.Mock).mockResolvedValue(
      bookingRow({ status: 'CONFIRMED', provider: { name: 'Bob', email: 'bob@example.com', profession: 'Plumber', bookingMode: 'BOTH' } })
    )
    ;(prisma.booking.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.blockedSlot.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.booking.update as jest.Mock).mockResolvedValue({ id: 'b1', status: 'CONFIRMED' })
    const res = await patch('tok123', {
      action: 'reschedule', date: futureDateStr, startTime: '14:00', endTime: '15:00',
    })
    expect(res.status).toBe(200)
    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'CONFIRMED' }) })
    )
  })

  it('reschedule keeps a PENDING booking PENDING for a BOTH provider', async () => {
    ;(prisma.booking.findUnique as jest.Mock).mockResolvedValue(
      bookingRow({ status: 'PENDING', provider: { name: 'Bob', email: 'bob@example.com', profession: 'Plumber', bookingMode: 'BOTH' } })
    )
    ;(prisma.booking.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.blockedSlot.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.booking.update as jest.Mock).mockResolvedValue({ id: 'b1', status: 'PENDING' })
    const res = await patch('tok123', {
      action: 'reschedule', date: futureDateStr, startTime: '14:00', endTime: '15:00',
    })
    expect(res.status).toBe(200)
    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'PENDING' }) })
    )
  })
})
