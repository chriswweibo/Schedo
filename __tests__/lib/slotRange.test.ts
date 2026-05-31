/**
 * @jest-environment node
 */
import { getRange, isReachable } from '@/lib/slotRange'

const SLOTS = [
  { startTime: '09:00', endTime: '10:00', status: 'available' as const },
  { startTime: '10:00', endTime: '11:00', status: 'available' as const },
  { startTime: '11:00', endTime: '12:00', status: 'booked' as const },
  { startTime: '12:00', endTime: '13:00', status: 'available' as const },
  { startTime: '13:00', endTime: '14:00', status: 'available' as const },
]

describe('getRange', () => {
  it('returns slots between two available keys (forward order)', () => {
    const result = getRange(SLOTS, '09:00', '10:00')
    expect(result).not.toBeNull()
    expect(result!).toHaveLength(2)
    expect(result![0].startTime).toBe('09:00')
    expect(result![1].startTime).toBe('10:00')
  })

  it('returns slots between two available keys (reverse order)', () => {
    const result = getRange(SLOTS, '10:00', '09:00')
    expect(result).not.toBeNull()
    expect(result!).toHaveLength(2)
    expect(result![0].startTime).toBe('09:00')
  })

  it('returns a single-element array when fromKey === toKey', () => {
    const result = getRange(SLOTS, '09:00', '09:00')
    expect(result).not.toBeNull()
    expect(result!).toHaveLength(1)
    expect(result![0].startTime).toBe('09:00')
  })

  it('returns null when span crosses a non-available slot', () => {
    expect(getRange(SLOTS, '09:00', '12:00')).toBeNull()
  })

  it('returns null when fromKey is unknown', () => {
    expect(getRange(SLOTS, '99:00', '10:00')).toBeNull()
  })

  it('returns null when toKey is unknown', () => {
    expect(getRange(SLOTS, '09:00', '99:00')).toBeNull()
  })
})

describe('isReachable', () => {
  it('returns true for a clear contiguous span', () => {
    expect(isReachable(SLOTS, '09:00', '10:00')).toBe(true)
  })

  it('returns true when fromKey === toKey', () => {
    expect(isReachable(SLOTS, '09:00', '09:00')).toBe(true)
  })

  it('returns false when a booked slot is in the span', () => {
    expect(isReachable(SLOTS, '09:00', '12:00')).toBe(false)
  })

  it('returns false for unknown key', () => {
    expect(isReachable(SLOTS, '09:00', '99:00')).toBe(false)
  })
})
