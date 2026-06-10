/**
 * @jest-environment node
 */
import { ManageBookingSchema } from '@/lib/validations'

describe('ManageBookingSchema', () => {
  it('accepts a cancel action', () => {
    expect(ManageBookingSchema.safeParse({ action: 'cancel' }).success).toBe(true)
  })

  it('accepts a reschedule action with valid date/time', () => {
    const r = ManageBookingSchema.safeParse({
      action: 'reschedule', date: '2026-07-01', startTime: '10:00', endTime: '11:00',
    })
    expect(r.success).toBe(true)
  })

  it('rejects a reschedule action missing the time fields', () => {
    expect(ManageBookingSchema.safeParse({ action: 'reschedule', date: '2026-07-01' }).success).toBe(false)
  })

  it('accepts an edit action with optional fields', () => {
    expect(ManageBookingSchema.safeParse({ action: 'edit', guestName: 'New Name' }).success).toBe(true)
  })

  it('rejects an unknown action', () => {
    expect(ManageBookingSchema.safeParse({ action: 'delete' }).success).toBe(false)
  })
})
