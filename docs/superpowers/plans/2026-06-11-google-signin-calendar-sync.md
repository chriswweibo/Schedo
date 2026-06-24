# Google Sign-in + Calendar Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let providers sign in with Google and have their Google Calendar busy times auto-block their Schedo availability — all built now but dormant until Google OAuth credentials are supplied.

**Architecture:** Add a conditionally-registered NextAuth `GoogleProvider` (JWT strategy preserved) that links-by-email or auto-creates a `Provider`, persisting encrypted OAuth tokens. A calendar module refreshes tokens, reads Google freebusy, maps it to `BlockedSlot`s (pure `busyToBlocks`), and applies them idempotently. A sync endpoint is triggered on dashboard load and via a "Sync now" button.

**Tech Stack:** NextAuth 4 (`next-auth/providers/google`), Prisma 7.8, Node `fetch`, `lib/crypto` (AES-256-GCM, from the pii-encryption branch), Jest.

**Spec:** `docs/superpowers/specs/2026-06-11-google-signin-calendar-sync-design.md`

**Branch base:** cut from `feature/pii-encryption` (this work imports `lib/crypto`, which is not yet on `master`).

---

## File Structure

- `prisma/schema.prisma` (+migration) — Provider Google fields; `passwordHash` optional (modify).
- `lib/googleAuth.ts` — `upsertGoogleProvider()` (link-by-email or auto-create, encrypt tokens) (create).
- `lib/auth.ts` — register `GoogleProvider` when configured; `signIn`/`jwt` callbacks; credentials null-hash guard (modify).
- `lib/googleCalendar.ts` — `isExpired`, `busyToBlocks` (pure); `refreshAccessToken`, `fetchBusy` (network); `syncProviderCalendar` (orchestration) (create).
- `app/api/me/calendar/sync/route.ts` — `POST` provider-auth sync endpoint (create).
- `components/auth/GoogleButton.tsx` — "Continue with Google" button (create).
- `app/auth/login/page.tsx`, `app/auth/register/page.tsx` — render the button (modify).
- `app/dashboard/settings/SettingsForm.tsx` — Google Calendar section (modify).
- `app/dashboard/DashboardClient.tsx` — fire sync once on load when connected (modify).
- `.env.local.example`, `CLAUDE.md` — document the new env vars (modify).
- Tests: `__tests__/lib/googleAuth.test.ts`, `__tests__/lib/googleCalendar.test.ts`, `__tests__/api/calendar-sync.test.ts`.

---

## Phase 1 — Sign-in foundation (Tasks 1–4)

## Task 1: Schema — Provider Google fields

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_provider_google_fields/migration.sql`

- [ ] **Step 1: Edit the `Provider` model**

In `prisma/schema.prisma`, change `passwordHash String` to `passwordHash String?` and add the Google fields. The relevant lines become:

```prisma
model Provider {
  id               String         @id @default(cuid())
  name             String
  slug             String         @unique
  email            String         @unique
  passwordHash     String?
  bio              String?
  avatarUrl        String?
  profession       String
  keywords         String[]
  lat              Float?
  lng              Float?
  acceptedRadiusKm Int            @default(25)
  bookingMode      BookingMode    @default(INSTANT)
  isVisible        Boolean        @default(true)
  createdAt        DateTime       @default(now())

  googleId            String?   @unique
  googleAccessToken   String?
  googleRefreshToken  String?
  googleTokenExpiry   DateTime?
  googleSyncedAt      DateTime?

  availability  Availability[]
  bookings      Booking[]
  blockedSlots  BlockedSlot[]
  completedJobs CompletedJob[]

  @@index([isVisible])
}
```

- [ ] **Step 2: Create and apply the migration**

Prisma 7.8 `migrate dev` refuses a non-interactive shell, so create the SQL manually and apply with `migrate deploy` (same approach used for prior migrations on this repo). Create `prisma/migrations/20260611120000_add_provider_google_fields/migration.sql`:

```sql
ALTER TABLE "Provider" ALTER COLUMN "passwordHash" DROP NOT NULL;
ALTER TABLE "Provider" ADD COLUMN "googleId" TEXT;
ALTER TABLE "Provider" ADD COLUMN "googleAccessToken" TEXT;
ALTER TABLE "Provider" ADD COLUMN "googleRefreshToken" TEXT;
ALTER TABLE "Provider" ADD COLUMN "googleTokenExpiry" TIMESTAMP(3);
ALTER TABLE "Provider" ADD COLUMN "googleSyncedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "Provider_googleId_key" ON "Provider"("googleId");
```

Run: `npx prisma migrate deploy` then `npx prisma generate`
Expected: migration applied; client regenerated.

- [ ] **Step 3: Verify the columns exist**

```bash
node -e "require('dotenv').config({path:'.env.local'}); const {Pool}=require('pg'); const p=new Pool({connectionString:process.env.DATABASE_URL}); p.query(\"SELECT column_name FROM information_schema.columns WHERE table_name='Provider' AND column_name LIKE 'google%'\").then(r=>{console.log(r.rows.map(x=>x.column_name)); return p.end()})"
```
Expected: lists `googleId, googleAccessToken, googleRefreshToken, googleTokenExpiry, googleSyncedAt`.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add Provider Google OAuth fields, make passwordHash optional"
```
(End every commit message with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.)

