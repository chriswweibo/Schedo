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
- `ENCRYPTION_KEY` — base64 32-byte key used to encrypt guest PII (`Booking.guestName/guestEmail/guestPhone/notes`) at rest via AES-256-GCM. If unset, the app throws when writing guest PII (it will not silently store plaintext).

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

`GET /api/providers` loads up to 200 visible providers, applies geo radius filter (haversine), keyword/profession filter, name filter, and day-of-week availability filter in-process, then returns the top 50 sorted by distance. Geocoding of provider addresses (settings page) is done server-side using the `MAPBOX_TOKEN`.

### Booking Flow

1. Customer picks a date on the profile page → `GET /api/availability/[providerId]?date=YYYY-MM-DD` returns hourly slots.
2. Slot selection redirects to `/booking/[providerId]` with query params.
3. `POST /api/bookings` validates, checks for overlap against `CONFIRMED` bookings + `BlockedSlot`, creates the booking, and fires confirmation emails (nodemailer/Gmail).
4. `INSTANT` mode → `status: CONFIRMED` immediately. `REQUEST` mode → `status: PENDING`, provider acts via dashboard.

### Testing

Tests live in `__tests__/` mirroring the source structure. Pure-logic tests (geo, availability) use `@jest-environment node`; API route tests can use `jsdom` (default in jest.config.ts). The `@/` alias maps to the repo root.
