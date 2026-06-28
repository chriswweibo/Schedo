# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint (next/core-web-vitals + next/typescript)
npm test             # Run all Jest tests
npm run test:watch   # Jest in watch mode
npm run seed         # Seed database via prisma/seed.ts

# Run a single test file
npx jest __tests__/lib/geo.test.ts

# Prisma
npx prisma migrate dev   # Apply migrations and regenerate client
npx prisma generate      # Regenerate client after schema changes
npx prisma studio        # Visual DB browser
```

## Environment Variables

Copy `.env.local.example` to `.env.local`. Required keys:
- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_SECRET` / `NEXTAUTH_URL`
- `NEXT_PUBLIC_MAPBOX_TOKEN` + `MAPBOX_TOKEN` — same Mapbox token, used in browser and server-side geocoding respectively
- `GMAIL_USER` / `GMAIL_APP_PASSWORD` — Gmail SMTP for transactional email via nodemailer. `GMAIL_APP_PASSWORD` must be a 16-char Google App Password (requires 2-Step Verification on the account), not the regular account password. If either is unset, email sending is a silent no-op.
- `MAIL_FROM` / `MAIL_REPLY_TO` — optional overrides for the email sender and reply-to (set as nodemailer transport defaults). `MAIL_FROM` defaults to `Schedo <GMAIL_USER>`; it only displays as set if it's the Gmail account or a verified "Send mail as" alias on it (Gmail otherwise rewrites the From back to `GMAIL_USER`). `MAIL_REPLY_TO` defaults to `contact@schedo.me`.
- `ENCRYPTION_KEY` — base64 32-byte key used to encrypt guest PII (`Booking.guestName/guestEmail/guestPhone/notes`) at rest via AES-256-GCM. If unset, the app throws when writing guest PII (it will not silently store plaintext).
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth (provider sign-in + Calendar sync). When unset, the Google provider is not registered and the feature is dormant. Redirect URI: `<NEXTAUTH_URL>/api/auth/callback/google`.
- `NEXT_PUBLIC_GOOGLE_ENABLED` — `"true"` to render the "Continue with Google" buttons.
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` — optional; when both are set, enables per-IP sliding-window rate limiting on public booking/search endpoints (create a free Upstash Redis DB at upstash.com). When unset, rate limiting is a silent no-op.
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob storage for provider avatar uploads (`POST /api/me/avatar`). Create a Blob store in the Vercel dashboard (Storage → Blob) and it's provisioned automatically. When unset, avatar upload returns 503; the rest of the app is unaffected.

## Architecture

**Schedo** is a scheduling marketplace for small-business service providers (electricians, plumbers, etc.). Providers register and manage availability; customers book as guests with no account required.

**Stack:** Next.js 14 App Router · TypeScript · Tailwind CSS · Prisma + PostgreSQL · NextAuth.js (JWT, credentials only) · Leaflet maps · date-fns · Zod · nodemailer (Gmail SMTP)

### Directory Layout

```
app/
  page.tsx                  # Homepage — split hero + Leaflet map preview
  search/                   # Public search results (split list + sticky map)
  p/[slug]/                 # Public provider profile (bio, calendar, past jobs)
  booking/[providerId]/     # Guest booking form
  booking/confirmation/     # Post-booking confirmation page
  dashboard/                # Provider-only: upcoming bookings + accept/decline
  dashboard/settings/       # Provider settings (keywords, geo, radius, visibility, booking mode)
  auth/login|register/      # Provider auth pages
  api/
    auth/[...nextauth]/     # NextAuth handler
    providers/              # POST (register), GET (search with geo+keyword filter)
    providers/[slug]/       # GET single provider profile
    providers/all/          # GET all visible providers (for map)
    bookings/               # POST create booking (overlap check + email)
    bookings/[id]/          # PATCH accept/decline (provider only)
    me/jobs/                # GET/POST/DELETE completed jobs (provider only)
    me/availability/        # GET/POST provider availability
    me/blocks/              # GET/POST provider blocked slots
    me/blocks/[id]/         # DELETE blocked slot
    me/calendar/            # GET calendar data for a month
    availability/[providerId]/  # GET public availability for booking page

