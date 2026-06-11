/**
 * @jest-environment node
 */
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
