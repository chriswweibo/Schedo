# Guest Booking Self-Management — Design

**Date:** 2026-06-10
**Status:** Approved (pending spec review)

## Problem

Confirmation and request emails sent to guests are dead ends. A guest who needs
to change or cancel a booking has no way to do so — they have no account and no
link. We want every guest-facing email to carry a "manage your booking" link
that lets the guest cancel, reschedule, or edit their booking details.

## Constraints & Decisions

These were settled during brainstorming:

- **Scope:** full edit — the guest can **cancel**, **reschedule**, and **edit
  details** (name / phone / notes).
- **Reschedule of a CONFIRMED booking:** status follows the provider's booking
  mode. INSTANT → the new time auto-confirms (stays `CONFIRMED`). REQUEST → the
  booking drops to `PENDING` for the provider to re-approve. (BOTH behaves like
  INSTANT for the reschedule, since the original slot was already accepted as an
  instant/confirmed booking — see Open Questions if this needs nuance.)
- **Cutoff:** changes are allowed any time **before the appointment's start**.
  Once the start time has passed, or the booking is already `CANCELLED` /
  `DECLINED`, the manage page is read-only and the API rejects writes.
- **Access:** capability URL — a per-booking random secret token in the link.
  No login (guests have no account).

## Access Mechanism

