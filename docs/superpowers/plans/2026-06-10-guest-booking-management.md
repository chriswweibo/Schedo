# Guest Booking Self-Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let guests cancel, reschedule, or edit a booking via a secure "manage your booking" link included in their confirmation emails.

**Architecture:** Each booking gets an unguessable `manageToken` (capability URL). A new token-scoped page (`/booking/manage/[token]`) and `PATCH /api/bookings/manage/[token]` endpoint let the guest manage the booking with no login. Reschedules re-run the overlap check and re-derive status from the provider's booking mode. All writes are blocked once the appointment start has passed or the booking is terminal.

**Tech Stack:** Next.js 14 App Router, TypeScript, Prisma + PostgreSQL, Zod, nodemailer (Gmail SMTP), Jest.

**Spec:** `docs/superpowers/specs/2026-06-10-guest-booking-management-design.md`

---

## File Structure

- `prisma/schema.prisma` — add `manageToken String? @unique` to `Booking` (modify).
- `prisma/backfill-manage-tokens.ts` — one-time backfill for existing rows (create).
- `lib/validations.ts` — add `ManageBookingSchema` (modify).
- `lib/email.ts` — add manage link to guest emails; add 3 guest-change notification helpers (modify).
- `app/api/bookings/route.ts` — generate `manageToken` on create; pass to emails (modify).
- `app/api/bookings/[id]/route.ts` — pass `manageToken` to `sendRequestAccepted` (modify).
- `app/api/bookings/manage/[token]/route.ts` — `PATCH` handler for cancel/reschedule/edit (create).
- `app/booking/manage/[token]/page.tsx` — server component, loads booking by token (create).
- `components/booking/ManageBookingClient.tsx` — client UI for the three actions (create).
- `__tests__/api/bookings.test.ts` — assert token generation (modify).
- `__tests__/api/manage-booking.test.ts` — route tests for the manage endpoint (create).

---

## Task 1: Schema — add `manageToken` and backfill existing rows

**Files:**
- Modify: `prisma/schema.prisma` (Booking model)
- Create: `prisma/backfill-manage-tokens.ts`

- [ ] **Step 1: Add the field to the Booking model**

In `prisma/schema.prisma`, add the `manageToken` line to `model Booking`:

```prisma
model Booking {
  id         String        @id @default(cuid())
  providerId String
  provider   Provider      @relation(fields: [providerId], references: [id], onDelete: Cascade)
  guestName  String
  guestEmail String
  guestPhone String?
  date       DateTime
  startTime  String
  endTime    String
  status     BookingStatus @default(PENDING)
  notes      String?
  manageToken String?      @unique
  createdAt  DateTime      @default(now())

  @@index([providerId, date, status])
}
```

- [ ] **Step 2: Generate and apply the migration**

Run: `npx prisma migrate dev --name add_booking_manage_token`
Expected: migration created under `prisma/migrations/`, applied, and "✔ Generated Prisma Client" printed.

- [ ] **Step 3: Write the backfill script**

