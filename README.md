# Schedo

A service provider scheduling platform built with Next.js 14. Customers find and book local professionals; providers manage their availability, bookings, and past work portfolio.

## Features

- **Search & discovery** — find providers by profession, keyword, location, or available date
- **Interactive map** — Leaflet/OpenStreetMap map on the home page and search results
- **Provider profiles** — bio, profession badges, booking calendar, and past work carousel
- **Booking flow** — instant confirmation or request-based, with email notifications via Gmail SMTP (nodemailer)
- **Provider dashboard** — week-view calendar, accept/decline bookings, block time slots
- **Settings** — profession (multi-select), service radius, booking mode, visibility toggle

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | PostgreSQL (Neon) |
| ORM | Prisma 7 + `@prisma/adapter-pg` |
| Auth | NextAuth.js v4 (credentials) |
| Email | nodemailer (Gmail SMTP) |
| Maps | Leaflet + OpenStreetMap |
| Testing | Jest + React Testing Library |

## Data model

```
Provider        — profile, location, booking mode, visibility
Availability    — per-day working hours (dayOfWeek + start/end time)
Booking         — guest details, date, time slot, status (PENDING/CONFIRMED/DECLINED/CANCELLED)
BlockedSlot     — provider-blocked time ranges
CompletedJob    — past work entries with image and description
```

## Getting started

### Prerequisites

- Node.js 18+
- A PostgreSQL database (Neon free tier works)
- A Gmail account with an App Password for email (optional in development)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Create `.env.local`:

```env
DATABASE_URL=postgresql://...
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here
GMAIL_USER=your-account@gmail.com   # optional, emails are skipped if unset
GMAIL_APP_PASSWORD=...              # 16-char Google App Password (needs 2-Step Verification)
```

### 3. Push the schema

```bash
npx prisma db push
```

### 4. Seed demo data

Seeds 100 Sydney-based providers across 26 professions, each with availability schedules and 3 past work entries:

```bash
npm run seed
```

All demo accounts use the password `password123`.  
Example login: `provider1@demo.schedo.app`

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
app/
  page.tsx                  # Home — search form + map
  search/                   # Search results page
  p/[slug]/                 # Provider public profile
  booking/[providerId]/     # Booking form
  dashboard/                # Provider dashboard (auth required)
  auth/                     # Login / register pages
  api/
    providers/              # Provider search (GET)
    availability/[id]/      # Time slot availability (GET)
    bookings/               # Create booking (POST)
    me/
      calendar/             # Week view bookings + blocks (GET)
      blocks/               # Block/unblock time slots (POST/DELETE)
      availability/         # Update working hours (PUT)
      settings/             # Update profile settings (PUT)
      jobs/                 # Manage past work entries (GET/POST/DELETE)

components/
  provider/
    ProviderCalendar.tsx    # Public booking calendar (date picker + slot grid)
    WorksCarousel.tsx       # Past work carousel with lightbox
  map/
    ProviderMap.tsx         # Leaflet map wrapper
  booking/
    BookingForm.tsx         # Guest booking form
  ui/
    Navbar.tsx              # Top navigation
    Logo.tsx                # SVG logo mark / lockup

lib/
  availability.ts           # Slot status logic (available/booked/blocked/outside)
  email.ts                  # nodemailer/Gmail email helpers
  prisma.ts                 # Prisma client singleton
  validations.ts            # Zod schemas

prisma/
  schema.prisma
  seed.ts                   # 100 demo providers with jobs and availability
```

## Running tests

```bash
npm test
npm run test:watch
```

## Booking modes

Providers can choose how bookings work:

| Mode | Behaviour |
|---|---|
| `INSTANT` | Booking is confirmed immediately; guest gets a confirmation email |
| `REQUEST` | Booking stays pending; provider accepts or declines from dashboard |
| `BOTH` | Guest chooses instant or request at booking time |

## Slot status colours

| Colour | Status |
|---|---|
| Indigo | Available |
| Blue | Booked (confirmed) |
| Amber | Pending (awaiting approval) |
| Slate | Blocked by provider |
| Stone | Outside working hours |
