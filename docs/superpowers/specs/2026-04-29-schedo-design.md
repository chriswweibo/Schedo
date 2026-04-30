# Schedo — Design Spec
**Date:** 2026-04-29
**Status:** Approved

---

## Overview

Schedo is a scheduling platform for small business service providers (electricians, plumbers, gardeners, builders, etc.). Providers self-register, publish their availability, and get discovered by customers searching by service type, location, and date. Customers book as guests — no account required.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS |
| ORM | Prisma |
| Database | PostgreSQL (Neon or Supabase DB-only) |
| Auth | NextAuth.js (email/password, providers only) |
| Maps | Mapbox GL |
| Date utils | date-fns |
| Validation | Zod |
| Email | Resend |
| Deployment | Vercel |

**Design language:** Warm neutral — stone/warm-white backgrounds, green accents (`#16a34a`), minimal borders, soft shadows.

---

## Pages & Routes

| Route | Access | Description |
|---|---|---|
| `/` | Public | Homepage — split hero (search left, map preview right) + category icon grid |
| `/search` | Public | Search results — split list + sticky map, filter bar (location, date, category) |
| `/p/[slug]` | Public | Provider profile — bio, sidebar calendar, past job showcase cards |
| `/booking/[providerId]` | Public | Booking form step — guest name, email, phone (optional), note |
| `/booking/confirmation` | Public | Booking confirmed/pending summary page |
| `/dashboard` | Provider (auth) | Provider dashboard — upcoming bookings, pending requests |
| `/dashboard/settings` | Provider (auth) | SEO keywords, geolocation, accepted radius, visibility toggle, booking mode |
| `/auth/login` | Public | Provider login |
| `/auth/register` | Public | Provider self-registration |

---

## Visual Design

- **Homepage layout:** Split hero — left side has keyword search + location + date fields + CTA button; right side shows a live map preview with provider pins. Category icon grid below (Electrical, Plumbing, Gardening, Building, Painting, etc.).
- **Search results:** Left column = scrollable provider list (avatar, name, rating, distance, Book button); right = sticky live map. Hovering a provider card highlights its pin. Filter bar pins to top on scroll.
- **Provider profile:** Header with avatar, name, rating, profession, Book CTA. Two-column body: left has bio + completed job showcase cards (image, title, date); right sidebar has monthly calendar (green = available, red = booked/blocked). Clicking a date expands time slots below the calendar.

---

## Data Model

```prisma
model Provider {
  id               String        @id @default(cuid())
  name             String
  slug             String        @unique
  email            String        @unique
  passwordHash     String
  bio              String?
  avatarUrl        String?
  profession       String
  keywords         String[]
  lat              Float?
  lng              Float?
  acceptedRadiusKm Int           @default(25)
  bookingMode      BookingMode   @default(INSTANT)
  isVisible        Boolean       @default(true)
  createdAt        DateTime      @default(now())

  availability     Availability[]
  bookings         Booking[]
  blockedSlots     BlockedSlot[]
  completedJobs    CompletedJob[]
}

model Availability {
  id          String   @id @default(cuid())
  providerId  String
  provider    Provider @relation(fields: [providerId], references: [id])
  dayOfWeek   Int      // 0 = Sunday, 6 = Saturday
  startTime   String   // "09:00"
  endTime     String   // "17:00"
  isActive    Boolean  @default(true)
}

model Booking {
  id          String        @id @default(cuid())
  providerId  String
  provider    Provider      @relation(fields: [providerId], references: [id])
  guestName   String
  guestEmail  String
  guestPhone  String?
  date        DateTime
  startTime   String
  endTime     String
  status      BookingStatus @default(PENDING)
  notes       String?
  createdAt   DateTime      @default(now())
}

model BlockedSlot {
  id         String   @id @default(cuid())
  providerId String
  provider   Provider @relation(fields: [providerId], references: [id])
  date       DateTime
  startTime  String
  endTime    String
  reason     String?
}

model CompletedJob {
  id          String   @id @default(cuid())
  providerId  String
  provider    Provider @relation(fields: [providerId], references: [id])
  title       String
  description String?
  imageUrl    String?
  completedAt DateTime
}

enum BookingMode {
  INSTANT
  REQUEST
  BOTH
}

enum BookingStatus {
  PENDING
  CONFIRMED
  DECLINED
  CANCELLED
}
```

---

## Provider Settings & Visibility

Providers control their discoverability via `/dashboard/settings`:

- **Keywords / SEO tags** — free-text array (e.g. `["emergency electrician", "panel upgrade", "EV charging"]`). Matched against customer search queries alongside `profession`.
- **Geolocation** — provider enters an address; it is geocoded to `lat/lng` via the Maps API. Displayed publicly as city/area label only.
- **Accepted radius (km)** — slider (5–100 km). Provider only appears in search when the customer's queried location falls within this radius.
- **Visibility toggle** — hard on/off switch. Hides provider from all search results without deleting data.
- **Booking mode** — `INSTANT`, `REQUEST`, or `BOTH` (customer chooses on profile).

**Search ranking:** Filter by radius + keyword/profession match → sort by distance ascending, then `createdAt` descending. Rating-based sorting is deferred to v2 when the `Review` model is added.

---

## Booking Flow

### Instant Booking
1. Customer selects a date on the provider's calendar sidebar.
2. Available time slots render below the calendar.
3. Customer clicks a slot → redirected to `/booking/[providerId]` with date/time pre-filled.
4. Customer fills in name, email, optional phone and note → submits.
5. Slot marked `CONFIRMED` immediately. Overlap check runs server-side.
6. Confirmation email sent to customer. Notification email sent to provider.

### Request-Based Booking
1–4. Same as above.
5. Booking created as `PENDING`.
6. Provider sees request in `/dashboard` and accepts or declines.
7. Customer receives confirmation or decline email.

### BOTH Mode
A toggle on the provider profile page lets customers choose between instant and request. Provider sets their preferred default in settings.

### Overlap Protection
Before confirming or creating any booking, the API checks:
- No existing `CONFIRMED` booking overlaps the requested date + time range.
- No `BlockedSlot` covers the requested date + time range.
If overlap found → return 409 with a user-friendly message.

### Guest Fields
- Name (required)
- Email (required)
- Phone (optional)
- Note (optional)

No customer account is created.

---

## Email Notifications

Triggered server-side via Resend:

| Event | Recipient |
|---|---|
| Instant booking confirmed | Customer + Provider |
| Request booking submitted | Customer (pending notice) + Provider (new request) |
| Provider accepts request | Customer |
| Provider declines request | Customer |
| Booking cancelled | Other party |

---

## Out of Scope (v1)

- Payment processing (architecture leaves room to add Stripe later)
- Customer accounts / booking history
- Reviews / ratings (data model supports it via future `Review` table)
- Admin dashboard / provider moderation
- SMS notifications
- Calendar sync (Google Calendar, iCal export — can be added later)