---

## Task 2: `upsertGoogleProvider` (link-by-email or auto-create)

**Files:**
- Create: `lib/googleAuth.ts`
- Test: `__tests__/lib/googleAuth.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/googleAuth.test.ts`:

```ts
/**
 * @jest-environment node
 */
process.env.ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64')

jest.mock('@/lib/prisma', () => ({
  prisma: { provider: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn() } },
}))
import { prisma } from '@/lib/prisma'
import { upsertGoogleProvider } from '@/lib/googleAuth'
import { decrypt } from '@/lib/crypto'

const base = {
  email: 'p@x.com', name: 'Pat', googleId: 'g-1',
  accessToken: 'at-123', refreshToken: 'rt-456', expiresAtSec: 1893456000,
}

describe('upsertGoogleProvider', () => {
  beforeEach(() => jest.clearAllMocks())

  it('links an existing provider by email and stores encrypted tokens', async () => {
    ;(prisma.provider.findUnique as jest.Mock).mockResolvedValue({ id: 'prov-1' })
    ;(prisma.provider.update as jest.Mock).mockResolvedValue({ id: 'prov-1' })
    await upsertGoogleProvider(base)
    expect(prisma.provider.create).not.toHaveBeenCalled()
    const arg = (prisma.provider.update as jest.Mock).mock.calls[0][0]
    expect(arg.where).toEqual({ id: 'prov-1' })
    expect(arg.data.googleId).toBe('g-1')
    expect(decrypt(arg.data.googleAccessToken)).toBe('at-123')
    expect(decrypt(arg.data.googleRefreshToken)).toBe('rt-456')
    expect(arg.data.googleTokenExpiry.getTime()).toBe(1893456000 * 1000)
  })

  it('creates a minimal provider when none exists', async () => {
    ;(prisma.provider.findUnique as jest.Mock).mockResolvedValue(null)
    ;(prisma.provider.create as jest.Mock).mockResolvedValue({ id: 'new-1' })
    await upsertGoogleProvider(base)
    const arg = (prisma.provider.create as jest.Mock).mock.calls[0][0]
    expect(arg.data.email).toBe('p@x.com')
    expect(arg.data.name).toBe('Pat')
    expect(arg.data.profession).toBe('Other')
    expect(arg.data.passwordHash).toBeNull()
    expect(typeof arg.data.slug).toBe('string')
    expect(arg.data.slug.length).toBeGreaterThan(0)
    expect(decrypt(arg.data.googleAccessToken)).toBe('at-123')
  })

  it('does not overwrite the refresh token when none is provided', async () => {
    ;(prisma.provider.findUnique as jest.Mock).mockResolvedValue({ id: 'prov-1' })
    await upsertGoogleProvider({ ...base, refreshToken: undefined })
    const arg = (prisma.provider.update as jest.Mock).mock.calls[0][0]
    expect('googleRefreshToken' in arg.data).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/lib/googleAuth.test.ts`
Expected: FAIL — cannot find module `@/lib/googleAuth`.

- [ ] **Step 3: Write the implementation**

Create `lib/googleAuth.ts`:

```ts
import { prisma } from './prisma'
import { encrypt } from './crypto'

function slugify(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const suffix = Math.random().toString(36).slice(2, 7)
  return `${base || 'provider'}-${suffix}`
}

export interface GoogleProviderInput {
  email: string
  name: string
  googleId: string
  accessToken?: string | null
  refreshToken?: string | null
  /** Unix epoch SECONDS (NextAuth `account.expires_at`), if known. */
  expiresAtSec?: number | null
}

/**
 * Link a Google identity to an existing provider (matched by email) or create a
 * minimal provider. OAuth tokens are encrypted at rest. The refresh token is only
 * written when present (Google omits it on repeat logins).
 */
export async function upsertGoogleProvider(input: GoogleProviderInput): Promise<void> {
  const expiry = input.expiresAtSec ? new Date(input.expiresAtSec * 1000) : null

  const tokenData: Record<string, unknown> = {
    googleId: input.googleId,
    googleAccessToken: input.accessToken ? encrypt(input.accessToken) : null,
    googleTokenExpiry: expiry,
  }
  if (input.refreshToken) {
    tokenData.googleRefreshToken = encrypt(input.refreshToken)
  }

  const existing = await prisma.provider.findUnique({ where: { email: input.email } })
  if (existing) {
    await prisma.provider.update({ where: { id: existing.id }, data: tokenData })
    return
  }

  await prisma.provider.create({
    data: {
      email: input.email,
      name: input.name,
      profession: 'Other',
      slug: slugify(input.name),
      passwordHash: null,
      ...tokenData,
    },
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/lib/googleAuth.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/googleAuth.ts __tests__/lib/googleAuth.test.ts
git commit -m "feat: add upsertGoogleProvider (link-by-email or auto-create)"
```

---

## Task 3: Wire NextAuth Google provider + callbacks

**Files:**
- Modify: `lib/auth.ts`
- Test: `__tests__/lib/auth-credentials.test.ts`

- [ ] **Step 1: Write the failing test (credentials null-hash guard)**

Create `__tests__/lib/auth-credentials.test.ts`:

```ts
/**
 * @jest-environment node
 */
jest.mock('@/lib/prisma', () => ({
  prisma: { provider: { findUnique: jest.fn() } },
}))
jest.mock('bcryptjs', () => ({ compare: jest.fn() }))
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { authOptions } from '@/lib/auth'

function credAuthorize() {
  const provider = authOptions.providers.find((p) => p.id === 'credentials') as {
    options: { authorize: (c: Record<string, string>) => Promise<unknown> }
  }
  // next-auth wraps the config under .options for v4
  const authorize =
    (provider as { authorize?: (c: Record<string, string>) => Promise<unknown> }).authorize ??
    provider.options.authorize
  return authorize
}

describe('credentials authorize', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns null for a google-only provider (no passwordHash)', async () => {
    ;(prisma.provider.findUnique as jest.Mock).mockResolvedValue({
      id: 'p1', email: 'g@x.com', passwordHash: null, name: 'G', slug: 'g',
    })
    const authorize = credAuthorize()
    const result = await authorize({ email: 'g@x.com', password: 'whatever' })
    expect(result).toBeNull()
    expect(bcrypt.compare).not.toHaveBeenCalled()
  })

  it('authenticates a valid password user', async () => {
    ;(prisma.provider.findUnique as jest.Mock).mockResolvedValue({
      id: 'p1', email: 'a@x.com', passwordHash: 'hash', name: 'A', slug: 'a',
    })
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
    const authorize = credAuthorize()
    const result = await authorize({ email: 'a@x.com', password: 'pw' })
    expect(result).toMatchObject({ id: 'p1', slug: 'a' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/lib/auth-credentials.test.ts`
Expected: FAIL — the current `authorize` does not guard `!passwordHash`, so the google-only case would call `bcrypt.compare` (test asserts it is NOT called).

- [ ] **Step 3: Update `lib/auth.ts`**

Replace the contents of `lib/auth.ts` with:

```ts
import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import { upsertGoogleProvider } from './googleAuth'

const googleEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const provider = await prisma.provider.findUnique({
          where: { email: credentials.email },
        })
        if (!provider || !provider.passwordHash) return null
        const valid = await bcrypt.compare(credentials.password, provider.passwordHash)
        if (!valid) return null
        return {
          id: provider.id,
          email: provider.email,
          name: provider.name,
          slug: provider.slug,
        }
      },
    }),
    ...(googleEnabled
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
              params: {
                access_type: 'offline',
                prompt: 'consent',
                scope:
                  'openid email profile https://www.googleapis.com/auth/calendar.readonly',
              },
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== 'google') return true
      const email = profile?.email
      const verified = (profile as { email_verified?: boolean } | null)?.email_verified
      if (!email || verified !== true) return false
      await upsertGoogleProvider({
        email,
        name: profile?.name ?? email.split('@')[0],
        googleId: account.providerAccountId,
        accessToken: account.access_token ?? null,
        refreshToken: account.refresh_token ?? null,
        expiresAtSec: account.expires_at ?? null,
      })
      return true
    },
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.id = user.id
        token.slug = user.slug
      }
      if (account?.provider === 'google' && profile?.email) {
        const p = await prisma.provider.findUnique({
          where: { email: profile.email },
          select: { id: true, slug: true },
        })
        if (p) {
          token.id = p.id
          token.slug = p.slug
        }
      }
      return token
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id ?? ''
        session.user.slug = token.slug ?? ''
      }
      return session
    },
  },
  pages: { signIn: '/auth/login' },
}
```