Create `prisma/backfill-manage-tokens.ts` (mirrors `prisma/seed.ts`'s adapter setup — a bare `PrismaClient` fails without the Pg adapter):

```ts
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()

import { randomBytes } from 'crypto'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

async function main() {
  const rows = await prisma.booking.findMany({
    where: { manageToken: null },
    select: { id: true },
  })
  for (const { id } of rows) {
    await prisma.booking.update({
      where: { id },
      data: { manageToken: randomBytes(24).toString('hex') },
    })
  }
  console.log(`Backfilled ${rows.length} booking(s) with manageToken`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect(); await pool.end() })
```

- [ ] **Step 4: Run the backfill**

Run: `npx tsx prisma/backfill-manage-tokens.ts`
Expected: prints `Backfilled N booking(s) with manageToken` (N ≥ 0), exits 0.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations prisma/backfill-manage-tokens.ts
git commit -m "feat: add manageToken to Booking + backfill script"
```

---

## Task 2: Generate `manageToken` when a booking is created

**Files:**
- Modify: `app/api/bookings/route.ts`
- Test: `__tests__/api/bookings.test.ts`

- [ ] **Step 1: Write the failing test**

Add this test inside the `describe('POST /api/bookings', ...)` block in `__tests__/api/bookings.test.ts`:

```ts
it('generates a manageToken on the created booking', async () => {
  ;(prisma.provider.findUnique as jest.Mock).mockResolvedValue({
    id: 'p1', name: 'Bob', profession: 'Plumber', bookingMode: 'INSTANT', email: 'bob@example.com',
  })
  ;(prisma.booking.findMany as jest.Mock).mockResolvedValue([])
  ;(prisma.blockedSlot.findMany as jest.Mock).mockResolvedValue([])
  ;(prisma.booking.create as jest.Mock).mockResolvedValue({ id: 'b1', status: 'CONFIRMED' })

  const req = new NextRequest('http://localhost/api/bookings', {
    method: 'POST',
    body: JSON.stringify(validBody),
  })
  await POST(req)

  expect(prisma.booking.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({ manageToken: expect.stringMatching(/^[0-9a-f]{48}$/) }),
    })
  )
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/api/bookings.test.ts -t "generates a manageToken"`
Expected: FAIL — `manageToken` is `undefined` in the `create` call.

- [ ] **Step 3: Implement token generation**

In `app/api/bookings/route.ts`, add the import at the top:

```ts
import { randomBytes } from 'crypto'
```

Then change the `prisma.booking.create` call to include the token:

```ts
    const booking = await prisma.booking.create({
      data: {
        providerId, date, startTime, endTime,
        guestName, guestEmail, guestPhone, notes,
        status: isInstant ? 'CONFIRMED' : 'PENDING',
        manageToken: randomBytes(24).toString('hex'),
      },
    })
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/api/bookings.test.ts`
Expected: PASS (all tests in file, including the new one).

- [ ] **Step 5: Commit**

```bash
git add app/api/bookings/route.ts __tests__/api/bookings.test.ts
git commit -m "feat: generate manageToken when a booking is created"
```

---

## Task 3: `ManageBookingSchema` validation

**Files:**
- Modify: `lib/validations.ts`
- Test: `__tests__/lib/validations.test.ts` (create if absent)

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/validations.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/lib/validations.test.ts`
Expected: FAIL — `ManageBookingSchema` is not exported.

- [ ] **Step 3: Implement the schema**

Append to `lib/validations.ts`:

```ts
export const ManageBookingSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('cancel') }),
  z.object({
    action: z.literal('reschedule'),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
  }),
  z.object({
    action: z.literal('edit'),
    guestName: z.string().min(1).optional(),
    guestPhone: z.string().optional(),
    notes: z.string().optional(),
  }),
])
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/lib/validations.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/validations.ts __tests__/lib/validations.test.ts
git commit -m "feat: add ManageBookingSchema validation"
```

---

## Task 4: Email — manage link in guest emails + guest-change notifications

**Files:**
- Modify: `lib/email.ts`
- Modify: `app/api/bookings/route.ts` (pass `manageToken` to email params)
- Modify: `app/api/bookings/[id]/route.ts` (pass `manageToken` to `sendRequestAccepted`)

This task is email plumbing (side-effecting I/O guarded by a null transport). It is verified by the manage-route tests in Task 5 (which mock these helpers) and the manual smoke in Task 6. No standalone unit test.

- [ ] **Step 1: Add `manageToken` to `BookingEmailParams` and a link helper**

In `lib/email.ts`, extend the interface and add a helper just below it:

```ts
interface BookingEmailParams {
  guestEmail: string
  guestName: string
  providerName: string
  providerEmail?: string
  date: string
  startTime: string
  endTime: string
  profession: string
  manageToken?: string
}

function manageLink(token?: string): string {
  if (!token) return ''
  return `<p><a href="${process.env.NEXTAUTH_URL}/booking/manage/${token}">Need to change something? Manage your booking</a></p>`
}
```

- [ ] **Step 2: Add the link to the three guest-facing emails**

In `sendInstantConfirmation`, append `${manageLink(p.manageToken)}` to the **guest** email's html (the `to: p.guestEmail` block), just before `<p>— Schedo</p>`:

```ts
      html: `<p>Hi ${p.guestName},</p>
<p>Your booking with <strong>${p.providerName}</strong> (${p.profession}) is confirmed.</p>
<p><strong>Date:</strong> ${p.date}<br/><strong>Time:</strong> ${p.startTime} – ${p.endTime}</p>
${manageLink(p.manageToken)}
<p>— Schedo</p>`,
```

In `sendRequestSubmitted`, do the same for the guest block:

```ts
      html: `<p>Hi ${p.guestName},</p>
<p>Your booking request with <strong>${p.providerName}</strong> (${p.profession}) has been sent.</p>
<p><strong>Date:</strong> ${p.date}<br/><strong>Time:</strong> ${p.startTime} – ${p.endTime}</p>
${manageLink(p.manageToken)}
<p>We'll let you know once they confirm. — Schedo</p>`,
```

In `sendRequestAccepted`, add to the guest email:

```ts
      html: `<p>Hi ${p.guestName},</p>
<p>Great news! <strong>${p.providerName}</strong> has confirmed your booking.</p>
<p><strong>Date:</strong> ${p.date}<br/><strong>Time:</strong> ${p.startTime} – ${p.endTime}</p>
${manageLink(p.manageToken)}
<p>— Schedo</p>`,
```

- [ ] **Step 3: Add the three guest-change notification helpers**

Append to `lib/email.ts`:

```ts
export async function sendBookingCancelledByGuest(p: {
  providerEmail?: string
  guestName: string
  date: string
  startTime: string
  endTime: string
}) {
  const transport = getTransport()
  if (!transport || !p.providerEmail) return
  await transport.sendMail({
    from: FROM,
    to: p.providerEmail,
    subject: `Booking cancelled by ${p.guestName}`,
    html: `<p><strong>${p.guestName}</strong> cancelled their booking.</p>
<p><strong>Date:</strong> ${p.date}<br/><strong>Time:</strong> ${p.startTime} – ${p.endTime}</p>
<p>The slot is now free. — Schedo</p>`,
  })
}

export async function sendBookingRescheduledByGuest(p: BookingEmailParams & { pending: boolean }) {
  const transport = getTransport()
  if (!transport) return
  await Promise.all([
    transport.sendMail({
      from: FROM,
      to: p.guestEmail,
      subject: p.pending
        ? `Reschedule request sent to ${p.providerName}`
        : `Booking rescheduled — ${p.providerName}`,
      html: `<p>Hi ${p.guestName},</p>
<p>Your booking with <strong>${p.providerName}</strong> has been moved to:</p>
<p><strong>Date:</strong> ${p.date}<br/><strong>Time:</strong> ${p.startTime} – ${p.endTime}</p>
${p.pending ? '<p>This new time is pending the provider\'s approval.</p>' : ''}
${manageLink(p.manageToken)}
<p>— Schedo</p>`,
    }),
    p.providerEmail &&
      transport.sendMail({
        from: FROM,
        to: p.providerEmail,
        subject: `${p.guestName} rescheduled their booking`,
        html: `<p><strong>${p.guestName}</strong> moved their booking to:</p>
<p><strong>Date:</strong> ${p.date}<br/><strong>Time:</strong> ${p.startTime} – ${p.endTime}</p>
${p.pending ? `<p><a href="${process.env.NEXTAUTH_URL}/dashboard">Accept or decline in your dashboard</a>.</p>` : '<p>View it in your <a href="' + process.env.NEXTAUTH_URL + '/dashboard">dashboard</a>.</p>'}`,
      }),
  ])
}

export async function sendBookingDetailsUpdatedByGuest(p: {
  providerEmail?: string
  guestName: string
  date: string
  startTime: string
  endTime: string
}) {
  const transport = getTransport()
  if (!transport || !p.providerEmail) return
  await transport.sendMail({
    from: FROM,
    to: p.providerEmail,
    subject: `${p.guestName} updated their booking details`,
    html: `<p><strong>${p.guestName}</strong> updated their contact details / notes for the booking on ${p.date} at ${p.startTime} – ${p.endTime}.</p>
<p>View it in your <a href="${process.env.NEXTAUTH_URL}/dashboard">dashboard</a>. — Schedo</p>`,
  })
}
```

- [ ] **Step 4: Thread `manageToken` through the POST route emails**

In `app/api/bookings/route.ts`, add `manageToken` to the `emailParams` object (the `booking.create` now returns it, but it is also available from the value generated in Task 2 — read it back off `booking`):

```ts
    const emailParams = {
      guestEmail, guestName, providerName: provider.name,
      providerEmail: provider.email, date: formattedDate,
      startTime, endTime, profession: provider.profession,
      manageToken: booking.manageToken ?? undefined,
    }
```

- [ ] **Step 5: Thread `manageToken` through the accept route**

In `app/api/bookings/[id]/route.ts`, add `manageToken: true` to the booking selection is not needed because the route loads the full booking via `findUnique` without a `select` on top-level fields — it uses `include` for the provider only, so `booking.manageToken` is already present. Pass it into `sendRequestAccepted`:

```ts
      sendRequestAccepted({
        guestEmail: booking.guestEmail,
        guestName: booking.guestName,
        providerName: booking.provider.name,
        providerEmail: booking.provider.email,
        date: formattedDate,
        startTime: booking.startTime,
        endTime: booking.endTime,
        profession: booking.provider.profession,
        manageToken: booking.manageToken ?? undefined,
      }).catch((err) => console.error('[email] sendRequestAccepted failed:', err))
```

- [ ] **Step 6: Verify existing tests still pass**

Run: `npx jest __tests__/api/bookings.test.ts`
Expected: PASS (email helpers are mocked; signature changes are additive).

- [ ] **Step 7: Commit**

```bash
git add lib/email.ts app/api/bookings/route.ts app/api/bookings/[id]/route.ts
git commit -m "feat: add manage link to guest emails + guest-change notifications"
```

---

## Task 5: `PATCH /api/bookings/manage/[token]` route

**Files:**
- Create: `app/api/bookings/manage/[token]/route.ts`
- Test: `__tests__/api/manage-booking.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/api/manage-booking.test.ts`:

```ts
/**
 * @jest-environment node
 */
import { PATCH } from '@/app/api/bookings/manage/[token]/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    booking: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    blockedSlot: { findMany: jest.fn() },
  },
}))
jest.mock('@/lib/email', () => ({
  sendBookingCancelledByGuest: jest.fn().mockResolvedValue(undefined),
  sendBookingRescheduledByGuest: jest.fn().mockResolvedValue(undefined),
  sendBookingDetailsUpdatedByGuest: jest.fn().mockResolvedValue(undefined),
}))

