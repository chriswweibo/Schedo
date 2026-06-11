import { prisma } from './prisma'
import { decrypt, encrypt } from './crypto'

const SKEW_MS = 60_000
const DAY_MS = 24 * 60 * 60 * 1000

export interface BusyInterval { start: Date; end: Date }
export interface BlockDescriptor { date: string; startTime: string; endTime: string }

export function isExpired(expiry: Date | null, now: Date = new Date()): boolean {
  if (!expiry) return true
  return expiry.getTime() - now.getTime() <= SKEW_MS
}

function hhmm(ms: number, dayStartMs: number): string {
  const mins = Math.round((ms - dayStartMs) / 60000)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * Map Google busy intervals to per-day block descriptors. Times are UTC wall-clock
 * (consistent with how the rest of the app treats stored times). Multi-day intervals
 * are split per calendar date; each piece is clamped to the window. A piece ending at
 * the day boundary is rendered as "24:00".
 */
export function busyToBlocks(
  busy: BusyInterval[],
  windowStart: Date,
  windowEnd: Date,
): BlockDescriptor[] {
  const blocks: BlockDescriptor[] = []
  for (const b of busy) {
    const startMs = Math.max(b.start.getTime(), windowStart.getTime())
    const endMs = Math.min(b.end.getTime(), windowEnd.getTime())
    if (endMs <= startMs) continue

    let dayStartMs = Date.UTC(
      new Date(startMs).getUTCFullYear(),
      new Date(startMs).getUTCMonth(),
      new Date(startMs).getUTCDate(),
    )
    while (dayStartMs < endMs) {
      const nextDayMs = dayStartMs + DAY_MS
      const pieceStart = Math.max(startMs, dayStartMs)
      const pieceEnd = Math.min(endMs, nextDayMs)
      if (pieceEnd > pieceStart) {
        const date = new Date(dayStartMs).toISOString().slice(0, 10)
        const startTime = hhmm(pieceStart, dayStartMs)
        const endTime = pieceEnd === nextDayMs ? '24:00' : hhmm(pieceEnd, dayStartMs)
        blocks.push({ date, startTime, endTime })
      }
      dayStartMs = nextDayMs
    }
  }
  return blocks
}

const WINDOW_DAYS = 60
const GOOGLE_BLOCK_REASON = 'google-calendar'

export async function refreshAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string; expiresAt: Date }> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })
  if (!res.ok) {
    throw new Error(`Google token refresh failed: ${res.status} ${await res.text()}`)
  }
  const json = (await res.json()) as { access_token: string; expires_in: number }
  return {
    accessToken: json.access_token,
    expiresAt: new Date(Date.now() + json.expires_in * 1000),
  }
}

export async function fetchBusy(
  accessToken: string,
  timeMin: Date,
  timeMax: Date,
): Promise<BusyInterval[]> {
  const res = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      items: [{ id: 'primary' }],
    }),
  })
  if (!res.ok) {
    throw new Error(`Google freebusy failed: ${res.status} ${await res.text()}`)
  }
  const json = (await res.json()) as {
    calendars?: { primary?: { busy?: { start: string; end: string }[] } }
  }
  const busy = json.calendars?.primary?.busy ?? []
  return busy.map((b) => ({ start: new Date(b.start), end: new Date(b.end) }))
}

interface SyncDeps {
  refreshAccessToken: typeof refreshAccessToken
  fetchBusy: typeof fetchBusy
}

/**
 * Pull the provider's Google primary-calendar busy times for the next WINDOW_DAYS
 * and replace their `google-calendar` BlockedSlots with the result. Refreshes the
 * access token when expired. Throws if the provider is not Google-connected.
 */
export async function syncProviderCalendar(
  providerId: string,
  deps: SyncDeps = { refreshAccessToken, fetchBusy },
): Promise<{ syncedAt: Date; blockCount: number }> {
  const provider = await prisma.provider.findUnique({
    where: { id: providerId },
    select: { googleAccessToken: true, googleRefreshToken: true, googleTokenExpiry: true },
  })
  if (!provider || !provider.googleRefreshToken) {
    throw new Error('Google Calendar not connected')
  }

  let accessToken = provider.googleAccessToken ? decrypt(provider.googleAccessToken) : null
  if (!accessToken || isExpired(provider.googleTokenExpiry)) {
    const refreshToken = decrypt(provider.googleRefreshToken)!
    const refreshed = await deps.refreshAccessToken(refreshToken)
    accessToken = refreshed.accessToken
    await prisma.provider.update({
      where: { id: providerId },
      data: {
        googleAccessToken: encrypt(refreshed.accessToken),
        googleTokenExpiry: refreshed.expiresAt,
      },
    })
  }

  const windowStart = new Date()
  const windowEnd = new Date(Date.now() + WINDOW_DAYS * 24 * 60 * 60 * 1000)
  const busy = await deps.fetchBusy(accessToken!, windowStart, windowEnd)
  const blocks = busyToBlocks(busy, windowStart, windowEnd)

  await prisma.$transaction([
    prisma.blockedSlot.deleteMany({
      where: { providerId, reason: GOOGLE_BLOCK_REASON, date: { gte: windowStart, lte: windowEnd } },
    }),
    prisma.blockedSlot.createMany({
      data: blocks.map((b) => ({
        providerId,
        date: new Date(`${b.date}T00:00:00.000Z`),
        startTime: b.startTime,
        endTime: b.endTime,
        reason: GOOGLE_BLOCK_REASON,
      })),
    }),
  ])

  const syncedAt = new Date()
  await prisma.provider.update({ where: { id: providerId }, data: { googleSyncedAt: syncedAt } })
  return { syncedAt, blockCount: blocks.length }
}