- [ ] **Step 4: Run tests + typecheck**

Run: `npx jest __tests__/lib/auth-credentials.test.ts`
Expected: PASS (2 tests).
Run: `npx tsc --noEmit`
Expected: no new errors in `lib/auth.ts`. If `user.id` reports a type error in the `jwt` callback, the `User` interface in `types/next-auth.d.ts` already declares `slug`; add `id: string` to that same `interface User` block (it is needed because the credentials `authorize` returns `id`).

- [ ] **Step 5: Commit**

```bash
git add lib/auth.ts __tests__/lib/auth-credentials.test.ts types/next-auth.d.ts
git commit -m "feat: add Google NextAuth provider + link/create on sign-in"
```

---

## Task 4: Google sign-in button + login/register wiring + env docs

**Files:**
- Create: `components/auth/GoogleButton.tsx`
- Modify: `app/auth/login/page.tsx`, `app/auth/register/page.tsx`
- Modify: `.env.local.example`, `CLAUDE.md`

- [ ] **Step 1: Create the button component**

Create `components/auth/GoogleButton.tsx`:

```tsx
'use client'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/Button'

export function GoogleButton({ label = 'Continue with Google' }: { label?: string }) {
  if (process.env.NEXT_PUBLIC_GOOGLE_ENABLED !== 'true') return null
  return (
    <Button
      type="button"
      variant="secondary"
      className="w-full"
      onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
    >
      {label}
    </Button>
  )
}
```

- [ ] **Step 2: Render it on the login page**

In `app/auth/login/page.tsx`, add the import near the other imports:

```tsx
import { GoogleButton } from '@/components/auth/GoogleButton'
```

Then, immediately after the closing `</form>` tag inside `LoginForm`, insert:

```tsx
          <div className="mt-4">
            <GoogleButton />
          </div>
```

- [ ] **Step 3: Render it on the register page**

In `app/auth/register/page.tsx`, add the import:

```tsx
import { GoogleButton } from '@/components/auth/GoogleButton'
```

Then render `<GoogleButton label="Sign up with Google" />` directly after the registration form's closing `</form>` tag (wrap in `<div className="mt-4">…</div>` to match the login spacing).

- [ ] **Step 4: Document env vars**

Append to `.env.local.example`:

```
# Google OAuth for provider sign-in + Calendar sync. Leave unset to disable.
# Authorized redirect URI in Google Cloud: <NEXTAUTH_URL>/api/auth/callback/google
# Enable the Google Calendar API on the project. Calendar read scope is requested at sign-in.
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
# Set to "true" to show the "Continue with Google" buttons (client-visible).
NEXT_PUBLIC_GOOGLE_ENABLED=
```

In `CLAUDE.md`'s Environment Variables list, add:

```
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth (provider sign-in + Calendar sync). When unset, the Google provider is not registered and the feature is dormant. Redirect URI: `<NEXTAUTH_URL>/api/auth/callback/google`.
- `NEXT_PUBLIC_GOOGLE_ENABLED` — `"true"` to render the "Continue with Google" buttons.
```

- [ ] **Step 5: Typecheck/lint and commit**

Run: `npx tsc --noEmit` and `npm run lint`
Expected: no new errors in the changed files.

```bash
git add components/auth/GoogleButton.tsx app/auth/login/page.tsx app/auth/register/page.tsx .env.local.example CLAUDE.md
git commit -m "feat: Google sign-in buttons (gated by NEXT_PUBLIC_GOOGLE_ENABLED) + env docs"
```

---

## Phase 2 — Calendar sync (Tasks 5–8)

## Task 5: Calendar pure helpers (`isExpired`, `busyToBlocks`)

**Files:**
- Create: `lib/googleCalendar.ts`
- Test: `__tests__/lib/googleCalendar.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/googleCalendar.test.ts`:

