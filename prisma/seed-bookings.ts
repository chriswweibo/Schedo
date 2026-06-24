/**
 * Seed bookings and blocked slots for existing providers.
 * Run with: npx tsx prisma/seed-bookings.ts
 *
 * Clears any existing bookings / blocked slots first, then generates:
 *   - Confirmed bookings  (~30% of working slots over 60 days)
 *   - Pending requests    (~10% of working slots)
 *   - Blocked slots       (~1 per provider per week, half-day)
 *
 * Several dates per provider end up fully booked so the gray calendar
 * indicator is visible.
 */

import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { addDays, startOfDay, format, eachDayOfInterval, parseISO } from 'date-fns'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

const GUEST_NAMES = [
  'Alice Thompson', 'Bob Nguyen', 'Carol Smith', 'David Park',
  'Eve Okafor', 'Frank Martinez', 'Grace Lee', 'Henry Wilson',
  'Iris Chen', 'Jack Davis', 'Karen Brown', 'Leo Patel',
  'Mia Johnson', 'Nathan Kim', 'Olivia Walsh', 'Peter Zhang',
]
const GUEST_NOTES = [
  'Please call 30 mins before arrival.',
  'Access via side gate — code is 1234.',
  'Parking available in driveway.',
  'Dog on premises — friendly but noisy.',
  null, null, null,
]
const BLOCK_REASONS = [
  'Personal appointment', 'Training day', 'Holiday', 'Equipment maintenance', null,
]

function pad(n: number) { return String(n).padStart(2, '0') }

async function main() {
  const today = startOfDay(new Date())
  const windowEnd = addDays(today, 60)

  console.log('Clearing existing bookings and blocked slots…')
  await prisma.booking.deleteMany({})
  await prisma.blockedSlot.deleteMany({})

  const providers = await prisma.provider.findMany({
    include: { availability: { where: { isActive: true } } },
  })
  console.log(`Building data for ${providers.length} providers…`)

  const bookingRows: {
    providerId: string; date: Date; startTime: string; endTime: string
    status: string; guestName: string; guestEmail: string; notes?: string | null
  }[] = []

  const blockRows: {
    providerId: string; date: Date; startTime: string; endTime: string; reason?: string | null
  }[] = []

  for (const [pi, provider] of providers.entries()) {
    const avail = provider.availability
    const workingDays = eachDayOfInterval({ start: today, end: windowEnd }).filter(
      (d) => avail.some((a) => a.dayOfWeek === d.getDay())
    )

    // Bookings
    for (const [di, day] of workingDays.entries()) {
      const seed = pi * 1000 + di
      if (seededRandom(seed) > 0.4) continue

      const a = avail.find((av) => av.dayOfWeek === day.getDay())!
      const startH = parseInt(a.startTime)
      const endH   = parseInt(a.endTime)
      const span   = endH - startH
      if (span < 2) continue

      const fillRatio   = seededRandom(seed + 1)
      const slotsToFill = fillRatio > 0.7 ? span : Math.max(1, Math.floor(span * 0.4))
      const dateISO = format(day, 'yyyy-MM-dd')

      for (let s = 0; s < slotsToFill; s++) {
        const slotStartH = startH + s
        if (slotStartH >= endH) break

        const status = seededRandom(seed + s + 200) < 0.8 ? 'CONFIRMED' : 'PENDING'
        const guestIdx  = Math.floor(seededRandom(seed + s + 300) * GUEST_NAMES.length)
        const guestName = GUEST_NAMES[guestIdx]
        const guestEmail = guestName.toLowerCase().replace(/\s+/g, '.') + '@example.com'
        const noteIdx   = Math.floor(seededRandom(seed + s + 400) * GUEST_NOTES.length)
        const notes     = GUEST_NOTES[noteIdx]

        bookingRows.push({
          providerId: provider.id,
          date: parseISO(dateISO),
          startTime: `${pad(slotStartH)}:00`,
          endTime:   `${pad(slotStartH + 1)}:00`,
          status,
          guestName,
          guestEmail,
          notes,
        })
      }
    }

    // Blocked slots (~1 per week)
    for (let week = 0; week < 9; week++) {
      const seed = pi * 500 + week + 9000
      if (seededRandom(seed) > 0.6) continue

      const offset = Math.floor(seededRandom(seed + 1) * 7)
      const day    = addDays(today, week * 7 + offset)
      if (day > windowEnd) continue

      const a = avail.find((av) => av.dayOfWeek === day.getDay())
      if (!a) continue

      const startH = parseInt(a.startTime)
      const endH   = parseInt(a.endTime)
      const midH   = Math.floor((startH + endH) / 2)
      const morning = seededRandom(seed + 2) < 0.5

      const reasonIdx = Math.floor(seededRandom(seed + 3) * BLOCK_REASONS.length)
      blockRows.push({
        providerId: provider.id,
        date: startOfDay(day),
        startTime: morning ? `${pad(startH)}:00` : `${pad(midH)}:00`,
        endTime:   morning ? `${pad(midH)}:00`   : `${pad(endH)}:00`,
        reason: BLOCK_REASONS[reasonIdx],
      })
    }
  }

  console.log(`Inserting ${bookingRows.length} bookings in batches…`)
  const BATCH = 500
  for (let i = 0; i < bookingRows.length; i += BATCH) {
    await prisma.booking.createMany({ data: bookingRows.slice(i, i + BATCH) })
    process.stdout.write(`\r  ${Math.min(i + BATCH, bookingRows.length)}/${bookingRows.length}`)
  }
  console.log()

  console.log(`Inserting ${blockRows.length} blocked slots…`)
  for (let i = 0; i < blockRows.length; i += BATCH) {
    await prisma.blockedSlot.createMany({ data: blockRows.slice(i, i + BATCH) })
  }

  console.log(`\nDone. ${bookingRows.length} bookings, ${blockRows.length} blocked slots.`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
