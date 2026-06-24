/**
 * @jest-environment node
 */
process.env.ENCRYPTION_KEY = Buffer.alloc(32, 2).toString('base64')
import { sealBookingData, openBookingResult, BOOKING_PII_FIELDS } from '@/lib/bookingCrypto'

describe('bookingCrypto', () => {
  it('encrypts only the PII fields in place, leaving others untouched', () => {
    const data: Record<string, unknown> = {
      guestName: 'Alice', guestEmail: 'a@x.com', guestPhone: '123', notes: 'hi',
      providerId: 'p1', startTime: '10:00',
    }
    sealBookingData(data)
    for (const f of BOOKING_PII_FIELDS) {
      expect(typeof data[f]).toBe('string')
      expect((data[f] as string).startsWith('v1:')).toBe(true)
    }
    expect(data.providerId).toBe('p1')
    expect(data.startTime).toBe('10:00')
  })

  it('skips missing and non-string PII fields', () => {
    const data: Record<string, unknown> = { guestName: 'Bob', guestPhone: null }
    sealBookingData(data)
    expect((data.guestName as string).startsWith('v1:')).toBe(true)
    expect(data.guestPhone).toBeNull()
    expect('guestEmail' in data).toBe(false)
  })

  it('seals each element of an array (createMany)', () => {
    const arr: Record<string, unknown>[] = [{ guestName: 'A' }, { guestName: 'B' }]
    sealBookingData(arr)
    expect((arr[0].guestName as string).startsWith('v1:')).toBe(true)
    expect((arr[1].guestName as string).startsWith('v1:')).toBe(true)
  })

  it('round-trips: openBookingResult decrypts a single sealed row', () => {
    const row: Record<string, unknown> = { guestEmail: 'a@x.com', notes: 'n', id: 'b1' }
    sealBookingData(row)
    const opened = openBookingResult(row)
    expect(opened.guestEmail).toBe('a@x.com')
    expect(opened.notes).toBe('n')
    expect(opened.id).toBe('b1')
  })

  it('openBookingResult decrypts each row of an array', () => {
    const rows: Record<string, unknown>[] = [{ guestName: 'A' }, { guestName: 'B' }]
    sealBookingData(rows)
    const opened = openBookingResult(rows)
    expect(opened[0].guestName).toBe('A')
    expect(opened[1].guestName).toBe('B')
  })

  it('openBookingResult passes through null', () => {
    expect(openBookingResult(null)).toBeNull()
  })

  it('leaves a legacy plaintext row readable (decrypt passthrough)', () => {
    const row = { guestName: 'legacy-plain' }
    expect(openBookingResult(row).guestName).toBe('legacy-plain')
  })
})
