# Guest PII Encryption at Rest — Design

**Date:** 2026-06-11
**Status:** Approved (pending spec review)

## Problem

Guest personal data on `Booking` (`guestName`, `guestEmail`, `guestPhone`, `notes`)
is stored in plaintext in PostgreSQL. Anyone with read access to the database
(backup, console, compromised credentials) sees customer PII directly. We want
this data encrypted at rest, transparently to the rest of the app.

## Scope & Decisions

Settled during brainstorming:

- **Fields encrypted:** `Booking.guestName`, `Booking.guestEmail`,
  `Booking.guestPhone`, `Booking.notes` — and only these. They are customer PII
  and are never used in a DB `WHERE` clause.
- **Explicitly NOT encrypted:**
  - `Provider.email` — it is the login identifier
    (`findUnique({ where: { email }})` in `lib/auth.ts`) and the registration
    uniqueness key; random-IV encryption would break both. Left plaintext.
  - `Provider.name` / `bio` / `lat` / `lng` — public data (profiles, search,
    map). Name search is already done in-process after load, not in SQL.
  - There is no stored raw address field (only geocoded `lat`/`lng`).
- **Algorithm:** AES-256-GCM (authenticated encryption).
- **Key management:** a 32-byte master key in env (`ENCRYPTION_KEY`), with a
  key-version prefix on every ciphertext so keys can be rotated later without a
  flag day.
- **Mechanism:** a transparent Prisma client extension (not scattered explicit
  calls), so every current and future `Booking` access is covered and a
  forgotten decrypt cannot leak ciphertext to a user.

## Why a Prisma extension (not explicit helpers)

Explicit `seal()`/`open()` helpers at each call site rely on every developer
remembering to call them; a new read path that forgets `open()` would render
ciphertext to a user, and a new write path that forgets `seal()` would store
plaintext. A `$extends` query override centralizes encryption at the data
boundary so coverage is automatic. Cost: the extension must handle every query
shape (arrays, single rows, `select` subsets, nulls) — addressed below.

## Components

### 1. Core crypto — `lib/crypto.ts`

Pure module, no Prisma/Next dependencies.

- `encrypt(plaintext: string | null): string | null`
  - `null` / empty string → returned unchanged.
  - Otherwise: generate a random 12-byte IV, AES-256-GCM encrypt with the
    current key, output `v1:` + base64(`iv ‖ authTag ‖ ciphertext`).
  - If `ENCRYPTION_KEY` is missing/invalid → **throw** (never silently store
    plaintext that callers believe is encrypted).
- `decrypt(blob: string | null): string | null`
  - `null` → `null`.
  - If `blob` starts with a recognized version prefix (`v1:`): parse, select the
    key for that version, AES-256-GCM decrypt, verify the auth tag. Tamper or
    wrong key → **throw**.
  - **Legacy passthrough:** if `blob` has no recognized `vN:` prefix, treat it as
    pre-existing plaintext and return it unchanged. This keeps rollout and the
    data migration safe (rows not yet migrated still read correctly).
- Key handling: `ENCRYPTION_KEY` is a base64-encoded 32-byte key. Internally a
  `Record<version, Buffer>` keeps the current key under `v1` and leaves room for
  additional versions during rotation; `encrypt` always uses the newest version.

**Format rationale:** the `vN:` prefix is the rotation hook — when a key rotates,
add `v2` with the new key, `encrypt` switches to `v2`, and `decrypt` still reads
`v1` blobs until they are re-encrypted.

### 2. Transparent layer — `lib/prisma.ts`

Wrap the existing client with `.$extends({ query: { booking: { ... } } })`,
scoped to the `booking` model and the 4 PII fields
(`PII_FIELDS = ['guestName', 'guestEmail', 'guestPhone', 'notes']`).

