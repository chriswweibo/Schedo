# Google Sign-in (Providers) + Calendar Sync — Design

**Date:** 2026-06-11
**Status:** Approved (pending spec review)

## Problem

Providers can only sign in with email + password, and they must block out
busy times by hand. We want providers to (1) sign in with Google and (2) connect
their Google Calendar so existing calendar events automatically block out their
Schedo availability, so customers can't book over real commitments.

## Scope & Decisions

Settled during brainstorming:

- **Audience:** providers only. Customers continue to book as guests (no change).
- **Consent:** the Google calendar read scope is requested **at sign-in** (single
  consent screen), so a signed-in Google provider always has calendar access.
- **Sync model:** one-way **Google → Schedo**, materialised as `BlockedSlot`
  rows. Triggered **on dashboard load (once) and via a "Sync now" button** — no
  cron, no webhooks in v1.
- **Account linking:** a Google sign-in whose verified email matches an existing
  provider **links** to that provider (they can use either method afterward).
- **New users:** a first-time Google sign-in **auto-creates** a minimal provider
  (name + email from Google, `profession: 'Other'`, generated slug, no password),
  then lands on settings to finish their profile.
- **Build-now-creds-later:** all code ships now but stays dormant until
  `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are set.

## A. Auth / Sign-in (`lib/auth.ts`)

Register a second NextAuth provider (`GoogleProvider`) **only when** the Google
env vars are present (so the app is unchanged when they are not):

```
providers: [ CredentialsProvider({...}), ...(googleEnabled ? [GoogleProvider({...})] : []) ]
```

GoogleProvider authorization params:
- `access_type: 'offline'` and `prompt: 'consent'` — to reliably receive a
  **refresh token** (Google only returns it with offline+consent).
- `scope: 'openid email profile https://www.googleapis.com/auth/calendar.readonly'`.

Keep `session: { strategy: 'jwt' }`.

**`signIn` callback** (runs for `account?.provider === 'google'`):
1. Reject if the Google profile email is missing or `email_verified !== true`.
2. `findUnique({ where: { email } })`:
   - **Found** → update it: set `googleId`, encrypted `googleAccessToken` /
     `googleRefreshToken`, `googleTokenExpiry`.
   - **Not found** → `create` a minimal provider: `name` (Google name or email
     local-part), `email`, `profession: 'Other'`, generated unique `slug`,
     `passwordHash: null`, plus the Google fields above.
3. Return `true`. (Credentials sign-in path is unchanged.)

**`jwt` callback:** on the first call after sign-in (`account?.provider ===
'google'`), look up the provider by `profile.email` and set `token.id` /
`token.slug`. The credentials path keeps setting these from `authorize`'s `user`.
The rest of the app (which reads `session.user.id`) is unchanged.

**Refresh-token note:** Google omits the refresh token on subsequent logins
unless `prompt: 'consent'` is set; we set it, but the `signIn` handler also only
overwrites `googleRefreshToken` when a non-empty value is present, so a missing
refresh token never clobbers a stored one.

## B. Schema (`Provider`)

Additive migration:

```prisma
model Provider {
  // ...existing...
  passwordHash        String?   // was required; Google-only users have none
  googleId            String?   @unique
  googleAccessToken   String?   // encrypted at rest
  googleRefreshToken  String?   // encrypted at rest
  googleTokenExpiry   DateTime?
  googleSyncedAt      DateTime?
}
```

Making `passwordHash` optional is safe: the credentials `authorize` already
loads the provider and would simply have no hash to compare for Google-only
accounts (guard added: if `!provider.passwordHash` return null).

## C. Token storage / encryption

`googleAccessToken` and `googleRefreshToken` are encrypted with the existing
`lib/crypto` (`encrypt`/`decrypt`, AES-256-GCM, `v1:` format). Encryption is
applied **explicitly** at the few call sites (auth `signIn` write; calendar sync
read), **not** via the Prisma extension — the extension stays Booking-scoped to
keep its surface small and predictable. A thin `lib/googleTokens.ts` wraps
"store encrypted tokens for provider" and "load + decrypt tokens for provider".

## D. Calendar sync engine (`lib/googleCalendar.ts`)

Pure-ish, network calls isolated behind small functions:

- **`isExpired(expiry: Date | null, now): boolean`** — true if missing or in the
  past (with a small skew buffer).
- **`refreshAccessToken(refreshToken)`** — POST to
  `https://oauth2.googleapis.com/token` (grant `refresh_token`) using the env
  client id/secret; returns `{ accessToken, expiresAt }`. Network isolated, mocked
  in tests.
- **`fetchBusy(accessToken, timeMin, timeMax)`** — POST to the Calendar
  **freebusy** API for the primary calendar; returns busy intervals
  `{ start: Date, end: Date }[]`. Network isolated, mocked in tests.