import { prisma } from '@/lib/prisma'

const FUTURE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // +7 days
const futureDateStr = FUTURE.toISOString().slice(0, 10)

function bookingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'b1', providerId: 'p1', status: 'CONFIRMED',
    guestName: 'Alice', guestEmail: 'alice@example.com', guestPhone: null, notes: null,
    date: FUTURE, startTime: '10:00', endTime: '11:00', manageToken: 'tok123',
    provider: { name: 'Bob', email: 'bob@example.com', profession: 'Plumber', bookingMode: 'INSTANT' },
    ...overrides,
  }
}

function patch(token: string, body: unknown) {
  const req = new NextRequest(`http://localhost/api/bookings/manage/${token}`, {
    method: 'PATCH', body: JSON.stringify(body),
  })
  return PATCH(req, { params: { token } })
}

describe('PATCH /api/bookings/manage/[token]', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 404 for an unknown token', async () => {
    ;(prisma.booking.findUnique as jest.Mock).mockResolvedValue(null)
    const res = await patch('nope', { action: 'cancel' })
    expect(res.status).toBe(404)
  })

  it('cancels a booking', async () => {
    ;(prisma.booking.findUnique as jest.Mock).mockResolvedValue(bookingRow())
    ;(prisma.booking.update as jest.Mock).mockResolvedValue({ id: 'b1', status: 'CANCELLED' })
    const res = await patch('tok123', { action: 'cancel' })
    expect(res.status).toBe(200)
    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'CANCELLED' }) })
    )
  })

  it('reschedules and keeps CONFIRMED for an INSTANT provider', async () => {
    ;(prisma.booking.findUnique as jest.Mock).mockResolvedValue(bookingRow())
    ;(prisma.booking.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.blockedSlot.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.booking.update as jest.Mock).mockResolvedValue({ id: 'b1', status: 'CONFIRMED' })
    const res = await patch('tok123', {
      action: 'reschedule', date: futureDateStr, startTime: '14:00', endTime: '15:00',
    })
    expect(res.status).toBe(200)
    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'CONFIRMED', startTime: '14:00' }) })
    )
  })

  it('reschedules to PENDING for a REQUEST provider', async () => {
    ;(prisma.booking.findUnique as jest.Mock).mockResolvedValue(
      bookingRow({ provider: { name: 'Bob', email: 'bob@example.com', profession: 'Plumber', bookingMode: 'REQUEST' } })
    )
    ;(prisma.booking.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.blockedSlot.findMany as jest.Mock).mockResolvedValue([])
    ;(prisma.booking.update as jest.Mock).mockResolvedValue({ id: 'b1', status: 'PENDING' })
    const res = await patch('tok123', {
      action: 'reschedule', date: futureDateStr, startTime: '14:00', endTime: '15:00',
    })
    expect(res.status).toBe(200)
    expect(prisma.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'PENDING' }) })
    )
  })

  it('returns 409 when the reschedule slot overlaps an existing booking', async () => {
    ;(prisma.booking.findUnique as jest.Mock).mockResolvedValue(bookingRow())
    ;(prisma.booking.findMany as jest.Mock).mockResolvedValue([{ startTime: '14:00', endTime: '15:00' }])
    ;(prisma.blockedSlot.findMany as jest.Mock).mockResolvedValue([])
    const res = await patch('tok123', {
      action: 'reschedule', date: futureDateStr, startTime: '14:00', endTime: '15:00',
    })
    expect(res.status).toBe(409)
  })

  it('edits guest details without changing status', async () => {
    ;(prisma.booking.findUnique as jest.Mock).mockResolvedValue(bookingRow())
    ;(prisma.booking.update as jest.Mock).mockResolvedValue({ id: 'b1', status: 'CONFIRMED' })
    const res = await patch('tok123', { action: 'edit', guestName: 'Alicia', notes: 'gate code 1234' })
    expect(res.status).toBe(200)
    const arg = (prisma.booking.update as jest.Mock).mock.calls[0][0]
    expect(arg.data.guestName).toBe('Alicia')
    expect(arg.data.status).toBeUndefined()
  })

  it('returns 409 when the appointment start has passed', async () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000)
    ;(prisma.booking.findUnique as jest.Mock).mockResolvedValue(bookingRow({ date: past }))
    const res = await patch('tok123', { action: 'cancel' })
    expect(res.status).toBe(409)
    expect(prisma.booking.update).not.toHaveBeenCalled()
  })

  it('returns 409 for an already-cancelled booking', async () => {
    ;(prisma.booking.findUnique as jest.Mock).mockResolvedValue(bookingRow({ status: 'CANCELLED' }))
    const res = await patch('tok123', { action: 'cancel' })
    expect(res.status).toBe(409)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/api/manage-booking.test.ts`
Expected: FAIL — cannot find module `app/api/bookings/manage/[token]/route`.

- [ ] **Step 3: Implement the route**

Create `app/api/bookings/manage/[token]/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { parseISO, startOfDay, endOfDay, format } from 'date-fns'
import { prisma } from '@/lib/prisma'
import { ManageBookingSchema } from '@/lib/validations'
import { timesOverlap } from '@/lib/availability'
import {
  sendBookingCancelledByGuest,
  sendBookingRescheduledByGuest,
  sendBookingDetailsUpdatedByGuest,
} from '@/lib/email'

function appointmentHasStarted(date: Date, startTime: string): boolean {
  const [h, m] = startTime.split(':').map(Number)
  const start = new Date(date)
  start.setHours(h, m, 0, 0)
  return start.getTime() <= Date.now()
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const body = await req.json()
    const parsed = ManageBookingSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const booking = await prisma.booking.findUnique({
      where: { manageToken: params.token },
      include: {
        provider: { select: { name: true, email: true, profession: true, bookingMode: true } },
      },
    })
    if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (
      booking.status === 'CANCELLED' ||
      booking.status === 'DECLINED' ||
      appointmentHasStarted(booking.date, booking.startTime)
    ) {
      return NextResponse.json(
        { error: 'This booking can no longer be modified' },
        { status: 409 }
      )
    }

    const formattedDate = format(booking.date, 'MMMM d, yyyy')
    const data = parsed.data

    if (data.action === 'cancel') {
      const updated = await prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'CANCELLED' },
      })
      sendBookingCancelledByGuest({
        providerEmail: booking.provider.email,
        guestName: booking.guestName,
        date: formattedDate,
        startTime: booking.startTime,
        endTime: booking.endTime,
      }).catch((err) => console.error('[manage] cancel email failed:', err))
      return NextResponse.json(updated)
    }

    if (data.action === 'edit') {
      const updated = await prisma.booking.update({
        where: { id: booking.id },
        data: {
          guestName: data.guestName ?? booking.guestName,
          guestPhone: data.guestPhone ?? booking.guestPhone,
          notes: data.notes ?? booking.notes,
        },
      })
      sendBookingDetailsUpdatedByGuest({
        providerEmail: booking.provider.email,
        guestName: updated.guestName,
        date: formattedDate,
        startTime: booking.startTime,
        endTime: booking.endTime,
      }).catch((err) => console.error('[manage] edit email failed:', err))
      return NextResponse.json(updated)
    }

    // action === 'reschedule'
    const date = parseISO(data.date)
    const dayStart = startOfDay(date)
    const dayEnd = endOfDay(date)

    const [existingBookings, blockedSlots] = await Promise.all([
      prisma.booking.findMany({
        where: {
          providerId: booking.providerId,
          date: { gte: dayStart, lte: dayEnd },
          status: 'CONFIRMED',
          NOT: { id: booking.id },
        },
        select: { startTime: true, endTime: true },
      }),
      prisma.blockedSlot.findMany({
        where: { providerId: booking.providerId, date: { gte: dayStart, lte: dayEnd } },
        select: { startTime: true, endTime: true },
      }),
    ])

    const overlap = [...existingBookings, ...blockedSlots].some((b) =>
      timesOverlap(data.startTime, data.endTime, b.startTime, b.endTime)
    )
    if (overlap) {
      return NextResponse.json(
        { error: 'This time slot is no longer available' },
        { status: 409 }
      )
    }

    const isInstant =
      booking.provider.bookingMode === 'INSTANT' || booking.provider.bookingMode === 'BOTH'
    const newStatus = isInstant ? 'CONFIRMED' : 'PENDING'

    const updated = await prisma.booking.update({
      where: { id: booking.id },
      data: { date, startTime: data.startTime, endTime: data.endTime, status: newStatus },
    })

    sendBookingRescheduledByGuest({
      guestEmail: booking.guestEmail,
      guestName: booking.guestName,
      providerName: booking.provider.name,
      providerEmail: booking.provider.email,
      date: format(date, 'MMMM d, yyyy'),
      startTime: data.startTime,
      endTime: data.endTime,
      profession: booking.provider.profession,
      manageToken: booking.manageToken ?? undefined,
      pending: !isInstant,
    }).catch((err) => console.error('[manage] reschedule email failed:', err))

    return NextResponse.json(updated)
  } catch (err) {
    console.error('[manage] PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/api/manage-booking.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add app/api/bookings/manage __tests__/api/manage-booking.test.ts
git commit -m "feat: add token-scoped manage booking PATCH route"
```

---

## Task 6: Manage page UI

**Files:**
- Create: `app/booking/manage/[token]/page.tsx`
- Create: `components/booking/ManageBookingClient.tsx`

UI is verified by manual smoke (browser), not an automated test.

- [ ] **Step 1: Create the server page**

Create `app/booking/manage/[token]/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { Card } from '@/components/ui/Card'
import { prisma } from '@/lib/prisma'
import { ManageBookingClient } from '@/components/booking/ManageBookingClient'

export default async function ManageBookingPage({
  params,
}: {
  params: { token: string }
}) {
  const booking = await prisma.booking.findUnique({
    where: { manageToken: params.token },
    include: { provider: { select: { id: true, name: true, profession: true } } },
  })
  if (!booking) notFound()

  const [h, m] = booking.startTime.split(':').map(Number)
  const start = new Date(booking.date)
  start.setHours(h, m, 0, 0)
  const editable =
    start.getTime() > Date.now() &&
    booking.status !== 'CANCELLED' &&
    booking.status !== 'DECLINED'

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold">Manage your booking</h1>
      <p className="mb-6 text-stone-500">
        {booking.provider.name} · {booking.provider.profession}
      </p>
      <Card className="p-6">
        {editable ? (
          <ManageBookingClient
            token={params.token}
            providerId={booking.provider.id}
            initial={{
              date: format(booking.date, 'yyyy-MM-dd'),
              startTime: booking.startTime,
              endTime: booking.endTime,
              status: booking.status,
              guestName: booking.guestName,
              guestPhone: booking.guestPhone ?? '',
              notes: booking.notes ?? '',
            }}
          />
        ) : (
          <div>
            <p className="mb-1 text-sm text-stone-700">
              {format(booking.date, 'MMMM d, yyyy')} · {booking.startTime} – {booking.endTime}
            </p>
            <p className="text-sm font-medium text-stone-500">
              Status: {booking.status}
            </p>
            <p className="mt-4 text-sm text-stone-500">
              This booking can no longer be modified.
            </p>
          </div>
        )}
      </Card>
    </main>
  )
}
```

- [ ] **Step 2: Create the client component**

Create `components/booking/ManageBookingClient.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface Initial {
  date: string
  startTime: string
  endTime: string
  status: string
  guestName: string
  guestPhone: string
  notes: string
}

type Slot = { startTime: string; endTime: string; status: string }

export function ManageBookingClient({
  token,
  providerId,
  initial,
}: {
  token: string
  providerId: string
  initial: Initial
}) {
  const router = useRouter()
  const [details, setDetails] = useState({
    guestName: initial.guestName,
    guestPhone: initial.guestPhone,
    notes: initial.notes,
  })
  const [rescheduleDate, setRescheduleDate] = useState(initial.date)
  const [slots, setSlots] = useState<Slot[]>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function call(body: unknown) {
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const res = await fetch(`/api/bookings/manage/${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok) {
        setMessage('Saved.')
        router.refresh()
      } else {
        setError(typeof data.error === 'string' ? data.error : 'Update failed. Please try again.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function loadSlots(date: string) {
    setRescheduleDate(date)
    const res = await fetch(`/api/availability/${providerId}?date=${date}`)
    if (res.ok) setSlots(await res.json())
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="mb-1 text-lg font-semibold">Current booking</h2>
        <p className="text-sm text-stone-600">
          {initial.date} · {initial.startTime} – {initial.endTime} · {initial.status}
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Edit details</h2>
        <Input
          label="Your name"
          value={details.guestName}
          onChange={(e) => setDetails((d) => ({ ...d, guestName: e.target.value }))}
        />
        <Input
          label="Phone"
          value={details.guestPhone}
          onChange={(e) => setDetails((d) => ({ ...d, guestPhone: e.target.value }))}
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-stone-700">Notes</label>
          <textarea
            value={details.notes}
            onChange={(e) => setDetails((d) => ({ ...d, notes: e.target.value }))}
            rows={3}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <Button
          variant="secondary"
          disabled={loading}
          onClick={() => call({ action: 'edit', ...details })}
        >
          Save details
        </Button>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Reschedule</h2>
        <Input
          label="New date"
          type="date"
          value={rescheduleDate}
          onChange={(e) => loadSlots(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {slots
            .filter((s) => s.status === 'available')
            .map((s) => (
              <Button
                key={s.startTime}
                variant="secondary"
                disabled={loading}
                onClick={() =>
                  call({
                    action: 'reschedule',
                    date: rescheduleDate,
                    startTime: s.startTime,
                    endTime: s.endTime,
                  })
                }
              >
                {s.startTime}
              </Button>
            ))}
          {slots.length > 0 && slots.every((s) => s.status !== 'available') && (
            <p className="text-sm text-stone-500">No open slots that day.</p>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3 border-t border-stone-200 pt-6">
        <h2 className="text-lg font-semibold text-red-600">Cancel booking</h2>
        <Button
          variant="secondary"
          disabled={loading}
          onClick={() => {
            if (confirm('Cancel this booking? This cannot be undone.')) call({ action: 'cancel' })
          }}
        >
          Cancel booking
        </Button>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-green-600">{message}</p>}
    </div>
  )
}
```

- [ ] **Step 3: Build to verify it compiles**

Run: `npm run lint && npx tsc --noEmit`
Expected: no errors in the new/changed files (pre-existing `prisma/seed*.ts` tsc errors are unrelated and may remain).

- [ ] **Step 4: Manual smoke test**

Start the dev server (`npm run dev`). Create a booking with a future date via the UI or API, read its `manageToken` from the DB (`npx tsx -e` query or Prisma Studio), then:
- Visit `http://localhost:3000/booking/manage/<token>` → confirm the edit/reschedule/cancel UI renders.
- Pick a new date → confirm available slots load.
- Click a slot → confirm a 200 and the page refreshes with the new time.
- Click "Cancel booking" → confirm the page flips to the read-only "can no longer be modified" state.
- Visit `http://localhost:3000/booking/manage/bogus-token` → confirm a 404 page.

- [ ] **Step 5: Commit**

```bash
git add app/booking/manage components/booking/ManageBookingClient.tsx
git commit -m "feat: guest booking manage page (edit/reschedule/cancel)"
```

---

## Self-Review Notes

- **Spec coverage:** data model (Task 1), token generation (Task 2), validation (Task 3), email link + change notifications (Task 4), manage API with cutoff/overlap/status-by-mode (Task 5), manage page with editable/read-only states (Task 6). All spec sections map to a task.
- **Type consistency:** `manageToken` is `String?` throughout; email helpers receive `manageToken?: string` (the `?? undefined` coalesces Prisma's `null`). `ManageBookingSchema`'s discriminated `action` values (`cancel`/`reschedule`/`edit`) match the route's branches and the client's request bodies. Status-by-mode rule (`INSTANT`/`BOTH` → `CONFIRMED`, `REQUEST` → `PENDING`) is identical in spec, route, and tests.
- **Cutoff** is enforced server-side in Task 5 (`appointmentHasStarted`) and mirrored in the Task 6 page's `editable` check, so a stale page cannot bypass it.