- **Write methods** (`create`, `update`, `upsert`, `createMany`, `updateMany`):
  before `query(args)`, walk `args.data` (and `upsert`'s `create`/`update`) and
  `encrypt` each PII field that is present and a string. Fields omitted from
  `data` are left alone.
- **Read methods** (`findUnique`, `findUniqueOrThrow`, `findFirst`,
  `findFirstOrThrow`, `findMany`): after `query(args)`, walk the result(s) and
  `decrypt` each PII field present on the row. Handles a single object, an array,
  and `null` (no match). `select` subsets that omit a field are fine (decrypt
  only present keys).
- A shared `encryptData(obj)` / `decryptRow(row)` helper keeps the two paths DRY.

The `globalForPrisma` singleton pattern is preserved; the extension is applied
once when the client is created.

### 3. Data migration — `prisma/encrypt-existing-bookings.ts`

One-time script, run via `npx tsx`. Mirrors `prisma/seed.ts`'s dotenv + adapter
setup but uses a **raw `pg` `Pool`** (NOT the extended Prisma client) so it reads
the true stored bytes and writes ciphertext exactly once:

- Select `id, guestName, guestEmail, guestPhone, notes` for all bookings.
- For each field, if the value is non-null and does **not** already start with a
  `vN:` prefix, `encrypt` it (importing `encrypt` from `lib/crypto.ts`).
- `UPDATE` the row with the new values (parameterized).
- Idempotent: re-running skips already-`v1:` values, so a partial run can be
  safely resumed.
- Prints a count of rows updated.

### 4. Key setup

- Generate a 32-byte random key, base64-encoded, written to `.env.local` as
  `ENCRYPTION_KEY`.
- Add `ENCRYPTION_KEY=` to `.env.local.example` with a comment: "base64 32-byte
  key; rotating it loses access to data encrypted under the old key unless that
  data is re-encrypted."
- Document `ENCRYPTION_KEY` in `CLAUDE.md`'s Environment Variables section.

## Data Flow

```
write: route → prisma.booking.create({ data: { guestEmail, ... } })
              → [extension] encrypt PII fields → stored as "v1:…" blobs

read:  route → prisma.booking.findUnique(...)
              → [extension] decrypt PII fields → route/UI/email see plaintext
```

Nothing in the routes, emails, dashboard, or manage page changes — they continue
to read and write plaintext through Prisma.

## Rollout / Migration Order

1. Add `ENCRYPTION_KEY` to the environment.
2. Ship `lib/crypto.ts` + the extension. New bookings are encrypted immediately;
   existing plaintext rows still read correctly via legacy passthrough.
3. Run `encrypt-existing-bookings.ts` to encrypt the ~10k existing rows.
4. After migration every row is `v1:`-prefixed; legacy passthrough then only
   matters as a safety net.

## Error Handling

| Condition | Behavior |
|---|---|
| `ENCRYPTION_KEY` missing/invalid on encrypt | Throw (fail fast; never store fake-encrypted plaintext) |
| Decrypt of a `vN:` blob with wrong key / tampered | Throw (surface corruption) |
| Decrypt of non-prefixed value (legacy plaintext) | Return as-is |
| `null` / empty field | Pass through unchanged |

## Testing

`__tests__/lib/crypto.test.ts` (`@jest-environment node`), setting a known
`ENCRYPTION_KEY` in the test:

- round-trip: `decrypt(encrypt(x)) === x`
- unique IV: two `encrypt(x)` calls produce different blobs, both decrypt to `x`
- output format: ciphertext starts with `v1:`
- tamper detection: flipping a byte of the base64 payload makes `decrypt` throw
- version/legacy: a plain string without a `vN:` prefix passes through `decrypt`
  unchanged
- null/empty passthrough
- missing key: `encrypt` throws when `ENCRYPTION_KEY` is unset

Existing route tests mock `@/lib/prisma`, so they neither exercise nor are broken
by the extension; they stay green. A short manual smoke (create a booking, read
the row directly in SQL to confirm `v1:` ciphertext, load the manage page to
confirm it shows plaintext) verifies the extension end-to-end.

## Out of Scope / Non-Goals

- Encrypting provider email, name, bio, or location.
- Searchable encryption / blind indexes (not needed — encrypted fields are never
  queried).
- External KMS (env key is sufficient for current scale; the version prefix
  leaves the door open).
- Encrypting historical data in backups already taken.

## Open Questions

- **Branch base:** this work touches `Booking`, as does the in-review
  `feature/guest-booking-management` branch (which added `manageToken`). The two
  do not conflict logically, but to avoid schema-history divergence the
  encryption branch should be cut from `master` after booking-management merges,
  or rebased onto it. Decide at implementation time.