lib/
  prisma.ts       # Singleton Prisma client using PrismaPg adapter
  auth.ts         # NextAuth config; JWT carries { id, slug }
  availability.ts # getAllSlots() — hourly slot engine (06:00–22:00)
  geo.ts          # haversineKm() — distance filtering for provider search
  validations.ts  # Zod schemas: RegisterProviderSchema, CreateBookingSchema, UpdateProviderSettingsSchema
  email.ts        # nodemailer/Gmail email helpers (confirmation, request, accept/decline)

prisma/
  schema.prisma   # Data model (see below)
  seed.ts         # Dev seed data
```

### Data Model

Core tables: `Provider`, `Availability` (weekly schedule, one row per dayOfWeek), `Booking`, `BlockedSlot`, `CompletedJob`.

Key enums:
- `BookingMode`: `INSTANT` | `REQUEST` | `BOTH` — controls whether bookings confirm immediately or queue for provider approval
- `BookingStatus`: `PENDING` | `CONFIRMED` | `DECLINED` | `CANCELLED`

`Availability.dayOfWeek` uses `0 = Sunday … 6 = Saturday`. Times are stored as `"HH:MM"` strings. Overlap detection uses lexicographic comparison (`s1 < e2 && e1 > s2`).

### Auth Flow

Only providers authenticate. NextAuth uses the `credentials` provider with bcrypt. The JWT is extended with `id` and `slug` fields (see `lib/auth.ts`). Session type is augmented in `next-auth.d.ts`. Protected routes (`/dashboard/**`) check the session server-side.

### Search & Geo

Provider search is unified in `lib/search.ts` (`searchProviders()`). Both `GET /api/providers` and the `app/search/page.tsx` Server Component call it.

**DB-level prefilter (bounding box):** when lat/lng are supplied, a ±100 km bounding-box `WHERE` clause is added so Postgres can use the `(lat, lng)` B-tree index to discard far-away rows before returning them to Node. A safety `take: 500` cap limits the result set further.

**In-JS refinements (identical to original, applied on the reduced set):** precise haversine radius (vs. each provider's `acceptedRadiusKm`), keyword/profession substring filter, name substring filter, day-of-week availability filter. Sort order: distance asc, tie-break by `createdAt` desc.

**Pagination:** `searchProviders` accepts `page` / `pageSize` and returns `{ providers, page, pageSize, hasMore }`. The API returns the providers array as before (backward-compatible); pagination metadata is available via `X-Page` / `X-Page-Size` / `X-Has-More` response headers and by passing a `?page=` query param.

**Indexes added (migration `20260626120000_search_indexes`):**
- `Provider(lat, lng)` — B-tree, used by the bounding-box prefilter.
- `Provider(keywords)` — GIN index for future full-text keyword search.
- `CompletedJob(providerId, completedAt)` — supports sorted job lookups per provider.

Geocoding of provider addresses (settings page) is done server-side using the `MAPBOX_TOKEN`.

### Booking Flow

1. Customer picks a date on the profile page → `GET /api/availability/[providerId]?date=YYYY-MM-DD` returns hourly slots.
2. Slot selection redirects to `/booking/[providerId]` with query params.
3. `POST /api/bookings` validates, checks for overlap against `CONFIRMED` bookings + `BlockedSlot`, creates the booking, and fires confirmation emails (nodemailer/Gmail).
4. `INSTANT` mode → `status: CONFIRMED` immediately. `REQUEST` mode → `status: PENDING`, provider acts via dashboard.

### Testing

Tests live in `__tests__/` mirroring the source structure. Pure-logic tests (geo, availability) use `@jest-environment node`; API route tests can use `jsdom` (default in jest.config.ts). The `@/` alias maps to the repo root.
