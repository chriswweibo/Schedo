import { encrypt, decrypt } from './crypto'

export const BOOKING_PII_FIELDS = ['guestName', 'guestEmail', 'guestPhone', 'notes'] as const

/**
 * Encrypt the booking PII fields in place on a write payload.
 * Accepts a single data object or an array (createMany). No-op for non-objects.
 */
export function sealBookingData(data: unknown): void {
  if (Array.isArray(data)) {
    for (const item of data) sealBookingData(item)
    return
  }
  if (!data || typeof data !== 'object') return
  const rec = data as Record<string, unknown>
  for (const f of BOOKING_PII_FIELDS) {
    if (typeof rec[f] === 'string') rec[f] = encrypt(rec[f] as string)
  }
}

/**
 * Decrypt the booking PII fields on a query result (single row, array of rows,
 * or null). Returns the same value for non-objects. Mutates row objects in place
 * and returns the result for convenience.
 */
export function openBookingResult<T>(result: T): T {
  if (Array.isArray(result)) {
    return result.map((r) => openBookingResult(r)) as unknown as T
  }
  if (result && typeof result === 'object') {
    const rec = result as Record<string, unknown>
    for (const f of BOOKING_PII_FIELDS) {
      if (typeof rec[f] === 'string') rec[f] = decrypt(rec[f] as string)
    }
  }
  return result
}
