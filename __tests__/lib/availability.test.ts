/**
 * @jest-environment node
 */
import { getAvailableSlots } from '@/lib/availability'

const MON = { dayOfWeek: 1, startTime: '09:00', endTime: '17:00', isActive: true }
const baseDate = new Date('2026-05-04') // Monday

describe('getAvailableSlots', () => {
  it('returns 8 slots when no bookings or blocks', () => {
    const slots = getAvailableSlots([MON], [], [], baseDate)
    expect(slots).toHaveLength(8)
    expect(slots[0]).toEqual({ startTime: '09:00', endTime: '10:00' })
    expect(slots[7]).toEqual({ startTime: '16:00', endTime: '17:00' })
  })

  it('excludes a CONFIRMED booking time', () => {
    const bookings = [{ startTime: '11:00', endTime: '12:00', status: 'CONFIRMED' }]
    const slots = getAvailableSlots([MON], bookings, [], baseDate)
    expect(slots).toHaveLength(7)
    expect(slots.find(s => s.startTime === '11:00')).toBeUndefined()
  })

  it('does NOT exclude a PENDING booking', () => {
    const bookings = [{ startTime: '11:00', endTime: '12:00', status: 'PENDING' }]
    const slots = getAvailableSlots([MON], bookings, [], baseDate)
    expect(slots).toHaveLength(8)
  })

  it('excludes a blocked slot', () => {
    const blocked = [{ startTime: '14:00', endTime: '15:00' }]
    const slots = getAvailableSlots([MON], [], blocked, baseDate)
    expect(slots).toHaveLength(7)
    expect(slots.find(s => s.startTime === '14:00')).toBeUndefined()
  })

  it('returns empty array for a day with no availability', () => {
    const slots = getAvailableSlots([MON], [], [], new Date('2026-05-05')) // Tuesday
    expect(slots).toHaveLength(0)
  })
})
