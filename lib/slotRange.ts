import type { TimeSlot } from '@/lib/availability'

/**
 * Returns the contiguous subarray of slots from fromKey to toKey (inclusive),
 * ordered chronologically. Returns null if either key is not found, or if any
 * slot in the span has a status other than 'available'.
 */
export function getRange(
  slots: TimeSlot[],
  fromKey: string,
  toKey: string,
): TimeSlot[] | null {
  const fromIdx = slots.findIndex((s) => s.startTime === fromKey)
  const toIdx   = slots.findIndex((s) => s.startTime === toKey)
  if (fromIdx === -1 || toIdx === -1) return null

  const start = Math.min(fromIdx, toIdx)
  const end   = Math.max(fromIdx, toIdx)
  const span  = slots.slice(start, end + 1)

  if (span.some((s) => s.status !== 'available')) return null
  return span
}

/** Returns true if getRange would succeed for the given keys. */
export function isReachable(
  slots: TimeSlot[],
  anchorKey: string,
  targetKey: string,
): boolean {
  return getRange(slots, anchorKey, targetKey) !== null
}
