import { createHmac, timingSafeEqual } from 'crypto'

// Capability token for guest self-service booking management. The token is an
// HMAC of the booking id with the server secret, so it can't be guessed or
// forged and needs no DB column. Deterministic per booking (a capability URL).
function sign(id: string): string {
  // ENCRYPTION_KEY is a required, env-consistent secret (NEXTAUTH_SECRET differs
  // per environment); used here purely as an HMAC key for the capability token.
  const secret = process.env.ENCRYPTION_KEY ?? process.env.NEXTAUTH_SECRET ?? ''
  return createHmac('sha256', secret).update(id).digest('base64url')
}

export function signBookingToken(id: string): string {
  return `${id}.${sign(id)}`
}

export function verifyBookingToken(token: string): string | null {
  const dot = token.lastIndexOf('.')
  if (dot <= 0) return null
  const id = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expected = sign(id)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return null
  try {
    if (!timingSafeEqual(a, b)) return null
  } catch {
    return null
  }
  return id
}

export function bookingManageUrl(id: string): string {
  const base = process.env.NEXTAUTH_URL ?? 'https://schedo.me'
  return `${base}/booking/manage/${signBookingToken(id)}`
}