A **capability URL**: each booking gets a unguessable `manageToken`, and the
email link is `${NEXTAUTH_URL}/booking/manage/<token>`. Possession of the link
(delivered to the guest's email) authorizes management of that one booking.

Rejected alternatives:
- *Email magic-link each visit* — more secure but heavy and hostile to an
  accountless guest flow. Overkill.
- *Use the booking `id`* — `cuid`s are guessable/enumerable enough to be a real
  PII and tamper risk (walk the ID space, cancel strangers' bookings). Rejected.

## Data Model

Add one field to `Booking` in `prisma/schema.prisma`:

```prisma
model Booking {
  // ...existing fields...
  manageToken String? @unique
}
```

- **Type:** nullable `String`, `@unique`. Nullable so the migration adds the
  column cleanly to a table with existing rows (Postgres permits many NULLs in a
  unique column).
- **Value:** ~48-char random hex, `crypto.randomBytes(24).toString('hex')`,
  generated in application code at booking-creation time (not a DB default — we
  want a cryptographically random secret, not a `cuid`).
- **Backfill:** a one-time script (`prisma/backfill-manage-tokens.ts`) assigns a
  token to every existing booking that lacks one, so already-sent bookings can
  also be managed. New bookings always receive one on create.

A migration is generated via `npx prisma migrate dev`.

## Components

### 1. Token generation — `app/api/bookings/route.ts`

In the existing `POST` handler, generate a `manageToken` and store it on the
`booking.create`. Pass the token through to the email helpers so the link can be
built.

### 2. Manage page — `app/booking/manage/[token]/page.tsx`

Server component. Loads the booking by `manageToken` (including provider name,
profession, booking mode). If no booking matches → render a 404 / "link not
found" state.

State machine for what it renders:

- **Editable** (status `PENDING` or `CONFIRMED` **and** start time is in the
  future): shows the booking summary plus three capabilities:
  - **Edit details** — name / phone / notes form.
  - **Reschedule** — reuses the existing availability slot-picker
    (`GET /api/availability/[providerId]`) to choose a new date/time.
  - **Cancel** — a "Cancel booking" action with confirmation.
- **Read-only** (start time has passed, or status is `CANCELLED` / `DECLINED`):
  shows the summary and a "This booking can no longer be modified" notice, no
  actions.

Client interactions submit to the manage API (below).

### 3. Manage API — `app/api/bookings/manage/[token]/route.ts` (`PATCH`)

Token-scoped, deliberately separate from the provider-only
`/api/bookings/[id]` route. Zod-validated body with a discriminated `action`:

- `action: "cancel"` → status `CANCELLED`.
- `action: "reschedule"` with `{ date, startTime, endTime }`:
  - Overlap-check the new slot against `CONFIRMED` bookings + `BlockedSlot`
    (reusing `timesOverlap`, same as `POST /api/bookings`); `409` if taken.
  - Status: INSTANT/BOTH → stays/auto-`CONFIRMED`; REQUEST → `PENDING`.
- `action: "edit"` with `{ guestName?, guestPhone?, notes? }` → updates fields,
  status unchanged.

Guard rails applied before any write:
- Token must resolve to a booking, else `404`.
- The appointment **start must be in the future** and status must not be
  `CANCELLED` / `DECLINED`, else `409` (cutoff enforcement). This guard lives in
  the API, not just the UI, so a stale page can't bypass it.

On success it fires emails (below) and returns the updated booking.

### 4. Validation — `lib/validations.ts`

Add a `ManageBookingSchema` (Zod discriminated union on `action`) covering the
three action shapes above.

### 5. Emails — `lib/email.ts`

- **Add the manage link** to the three guest-facing emails:
  `sendInstantConfirmation`, `sendRequestSubmitted`, and the guest half of
  `sendRequestAccepted`. Link text: "Need to change something? Manage your
  booking" → `${NEXTAUTH_URL}/booking/manage/<token>`. This requires threading
  `manageToken` into the email params.
- **Add change-notification emails** for guest-initiated changes:
  - Cancellation → notify the **provider** ("a guest cancelled").
  - Reschedule → notify the **provider** of the new time; send the **guest** an
    updated confirmation (and, if it dropped to `PENDING`, a "pending provider
    approval" notice).
  - Edit details → light-touch; notify the provider the details changed.

  Email send failures are logged and swallowed (matching the existing
  fire-and-forget `.catch()` pattern) so they never fail the guest's request.

## Data Flow

```
Guest email  ──link──▶  /booking/manage/<token>  (server component, loads by token)
                              │
                guest edits / reschedules / cancels
                              │
                              ▼
        PATCH /api/bookings/manage/<token>
          ├─ resolve token → booking (404 if none)
          ├─ enforce cutoff: start in future & status not terminal (409)
          ├─ reschedule: overlap check (409) + status by booking mode
          ├─ persist update
          └─ fire emails (provider notify + guest update)  ─.catch()→ log
                              │
                              ▼
                     updated booking / confirmation UI
```

## Error Handling

| Condition | Response |
|---|---|
| Token matches no booking | `404`, "link not found" page / JSON |
| Appointment already started or status terminal | `409`, read-only UI |
| Reschedule slot overlaps existing booking/block | `409`, "slot no longer available" |
| Invalid body | `400` with Zod flatten |
| Email send fails | logged, swallowed — request still succeeds |

## Testing

Route tests for `PATCH /api/bookings/manage/[token]` (mirroring the existing
`__tests__/api/bookings.test.ts` mocking style):

- cancel → status `CANCELLED`
- reschedule, INSTANT provider → stays `CONFIRMED`
- reschedule, REQUEST provider → `PENDING`
- reschedule onto an overlapping slot → `409`
- edit details → fields updated, status unchanged
- cutoff: booking whose start has passed → `409`, no write
- terminal status (already `CANCELLED`) → `409`
- unknown token → `404`

Plus: `POST /api/bookings` test asserting a `manageToken` is generated and
persisted.

## Out of Scope / Non-Goals

- Provider-side UI changes beyond the new notification emails.
- Editing the provider, profession, or who the booking is with.
- Rate-limiting the manage endpoint (token is the only guard; acceptable for
  current scale).
- Token rotation / expiry independent of the appointment time.

## Open Questions

- **BOTH mode on reschedule:** treated as INSTANT (auto-confirm). If a BOTH
  provider should instead re-approve guest reschedules, revisit — but the
  original booking was already confirmed, so auto-confirm is the consistent
  default.