```ts
/**
 * @jest-environment node
 */
import { isExpired, busyToBlocks } from '@/lib/googleCalendar'

describe('isExpired', () => {
  const now = new Date('2026-06-11T12:00:00Z')
  it('is true when expiry is null', () => {
    expect(isExpired(null, now)).toBe(true)
  })
  it('is true when expiry is in the past', () => {
    expect(isExpired(new Date('2026-06-11T11:00:00Z'), now)).toBe(true)
  })
  it('is false when expiry is comfortably in the future', () => {
    expect(isExpired(new Date('2026-06-11T13:00:00Z'), now)).toBe(false)
  })
  it('is true within the skew buffer of expiry', () => {
    expect(isExpired(new Date('2026-06-11T12:00:30Z'), now)).toBe(true) // <60s away
  })
})

describe('busyToBlocks', () => {
  const winStart = new Date('2026-06-01T00:00:00Z')
  const winEnd = new Date('2026-08-01T00:00:00Z')

  it('maps a single same-day interval to one block', () => {
    const blocks = busyToBlocks(
      [{ start: new Date('2026-06-10T09:00:00Z'), end: new Date('2026-06-10T10:30:00Z') }],
      winStart, winEnd,
    )
    expect(blocks).toEqual([{ date: '2026-06-10', startTime: '09:00', endTime: '10:30' }])
  })

  it('splits a multi-day interval per calendar date', () => {
    const blocks = busyToBlocks(
      [{ start: new Date('2026-06-10T22:00:00Z'), end: new Date('2026-06-12T06:00:00Z') }],
      winStart, winEnd,
    )
    expect(blocks).toEqual([
      { date: '2026-06-10', startTime: '22:00', endTime: '24:00' },
      { date: '2026-06-11', startTime: '00:00', endTime: '24:00' },
      { date: '2026-06-12', startTime: '00:00', endTime: '06:00' },
    ])
  })

  it('clamps intervals to the window and drops out-of-window pieces', () => {
    const blocks = busyToBlocks(
      [{ start: new Date('2026-05-30T09:00:00Z'), end: new Date('2026-06-01T02:00:00Z') }],
      winStart, winEnd,
    )
    expect(blocks).toEqual([{ date: '2026-06-01', startTime: '00:00', endTime: '02:00' }])
  })

  it('drops zero-length intervals', () => {
    const blocks = busyToBlocks(
      [{ start: new Date('2026-06-10T09:00:00Z'), end: new Date('2026-06-10T09:00:00Z') }],
      winStart, winEnd,
    )
    expect(blocks).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/lib/googleCalendar.test.ts`
Expected: FAIL — cannot find module `@/lib/googleCalendar`.

- [ ] **Step 3: Write the pure helpers**

Create `lib/googleCalendar.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/lib/googleCalendar.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/googleCalendar.ts __tests__/lib/googleCalendar.test.ts
git commit -m "feat: add calendar pure helpers (isExpired, busyToBlocks)"
```

---

## Task 6: Calendar network + orchestration (`refreshAccessToken`, `fetchBusy`, `syncProviderCalendar`)

**Files:**
- Modify: `lib/googleCalendar.ts`
- Test: `__tests__/lib/googleCalendar.test.ts` (extend)

- [ ] **Step 1: Write the failing tests (append to the existing file)**

Append inside `__tests__/lib/googleCalendar.test.ts`:

```ts
import { refreshAccessToken, fetchBusy, syncProviderCalendar } from '@/lib/googleCalendar'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    provider: { findUnique: jest.fn(), update: jest.fn() },
    blockedSlot: { deleteMany: jest.fn(), createMany: jest.fn() },
    $transaction: jest.fn(async (ops: unknown) =>
      typeof ops === 'function' ? (ops as (tx: unknown) => unknown)(prismaMock) : ops),
  },
}))
import { prisma } from '@/lib/prisma'
const prismaMock = prisma

describe('refreshAccessToken', () => {
  const realFetch = global.fetch
  afterEach(() => { global.fetch = realFetch })

  it('exchanges a refresh token for a new access token', async () => {
    process.env.GOOGLE_CLIENT_ID = 'cid'
    process.env.GOOGLE_CLIENT_SECRET = 'secret'
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'new-at', expires_in: 3600 }),
    }) as unknown as typeof fetch
    const before = Date.now()
    const out = await refreshAccessToken('rt-1')
    expect(out.accessToken).toBe('new-at')
    expect(out.expiresAt.getTime()).toBeGreaterThan(before)
  })

  it('throws on non-200', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 400, text: async () => 'bad' }) as unknown as typeof fetch
    await expect(refreshAccessToken('rt-1')).rejects.toThrow()
  })
})

describe('fetchBusy', () => {
  const realFetch = global.fetch
  afterEach(() => { global.fetch = realFetch })

  it('returns parsed busy intervals from the freebusy API', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        calendars: { primary: { busy: [{ start: '2026-06-10T09:00:00Z', end: '2026-06-10T10:00:00Z' }] } },
      }),
    }) as unknown as typeof fetch
    const out = await fetchBusy('at', new Date('2026-06-01T00:00:00Z'), new Date('2026-08-01T00:00:00Z'))
    expect(out).toEqual([{ start: new Date('2026-06-10T09:00:00Z'), end: new Date('2026-06-10T10:00:00Z') }])
  })
})

describe('syncProviderCalendar', () => {
  beforeEach(() => jest.clearAllMocks())

  it('refreshes when expired, replaces google blocks, sets syncedAt', async () => {
    ;(prisma.provider.findUnique as jest.Mock).mockResolvedValue({
      id: 'p1', googleRefreshToken: null, googleAccessToken: null, googleTokenExpiry: null,
    })
    ;(prisma.blockedSlot.deleteMany as jest.Mock).mockResolvedValue({ count: 2 })
    ;(prisma.blockedSlot.createMany as jest.Mock).mockResolvedValue({ count: 1 })
    ;(prisma.provider.update as jest.Mock).mockResolvedValue({})

    const deps = {
      refreshAccessToken: jest.fn().mockResolvedValue({ accessToken: 'fresh', expiresAt: new Date(Date.now() + 3600_000) }),
      fetchBusy: jest.fn().mockResolvedValue([
        { start: new Date(Date.now() + 2 * 86400000 + 9 * 3600000), end: new Date(Date.now() + 2 * 86400000 + 10 * 3600000) },
      ]),
    }
    // provide a decrypted refresh token so refresh path runs
    ;(prisma.provider.findUnique as jest.Mock).mockResolvedValue({
      id: 'p1', googleRefreshToken: 'enc-rt', googleAccessToken: null, googleTokenExpiry: null,
    })

    const res = await syncProviderCalendar('p1', deps as never)
    expect(deps.refreshAccessToken).toHaveBeenCalled()
    expect(prisma.blockedSlot.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ providerId: 'p1', reason: 'google-calendar' }) })
    )
    expect(prisma.blockedSlot.createMany).toHaveBeenCalled()
    expect(prisma.provider.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ googleSyncedAt: expect.any(Date) }) })
    )
    expect(res.blockCount).toBe(1)
  })

  it('throws when the provider has no refresh token', async () => {
    ;(prisma.provider.findUnique as jest.Mock).mockResolvedValue({
      id: 'p1', googleRefreshToken: null, googleAccessToken: null, googleTokenExpiry: null,
    })
    await expect(syncProviderCalendar('p1')).rejects.toThrow(/not connected/i)
  })
})
```

Note: the test mocks decryption indirectly — to keep it deterministic, the `syncProviderCalendar` implementation must `decrypt` tokens; set `process.env.ENCRYPTION_KEY` at the top of the test file and have the test store a real-encrypted refresh token. To avoid coupling, the simplest approach the implementation supports: `syncProviderCalendar` reads `googleRefreshToken`, and if it is non-null treats it as connected. For the "no refresh token" test it is null → throws. For the success test, set `googleRefreshToken: 'enc-rt'` and make the injected `deps.refreshAccessToken` ignore its argument (it is mocked), so the real `decrypt` is bypassed for the refresh call. Ensure `decrypt` of `'enc-rt'` is NOT invoked before the injected refresh: pass the raw stored value to `deps.refreshAccessToken` (which is mocked), so no real decryption runs. Implement accordingly (decrypt only the access token for the not-expired path; for the expired/refresh path pass the stored refresh token straight to `refreshAccessToken`, decrypting it first only in the real default dep). **Implementation guidance:** decrypt the refresh token before calling `refreshAccessToken`; in the test, `'enc-rt'` is not a valid `v1:` blob, so `decrypt` returns it unchanged (legacy passthrough) — no key needed. This keeps the test simple; add `process.env.ENCRYPTION_KEY = Buffer.alloc(32,3).toString('base64')` at the top of the test file anyway for safety.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/lib/googleCalendar.test.ts`
Expected: FAIL — `refreshAccessToken`/`fetchBusy`/`syncProviderCalendar` are not exported.

- [ ] **Step 3: Append the implementation to `lib/googleCalendar.ts`**

Add these imports at the TOP of `lib/googleCalendar.ts` (above the existing code):

```ts
import { prisma } from './prisma'
import { decrypt, encrypt } from './crypto'
```

Append at the END of `lib/googleCalendar.ts`:

```ts
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
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
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
      where: {
        providerId,
        reason: GOOGLE_BLOCK_REASON,
        date: { gte: windowStart, lte: windowEnd },
      },
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
```

Note for the implementer: the success test mocks `prisma.$transaction` to accept an array (the `[deleteMany, createMany]` form above) — keep the array form, not a callback. If the mock in the test uses the callback form, align the test to the array form actually implemented.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/lib/googleCalendar.test.ts`
Expected: PASS (all — 8 pure + the new network/sync tests). If the `$transaction` array-vs-callback mock mismatches, fix the TEST mock to: `$transaction: jest.fn().mockResolvedValue([{ count: 2 }, { count: 1 }])` and assert on the `deleteMany`/`createMany` mock calls directly (they are invoked to build the array).

