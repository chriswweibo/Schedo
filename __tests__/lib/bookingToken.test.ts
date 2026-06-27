/**
 * @jest-environment node
 */
process.env.ENCRYPTION_KEY = 'test-secret-for-booking-tokens'

import { signBookingToken, verifyBookingToken, bookingManageUrl } from '@/lib/bookingToken'

describe('booking token', () => {
  it('round-trips a valid token back to the booking id', () => {
    const id = 'cko123abc456'
    const token = signBookingToken(id)
    expect(token).toContain(`${id}.`)
    expect(verifyBookingToken(token)).toBe(id)
  })

  it('rejects a tampered signature', () => {
    const token = signBookingToken('cko123abc456')
    const tampered = token.slice(0, -2) + (token.endsWith('aa') ? 'bb' : 'aa')
    expect(verifyBookingToken(tampered)).toBeNull()
  })

  it('rejects a forged id with someone else’s signature', () => {
    const token = signBookingToken('victim-id')
    const sig = token.slice(token.lastIndexOf('.') + 1)
    expect(verifyBookingToken(`attacker-id.${sig}`)).toBeNull()
  })

  it('rejects malformed tokens', () => {
    expect(verifyBookingToken('nodot')).toBeNull()
    expect(verifyBookingToken('.sig')).toBeNull()
    expect(verifyBookingToken('')).toBeNull()
  })

  it('builds a manage URL with the token', () => {
    process.env.NEXTAUTH_URL = 'https://schedo.me'
    const url = bookingManageUrl('abc')
    expect(url).toBe(`https://schedo.me/booking/manage/${signBookingToken('abc')}`)
  })
})
