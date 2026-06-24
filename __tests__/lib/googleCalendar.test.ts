/**
 * @jest-environment node
 */
process.env.ENCRYPTION_KEY = Buffer.alloc(32, 3).toString('base64')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    provider: { findUnique: jest.fn(), update: jest.fn() },
    blockedSlot: { deleteMany: jest.fn().mockReturnValue('DEL'), createMany: jest.fn().mockReturnValue('CRE') },
    $transaction: jest.fn().mockResolvedValue([{ count: 2 }, { count: 1 }]),
  },
}))
import { isExpired, busyToBlocks } from '@/lib/googleCalendar'

describe('isExpired', () => {
  const now = new Date('2026-06-11T12:00:00Z')
  it('is true when expiry is null', () => {
    expect(isExpired(null, now)).toBe(true)
  })
  it('is true when expiry is in the past', () => {
    expect(isExpired(new Date('2026-06-11T11:00:00Z'), now)).toBe(true)
  })
  it('is false when expiry is comfortably in the future', () => {
    expect(isExpired(new Date('2026-06-11T13:00:00Z'), now)).toBe(false)
  })
  it('is true within the skew buffer of expiry', () => {
    expect(isExpired(new Date('2026-06-11T12:00:30Z'), now)).toBe(true) // <60s away
  })
})

describe('busyToBlocks', () => {
  const winStart = new Date('2026-06-01T00:00:00Z')
  const winEnd = new Date('2026-08-01T00:00:00Z')

  it('maps a single same-day interval to one block', () => {
    const blocks = busyToBlocks(
      [{ start: new Date('2026-06-10T09:00:00Z'), end: new Date('2026-06-10T10:30:00Z') }],
      winStart, winEnd,
    )
    expect(blocks).toEqual([{ date: '2026-06-10', startTime: '09:00', endTime: '10:30' }])
  })

  it('splits a multi-day interval per calendar date', () => {
    const blocks = busyToBlocks(
      [{ start: new Date('2026-06-10T22:00:00Z'), end: new Date('2026-06-12T06:00:00Z') }],
      winStart, winEnd,
    )
    expect(blocks).toEqual([
      { date: '2026-06-10', startTime: '22:00', endTime: '24:00' },
      { date: '2026-06-11', startTime: '00:00', endTime: '24:00' },
      { date: '2026-06-12', startTime: '00:00', endTime: '06:00' },
    ])
  })

  it('clamps intervals to the window and drops out-of-window pieces', () => {
    const blocks = busyToBlocks(
      [{ start: new Date('2026-05-30T09:00:00Z'), end: new Date('2026-06-01T02:00:00Z') }],
      winStart, winEnd,
    )
    expect(blocks).toEqual([{ date: '2026-06-01', startTime: '00:00', endTime: '02:00' }])
  })

  it('drops zero-length intervals', () => {
    const blocks = busyToBlocks(
      [{ start: new Date('2026-06-10T09:00:00Z'), end: new Date('2026-06-10T09:00:00Z') }],
      winStart, winEnd,
    )
    expect(blocks).toEqual([])
  })
})

import { refreshAccessToken, fetchBusy, syncProviderCalendar } from '@/lib/googleCalendar'
import { prisma } from '@/lib/prisma'

describe('refreshAccessToken', () => {
  const realFetch = global.fetch
  afterEach(() => { global.fetch = realFetch })

  it('exchanges a refresh token for a new access token + expiry', async () => {
    process.env.GOOGLE_CLIENT_ID = 'cid'
    process.env.GOOGLE_CLIENT_SECRET = 'secret'
    global.fetch = jest.fn().mockResolvedValue({
      ok: true, json: async () => ({ access_token: 'new-at', expires_in: 3600 }),
    }) as unknown as typeof fetch
    const before = Date.now()
    const out = await refreshAccessToken('rt-1')
    expect(out.accessToken).toBe('new-at')
    expect(out.expiresAt.getTime()).toBeGreaterThan(before)
  })

  it('throws on non-200', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 400, text: async () => 'bad' }) as unknown as typeof fetch
    await expect(refreshAccessToken('rt-1')).rejects.toThrow()
  })
})

describe('fetchBusy', () => {
  const realFetch = global.fetch
  afterEach(() => { global.fetch = realFetch })

  it('returns parsed busy intervals from the freebusy API', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        calendars: { primary: { busy: [{ start: '2026-06-10T09:00:00Z', end: '2026-06-10T10:00:00Z' }] } },
      }),
    }) as unknown as typeof fetch
    const out = await fetchBusy('at', new Date('2026-06-01T00:00:00Z'), new Date('2026-08-01T00:00:00Z'))
    expect(out).toEqual([{ start: new Date('2026-06-10T09:00:00Z'), end: new Date('2026-06-10T10:00:00Z') }])
  })

  it('returns [] when there is no busy data', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ calendars: {} }) }) as unknown as typeof fetch
    expect(await fetchBusy('at', new Date(), new Date())).toEqual([])
  })
})

describe('syncProviderCalendar', () => {
  beforeEach(() => jest.clearAllMocks())

  it('refreshes when expired, replaces google-calendar blocks, sets syncedAt', async () => {
    ;(prisma.provider.findUnique as jest.Mock).mockResolvedValue({
      googleRefreshToken: 'enc-rt', googleAccessToken: null, googleTokenExpiry: null,
    })
    ;(prisma.provider.update as jest.Mock).mockResolvedValue({})
    const future = new Date(Date.now() + 2 * 86400000)
    const deps = {
      refreshAccessToken: jest.fn().mockResolvedValue({ accessToken: 'fresh', expiresAt: new Date(Date.now() + 3600_000) }),
      fetchBusy: jest.fn().mockResolvedValue([
        { start: new Date(future.getTime() + 9 * 3600000), end: new Date(future.getTime() + 10 * 3600000) },
      ]),
    }
    const res = await syncProviderCalendar('p1', deps as never)
    expect(deps.refreshAccessToken).toHaveBeenCalled()
    expect(prisma.blockedSlot.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ providerId: 'p1', reason: 'google-calendar' }) }),
    )
    expect(prisma.blockedSlot.createMany).toHaveBeenCalled()
    expect(prisma.provider.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ googleSyncedAt: expect.any(Date) }) }),
    )
    expect(res.blockCount).toBeGreaterThanOrEqual(1)
  })

  it('throws "not connected" when the provider has no refresh token', async () => {
    ;(prisma.provider.findUnique as jest.Mock).mockResolvedValue({
      googleRefreshToken: null, googleAccessToken: null, googleTokenExpiry: null,
    })
    await expect(syncProviderCalendar('p1')).rejects.toThrow(/not connected/i)
  })
})