- [ ] **Step 5: Commit**

```bash
git add lib/googleCalendar.ts __tests__/lib/googleCalendar.test.ts
git commit -m "feat: add Google token refresh, freebusy fetch, and calendar sync"
```

---

## Task 7: Sync API endpoint

**Files:**
- Create: `app/api/me/calendar/sync/route.ts`
- Test: `__tests__/api/calendar-sync.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/api/calendar-sync.test.ts`:

```ts
/**
 * @jest-environment node
 */
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('@/lib/auth', () => ({ authOptions: {} }))
jest.mock('@/lib/googleCalendar', () => ({ syncProviderCalendar: jest.fn() }))

import { POST } from '@/app/api/me/calendar/sync/route'
import { getServerSession } from 'next-auth'
import { syncProviderCalendar } from '@/lib/googleCalendar'

function req() {
  return new Request('http://localhost/api/me/calendar/sync', { method: 'POST' })
}

describe('POST /api/me/calendar/sync', () => {
  beforeEach(() => jest.clearAllMocks())

  it('401 when unauthenticated', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue(null)
    const res = await POST(req() as never)
    expect(res.status).toBe(401)
  })

  it('200 with syncedAt + blockCount on success', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'p1' } })
    ;(syncProviderCalendar as jest.Mock).mockResolvedValue({ syncedAt: new Date('2026-06-11T00:00:00Z'), blockCount: 3 })
    const res = await POST(req() as never)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.blockCount).toBe(3)
  })

  it('400 when not connected', async () => {
    ;(getServerSession as jest.Mock).mockResolvedValue({ user: { id: 'p1' } })
    ;(syncProviderCalendar as jest.Mock).mockRejectedValue(new Error('Google Calendar not connected'))
    const res = await POST(req() as never)
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/api/calendar-sync.test.ts`
Expected: FAIL — cannot find module the route.

- [ ] **Step 3: Write the route**

Create `app/api/me/calendar/sync/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { syncProviderCalendar } from '@/lib/googleCalendar'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const result = await syncProviderCalendar(session.user.id)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed'
    const notConnected = /not connected/i.test(message)
    return NextResponse.json(
      { error: notConnected ? 'Google Calendar not connected' : 'Calendar sync failed' },
      { status: notConnected ? 400 : 500 },
    )
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/api/calendar-sync.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add app/api/me/calendar/sync __tests__/api/calendar-sync.test.ts
git commit -m "feat: add POST /api/me/calendar/sync endpoint"
```

---

## Task 8: Settings UI + dashboard on-load sync

**Files:**
- Modify: `app/dashboard/settings/SettingsForm.tsx`
- Modify: `app/dashboard/settings/page.tsx` (pass google status props — read it first)
- Modify: `app/dashboard/DashboardClient.tsx`

UI verified by lint/tsc + manual smoke (full flow needs real Google credentials).

- [ ] **Step 1: Read the current settings page + form and dashboard client**

