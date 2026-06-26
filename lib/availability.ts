export type SlotStatus = 'available' | 'booked' | 'pending' | 'blocked' | 'outside'
export type TimeSlot = { startTime: string; endTime: string; status: SlotStatus }

const DAY_START = 6   // 06:00
const DAY_END   = 22  // 22:00

function pad(n: number) { return String(n).padStart(2, '0') }

export function timesOverlap(s1: string, e1: string, s2: string, e2: string): boolean {
  return s1 < e2 && e1 > s2
}
const overlaps = timesOverlap

export function getAllSlots(
  availabilities: Array<{ dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }>,
  bookings: Array<{ startTime: string; endTime: string; status: string }>,
  blockedSlots: Array<{ startTime: string; endTime: string }>,
  date: Date,
): TimeSlot[] {
  const avail = availabilities.find((a) => a.dayOfWeek === date.getDay() && a.isActive)
  const confirmed = bookings.filter((b) => b.status === 'CONFIRMED')
  const pending = bookings.filter((b) => b.status === 'PENDING')

  const slots: TimeSlot[] = []

  for (let h = DAY_START; h < DAY_END; h++) {
    const startTime = `${pad(h)}:00`
    const endTime   = `${pad(h + 1)}:00`

    // Outside provider's working hours
    if (!avail || startTime < avail.startTime || endTime > avail.endTime) {
      slots.push({ startTime, endTime, status: 'outside' })
      continue
    }

    if (confirmed.some((b) => overlaps(startTime, endTime, b.startTime, b.endTime))) {
      slots.push({ startTime, endTime, status: 'booked' })
      continue
    }

    // A pending application holds the slot — not bookable by others until resolved.
    if (pending.some((b) => overlaps(startTime, endTime, b.startTime, b.endTime))) {
      slots.push({ startTime, endTime, status: 'pending' })
      continue
    }

    if (blockedSlots.some((b) => overlaps(startTime, endTime, b.startTime, b.endTime))) {
      slots.push({ startTime, endTime, status: 'blocked' })
      continue
    }

    slots.push({ startTime, endTime, status: 'available' })
  }

  return slots
}

export function getAvailableSlots(
  availabilities: Array<{ dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }>,
  bookings: Array<{ startTime: string; endTime: string; status: string }>,
  blockedSlots: Array<{ startTime: string; endTime: string }>,
  date: Date,
): Array<{ startTime: string; endTime: string }> {
  return getAllSlots(availabilities, bookings, blockedSlots, date)
    .filter((s) => s.status === 'available')
    .map(({ startTime, endTime }) => ({ startTime, endTime }))
}
