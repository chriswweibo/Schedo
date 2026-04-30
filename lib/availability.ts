import { addMinutes, format, parse } from 'date-fns'

export type TimeSlot = { startTime: string; endTime: string }

function parseTime(timeStr: string, base: Date): Date {
  return parse(timeStr, 'HH:mm', base)
}

export function timesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string,
  base: Date
): boolean {
  const s1 = parseTime(start1, base)
  const e1 = parseTime(end1, base)
  const s2 = parseTime(start2, base)
  const e2 = parseTime(end2, base)
  return s1 < e2 && e1 > s2
}

export function getAvailableSlots(
  availabilities: Array<{ dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }>,
  bookings: Array<{ startTime: string; endTime: string; status: string }>,
  blockedSlots: Array<{ startTime: string; endTime: string }>,
  date: Date,
  slotMinutes = 60
): TimeSlot[] {
  const avail = availabilities.find(
    (a) => a.dayOfWeek === date.getDay() && a.isActive
  )
  if (!avail) return []

  const confirmed = bookings.filter((b) => b.status === 'CONFIRMED')
  const slots: TimeSlot[] = []
  let cursor = parseTime(avail.startTime, date)
  const end = parseTime(avail.endTime, date)

  while (addMinutes(cursor, slotMinutes) <= end) {
    const startStr = format(cursor, 'HH:mm')
    const endStr = format(addMinutes(cursor, slotMinutes), 'HH:mm')

    const booked = confirmed.some((b) =>
      timesOverlap(startStr, endStr, b.startTime, b.endTime, date)
    )
    const blocked = blockedSlots.some((b) =>
      timesOverlap(startStr, endStr, b.startTime, b.endTime, date)
    )

    if (!booked && !blocked) slots.push({ startTime: startStr, endTime: endStr })
    cursor = addMinutes(cursor, slotMinutes)
  }

  return slots
}