- **`busyToBlocks(busy, window)`** — **pure**: maps busy intervals to
  `{ date, startTime, endTime }` block descriptors. Splits multi-day intervals
  per calendar date, clamps each day's portion to `HH:MM` within `00:00–24:00`,
  drops zero-length and out-of-window pieces. Unit-tested with no network.

**`syncProviderCalendar(providerId)`** orchestrates: load+decrypt tokens →
refresh if expired (persist new token) → `fetchBusy` over the window (now …
now+60 days) → `busyToBlocks` → **idempotent apply**:
1. `deleteMany` the provider's `BlockedSlot`s with `reason: 'google-calendar'`
   in the window.
2. `createMany` fresh blocks (each `reason: 'google-calendar'`).
3. Set `googleSyncedAt = now`.

The `'google-calendar'` reason tag distinguishes synced blocks from manual ones,
so re-syncing reflects calendar edits/deletions without touching manual blocks.

## E. Sync triggers & API

- **`POST /api/me/calendar/sync`** (provider-auth via `getServerSession`): runs
  `syncProviderCalendar(session.user.id)`; returns `{ syncedAt, blockCount }` or a
  clear error if the provider has no Google connection.
- **On dashboard load:** if the provider is Google-connected, the dashboard
  fires this once (client effect) so blocks stay current after login.
- **"Sync now"** button in settings calls the same endpoint.

## F. UI

- **`components/auth/GoogleButton.tsx`** — "Continue with Google"
  (`signIn('google')`), rendered on login + register pages **only when**
  `NEXT_PUBLIC_GOOGLE_ENABLED === 'true'`.
- **Settings — Google Calendar section:** connection status, `googleSyncedAt`
  ("Last synced …"), **"Sync now"**, and **Disconnect** (clears the Google
  fields and deletes `reason: 'google-calendar'` blocks).

## G. Env & build-now-creds-later

New env vars (documented in `.env.local.example` + `CLAUDE.md`):
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — server OAuth credentials.
- `NEXT_PUBLIC_GOOGLE_ENABLED` — `'true'` to render the Google buttons.

When the credentials are unset: `GoogleProvider` is not registered, the buttons
are hidden, and `/api/me/calendar/sync` returns a "Google not configured" 400.
Nothing else changes. Setting up the Google Cloud OAuth client (consent screen,
authorized redirect `/api/auth/callback/google`, enabling the Calendar API) is a
console task the user performs when they add the credentials.

## Error Handling

| Condition | Behavior |
|---|---|
| Google email not verified | `signIn` returns false → access denied |
| Refresh token exchange fails (revoked/expired) | Sync returns an error; settings shows "reconnect needed"; tokens left as-is |
| `fetchBusy` non-200 | Sync errors out; existing blocks untouched (delete+recreate is one logical step — see note) |
| Google not configured | Buttons hidden; sync endpoint 400 |
| Provider has no Google tokens | Sync endpoint returns 400 "not connected" |

**Apply atomicity:** the delete-then-`createMany` runs inside a
`prisma.$transaction` so a mid-sync failure can't leave the provider with no
blocks. `fetchBusy` is called and validated **before** the transaction opens.

## Testing

Unit tests (mock `fetch` / `@/lib/prisma`; live Google never hit):
- `busyToBlocks`: single interval → blocks; multi-day split; clamping to day
  bounds; out-of-window dropped; zero-length dropped.
- `isExpired`: null, past, future (+skew).
- `refreshAccessToken`: parses Google token response; throws on non-200 (mocked
  `fetch`).
- `signIn` google branch: links existing provider by email; creates minimal
  provider when none; rejects unverified email (mocked prisma + crypto).
- `syncProviderCalendar` apply: deletes prior `google-calendar` blocks and
  creates new ones in a transaction (mocked prisma); no-op-safe.
- `POST /api/me/calendar/sync`: 401 unauthenticated; 400 when not connected; 200
  with `{ syncedAt, blockCount }` on success (mocked sync).

Manual smoke is only possible once real credentials exist; until then the dormant
paths are covered by the "Google not configured" tests.

## Out of Scope / Non-Goals

- Customer Google login (guests stay accountless).
- Two-way sync (Schedo → Google) or creating Google events from bookings.
- Real-time webhooks / push channels and background cron sync.
- Multiple/secondary calendars (primary calendar only).
- Importing event titles/details — only busy time ranges are read.

## Open Questions

- **Branch base:** calendar sync encrypts OAuth tokens with `lib/crypto`, which
  currently lives only on `feature/pii-encryption` (not yet merged to `master`).
  This branch should therefore be cut from `feature/pii-encryption` (or from
  `master` after encryption merges). Decide at implementation time.
- **`passwordHash` optional vs. blocked credentials:** making it optional means
  the credentials `authorize` must guard `!provider.passwordHash`. Confirmed in
  section B; no further question.