Run (read, don't edit yet):
```bash
sed -n '1,60p' app/dashboard/settings/page.tsx
sed -n '1,40p' app/dashboard/settings/SettingsForm.tsx
sed -n '1,40p' app/dashboard/DashboardClient.tsx
```
Confirm how the settings `page.tsx` loads the provider and passes props to `SettingsForm`, and how `DashboardClient` receives props. You will pass a `googleConnected: boolean` and `googleSyncedAt: string | null` into `SettingsForm`, sourced from the provider record the settings page already loads (add `googleId` / `googleSyncedAt` to its `select`/query).

- [ ] **Step 2: Add the Google Calendar section to `SettingsForm.tsx`**

Add a `googleConnected` + `googleSyncedAt` prop to the component's props interface, then add this self-contained section near the top or bottom of the rendered form (it manages its own state, so it does not interfere with the existing settings form submit):

```tsx
{googleConnected && (
  <section className="flex flex-col gap-2 border-t border-stone-200 pt-6">
    <h2 className="text-lg font-semibold">Google Calendar</h2>
    <p className="text-sm text-stone-500">
      {syncMessage ??
        (googleSyncedAt ? `Last synced ${new Date(googleSyncedAt).toLocaleString()}` : 'Not synced yet')}
    </p>
    <div>
      <Button
        type="button"
        variant="secondary"
        disabled={syncing}
        onClick={async () => {
          setSyncing(true); setSyncMessage(null)
          try {
            const res = await fetch('/api/me/calendar/sync', { method: 'POST' })
            const data = await res.json()
            setSyncMessage(res.ok ? `Synced — ${data.blockCount} blocked time(s).` : (data.error ?? 'Sync failed'))
          } catch {
            setSyncMessage('Network error during sync.')
          } finally {
            setSyncing(false)
          }
        }}
      >
        {syncing ? 'Syncing…' : 'Sync now'}
      </Button>
    </div>
  </section>
)}
```

Add the supporting state at the top of the component (with the other `useState` hooks):

```tsx
const [syncing, setSyncing] = useState(false)
const [syncMessage, setSyncMessage] = useState<string | null>(null)
```

Ensure `Button` is imported (it already is if the form uses it; otherwise add `import { Button } from '@/components/ui/Button'`). Ensure `useState` is imported.

- [ ] **Step 3: Pass the Google props from the settings page**

In `app/dashboard/settings/page.tsx`, add `googleId` and `googleSyncedAt` to the provider query `select` (if it uses one), and pass to `<SettingsForm ... googleConnected={!!provider.googleId} googleSyncedAt={provider.googleSyncedAt ? provider.googleSyncedAt.toISOString() : null} />`.

- [ ] **Step 4: Fire sync once on dashboard load (when connected)**

In `app/dashboard/DashboardClient.tsx`, add a one-shot effect. First confirm the component receives (or can receive) a `googleConnected` boolean prop from `app/dashboard/page.tsx` (add it to that page's provider query + prop pass-through, mirroring the settings change). Then add:

```tsx
import { useEffect, useRef } from 'react'

// inside the component:
const synced = useRef(false)
useEffect(() => {
  if (!googleConnected || synced.current) return
  synced.current = true
  fetch('/api/me/calendar/sync', { method: 'POST' }).catch(() => {})
}, [googleConnected])
```

(If `DashboardClient` is not currently passed provider data, thread a `googleConnected` boolean from `app/dashboard/page.tsx`, which already loads the session/provider.)

- [ ] **Step 5: Typecheck, lint, commit**

Run: `npx tsc --noEmit` and `npm run lint`
Expected: no new errors in the changed files.
Run: `npx jest`
Expected: full suite green.

```bash
git add app/dashboard/settings/SettingsForm.tsx app/dashboard/settings/page.tsx app/dashboard/DashboardClient.tsx app/dashboard/page.tsx
git commit -m "feat: settings Google Calendar sync UI + dashboard on-load sync"
```

---

## Self-Review Notes

- **Spec coverage:** sign-in provider + callbacks + link/create (Tasks 2–3); schema + token fields (Task 1); token encryption via `lib/crypto` (Tasks 2, 6); calendar scope at sign-in (Task 3 scope param); pure `busyToBlocks`/`isExpired` (Task 5); refresh + freebusy + idempotent apply with `google-calendar` reason tag in a transaction (Task 6); sync endpoint (Task 7); buttons gated by `NEXT_PUBLIC_GOOGLE_ENABLED` (Task 4); settings "Sync now" + dashboard on-load trigger (Task 8); env docs + dormant-when-unset (Tasks 3, 4). All spec sections map to a task.
- **Type/name consistency:** `upsertGoogleProvider` (Task 2) is called by `lib/auth.ts` (Task 3) with the same field names (`email`, `name`, `googleId`, `accessToken`, `refreshToken`, `expiresAtSec`). `busyToBlocks`/`isExpired`/`BusyInterval`/`BlockDescriptor` (Task 5) are used by `syncProviderCalendar` (Task 6). `syncProviderCalendar` (Task 6) is called by the sync route (Task 7) and returns `{ syncedAt, blockCount }`, which the route and the settings UI consume. The `google-calendar` reason string is identical in the apply and the (future) disconnect cleanup.
- **Dormancy:** with no Google env vars, `GoogleProvider` is unregistered (Task 3), buttons are hidden (Task 4), and the sync endpoint only ever runs for a connected provider (returns 400 otherwise) — the app is unchanged from today.
- **Known follow-up (not in v1):** a "Disconnect" button was in the spec's UI section; it is deferred — `syncProviderCalendar` and the schema support it, but the plan implements connect + sync + status only to keep v1 focused. Flag to the user.
