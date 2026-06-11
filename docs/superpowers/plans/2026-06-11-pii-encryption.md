# Guest PII Encryption at Rest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Encrypt the four guest PII fields on `Booking` (`guestName`, `guestEmail`, `guestPhone`, `notes`) at rest with AES-256-GCM, transparently to the rest of the app.

**Architecture:** A small pure crypto module (`lib/crypto.ts`) provides versioned AES-256-GCM `encrypt`/`decrypt`. A booking-aware transform module (`lib/bookingCrypto.ts`) seals/opens just the 4 fields. A Prisma client extension in `lib/prisma.ts` applies those transforms on every `Booking` write/read, so routes/emails/UI keep using plaintext. A one-time script encrypts existing rows. Legacy (non-prefixed) values pass through `decrypt` unchanged, making rollout and migration safe.

**Tech Stack:** Node `crypto` (AES-256-GCM), Prisma 7.8 client extensions (`$extends`), `@prisma/adapter-pg`, Jest (node env), tsx.

**Spec:** `docs/superpowers/specs/2026-06-11-pii-encryption-design.md`

---

## File Structure

- `lib/crypto.ts` — pure `encrypt(text)` / `decrypt(blob)`, versioned `v1:` format, legacy passthrough (create).
- `lib/bookingCrypto.ts` — `BOOKING_PII_FIELDS`, `sealBookingData(data)`, `openBookingResult(result)` (create).
- `lib/prisma.ts` — wrap the client with a `$extends` `booking` query override using the two transforms (modify).
- `prisma/encrypt-existing-bookings.ts` — one-time migration over existing rows via raw `pg` (create).
- `.env.local` (local only, gitignored) — add `ENCRYPTION_KEY`.
- `.env.local.example`, `CLAUDE.md` — document `ENCRYPTION_KEY` (modify).
- `__tests__/lib/crypto.test.ts`, `__tests__/lib/bookingCrypto.test.ts` — unit tests (create).

---

## Task 1: Core crypto module

**Files:**
- Create: `lib/crypto.ts`
- Test: `__tests__/lib/crypto.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/crypto.test.ts`:

```ts
/**
 * @jest-environment node
 */
process.env.ENCRYPTION_KEY = Buffer.alloc(32, 1).toString('base64')
import { encrypt, decrypt } from '@/lib/crypto'

describe('crypto', () => {
  it('round-trips a value', () => {
    const blob = encrypt('alice@example.com')!
    expect(decrypt(blob)).toBe('alice@example.com')
  })

  it('produces a v1: prefixed blob', () => {
    expect(encrypt('hello')!.startsWith('v1:')).toBe(true)
  })

  it('uses a unique IV each call (ciphertext differs, both decrypt back)', () => {
    const a = encrypt('same')!
    const b = encrypt('same')!
    expect(a).not.toBe(b)
    expect(decrypt(a)).toBe('same')
    expect(decrypt(b)).toBe('same')
  })

  it('throws when a v1 blob is tampered', () => {
    const blob = encrypt('secret')!
    // flip a char in the base64 payload (after the "v1:" prefix)
    const tampered = 'v1:' + (blob[3] === 'A' ? 'B' : 'A') + blob.slice(4)
    expect(() => decrypt(tampered)).toThrow()
  })

  it('passes through legacy (non-prefixed) plaintext on decrypt', () => {
    expect(decrypt('plain-legacy-value')).toBe('plain-legacy-value')
  })

  it('passes through null and empty string', () => {
    expect(encrypt(null)).toBeNull()
    expect(encrypt('')).toBe('')
    expect(decrypt(null)).toBeNull()
  })

  it('throws on encrypt when ENCRYPTION_KEY is missing', () => {
    const saved = process.env.ENCRYPTION_KEY
    delete process.env.ENCRYPTION_KEY
    try {
      expect(() => encrypt('x')).toThrow()
    } finally {
      process.env.ENCRYPTION_KEY = saved
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/lib/crypto.test.ts`
Expected: FAIL — cannot find module `@/lib/crypto`.

- [ ] **Step 3: Write the implementation**

Create `lib/crypto.ts`:

```ts
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const CURRENT_VERSION = 'v1'
const PREFIX_RE = /^v(\d+):/
const IV_LEN = 12
const TAG_LEN = 16

function keyForVersion(version: string): Buffer {
  if (version === 'v1') {
    const b64 = process.env.ENCRYPTION_KEY
    if (!b64) throw new Error('ENCRYPTION_KEY is not set')
    const key = Buffer.from(b64, 'base64')
    if (key.length !== 32) {
      throw new Error('ENCRYPTION_KEY must decode to 32 bytes (base64)')
    }
    return key
  }
  throw new Error(`Unknown encryption key version: ${version}`)
}

export function encrypt(plaintext: string | null): string | null {
  if (plaintext === null || plaintext === '') return plaintext
  const key = keyForVersion(CURRENT_VERSION)
  const iv = randomBytes(IV_LEN)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  const payload = Buffer.concat([iv, tag, ct]).toString('base64')
  return `${CURRENT_VERSION}:${payload}`
}

export function decrypt(blob: string | null): string | null {
  if (blob === null) return null
  const m = blob.match(PREFIX_RE)
  if (!m) return blob // legacy plaintext — pass through unchanged
  const version = `v${m[1]}`
  const key = keyForVersion(version)
  const raw = Buffer.from(blob.slice(m[0].length), 'base64')
  const iv = raw.subarray(0, IV_LEN)
  const tag = raw.subarray(IV_LEN, IV_LEN + TAG_LEN)
  const ct = raw.subarray(IV_LEN + TAG_LEN)
  const decipher = createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/lib/crypto.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/crypto.ts __tests__/lib/crypto.test.ts
git commit -m "feat: add versioned AES-256-GCM crypto module"
```
(End the commit message with the trailer `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.)

---

## Task 2: Generate the key and document the env var

**Files:**
- Modify (local, gitignored): `.env.local`
- Modify: `.env.local.example`, `CLAUDE.md`

No automated test (config/secret task).

- [ ] **Step 1: Generate a key into `.env.local`**

Run this Node snippet, then append the printed line to `.env.local` (do NOT commit `.env.local` — it is gitignored):

```bash
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('base64'))"
```

Append the output as a new line in `.env.local`. Verify it is present:

```bash
node -e "require('dotenv').config({path:'.env.local'}); const k=Buffer.from(process.env.ENCRYPTION_KEY||'','base64'); console.log('key bytes:', k.length)"
```
Expected: `key bytes: 32`.

- [ ] **Step 2: Document in `.env.local.example`**

Add to `.env.local.example`:

```
# Base64-encoded 32-byte key for encrypting guest PII at rest (AES-256-GCM).
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# Rotating this key loses access to data encrypted under the old key unless that data is re-encrypted.
ENCRYPTION_KEY=
```

- [ ] **Step 3: Document in `CLAUDE.md`**

In `CLAUDE.md`'s "Environment Variables" required-keys list, add:

```
- `ENCRYPTION_KEY` — base64 32-byte key used to encrypt guest PII (`Booking.guestName/guestEmail/guestPhone/notes`) at rest via AES-256-GCM. If unset, the app throws when writing guest PII (it will not silently store plaintext).
```

- [ ] **Step 4: Commit (example + docs only)**

```bash
git add .env.local.example CLAUDE.md
git commit -m "docs: document ENCRYPTION_KEY env var"
```
(End with the `Co-Authored-By` trailer. Do NOT `git add .env.local`.)

---

## Task 3: Booking-aware transforms

**Files:**
- Create: `lib/bookingCrypto.ts`
- Test: `__tests__/lib/bookingCrypto.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/lib/bookingCrypto.test.ts`:

```ts
/**
 * @jest-environment node
 */
process.env.ENCRYPTION_KEY = Buffer.alloc(32, 2).toString('base64')
import { sealBookingData, openBookingResult, BOOKING_PII_FIELDS } from '@/lib/bookingCrypto'
import { decrypt } from '@/lib/crypto'

describe('bookingCrypto', () => {
  it('encrypts only the PII fields in place, leaving others untouched', () => {
    const data: Record<string, unknown> = {
      guestName: 'Alice', guestEmail: 'a@x.com', guestPhone: '123', notes: 'hi',
      providerId: 'p1', startTime: '10:00',
    }
    sealBookingData(data)
    for (const f of BOOKING_PII_FIELDS) {
      expect(typeof data[f]).toBe('string')
      expect((data[f] as string).startsWith('v1:')).toBe(true)
    }
    expect(data.providerId).toBe('p1')
    expect(data.startTime).toBe('10:00')
  })

  it('skips missing and non-string PII fields', () => {
    const data: Record<string, unknown> = { guestName: 'Bob', guestPhone: null }
    sealBookingData(data)
    expect((data.guestName as string).startsWith('v1:')).toBe(true)
    expect(data.guestPhone).toBeNull()
    expect('guestEmail' in data).toBe(false)
  })

  it('seals each element of an array (createMany)', () => {
    const arr: Record<string, unknown>[] = [{ guestName: 'A' }, { guestName: 'B' }]
    sealBookingData(arr)
    expect((arr[0].guestName as string).startsWith('v1:')).toBe(true)
    expect((arr[1].guestName as string).startsWith('v1:')).toBe(true)
  })

  it('round-trips: openBookingResult decrypts a single sealed row', () => {
    const row: Record<string, unknown> = { guestEmail: 'a@x.com', notes: 'n', id: 'b1' }
    sealBookingData(row)
    const opened = openBookingResult(row)
    expect(opened.guestEmail).toBe('a@x.com')
    expect(opened.notes).toBe('n')
    expect(opened.id).toBe('b1')
  })

  it('openBookingResult decrypts each row of an array', () => {
    const rows: Record<string, unknown>[] = [{ guestName: 'A' }, { guestName: 'B' }]
    sealBookingData(rows)
    const opened = openBookingResult(rows)
    expect(opened[0].guestName).toBe('A')
    expect(opened[1].guestName).toBe('B')
  })

  it('openBookingResult passes through null', () => {
    expect(openBookingResult(null)).toBeNull()
  })

  it('leaves a legacy plaintext row readable (decrypt passthrough)', () => {
    const row = { guestName: 'legacy-plain' }
    expect(openBookingResult(row).guestName).toBe('legacy-plain')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/lib/bookingCrypto.test.ts`
Expected: FAIL — cannot find module `@/lib/bookingCrypto`.

- [ ] **Step 3: Write the implementation**

Create `lib/bookingCrypto.ts`:

```ts
import { encrypt, decrypt } from './crypto'

export const BOOKING_PII_FIELDS = ['guestName', 'guestEmail', 'guestPhone', 'notes'] as const

/**
 * Encrypt the booking PII fields in place on a write payload.
 * Accepts a single data object or an array (createMany). No-op for non-objects.
 */
export function sealBookingData(data: unknown): void {
  if (Array.isArray(data)) {
    for (const item of data) sealBookingData(item)
    return
  }
  if (!data || typeof data !== 'object') return
  const rec = data as Record<string, unknown>
  for (const f of BOOKING_PII_FIELDS) {
    if (typeof rec[f] === 'string') rec[f] = encrypt(rec[f] as string)
  }
}

/**
 * Decrypt the booking PII fields on a query result (single row, array of rows,
 * or null). Returns the same value for non-objects. Mutates row objects in place
 * and returns the result for convenience.
 */
export function openBookingResult<T>(result: T): T {
  if (Array.isArray(result)) {
    return result.map((r) => openBookingResult(r)) as unknown as T
  }
  if (result && typeof result === 'object') {
    const rec = result as Record<string, unknown>
    for (const f of BOOKING_PII_FIELDS) {
      if (typeof rec[f] === 'string') rec[f] = decrypt(rec[f] as string)
    }
  }
  return result
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/lib/bookingCrypto.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/bookingCrypto.ts __tests__/lib/bookingCrypto.test.ts
git commit -m "feat: add booking PII seal/open transforms"
```
(End with the `Co-Authored-By` trailer.)

---

## Task 4: Wire the Prisma client extension

**Files:**
- Modify: `lib/prisma.ts`

Verified by `npx tsc --noEmit`, the existing suite staying green, and a manual smoke (this layer needs a real DB; the unit logic is already covered by Task 3).

- [ ] **Step 1: Replace `lib/prisma.ts` with the extended client**

The current file is:

```ts
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createClient() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

export const prisma = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

Replace its entire contents with:

```ts
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { sealBookingData, openBookingResult } from './bookingCrypto'

const ENCRYPT_DECRYPT_OPS = [
  'findUnique', 'findUniqueOrThrow', 'findFirst', 'findFirstOrThrow', 'findMany',
  'create', 'update', 'upsert',
]

function createClient() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter }).$extends({
    query: {
      booking: {
        async $allOperations({ operation, args, query }) {
          const a = args as Record<string, unknown>
          if (operation === 'create' || operation === 'update' ||
              operation === 'createMany' || operation === 'updateMany') {
            sealBookingData(a.data)
          } else if (operation === 'upsert') {
            sealBookingData(a.create)
            sealBookingData(a.update)
          }
          const result = await query(args)
          return ENCRYPT_DECRYPT_OPS.includes(operation)
            ? openBookingResult(result)
            : result
        },
      },
    },
  })
}

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createClient>
}

export const prisma = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

Notes for the implementer:
- `$allOperations` is a valid Prisma client-extension hook that intercepts every operation on the `booking` model. `args`/`query` are passed through; we only mutate `data`/`create`/`update` on writes and transform the returned rows.
- `findMany`/`findFirst` results are decrypted; `count`, `aggregate`, `delete`, `deleteMany`, `createMany`/`updateMany` (which return batch payloads, not PII rows) are left alone.
- `create`/`update`/`upsert` return the affected row(s); we decrypt those so callers (e.g. the POST route returning the created booking as JSON) get plaintext back, not the ciphertext we just stored.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no NEW errors in `lib/prisma.ts`. (Pre-existing errors in `prisma/seed-bookings.ts` and `prisma/seed.ts` are unrelated and remain.) If the `$allOperations` callback parameters report an implicit-any error, annotate the destructured param as `({ operation, args, query }: { operation: string; args: unknown; query: (a: unknown) => Promise<unknown> })` and cast `query(args as never)`.

- [ ] **Step 3: Run the full suite**

Run: `npx jest`
Expected: all suites PASS (route tests mock `@/lib/prisma`, so the extension is not exercised and nothing breaks).

- [ ] **Step 4: Manual smoke (real DB)**

Ensure `ENCRYPTION_KEY` is in `.env.local` (Task 2). Start the dev server if needed (`npm run dev`). Create a booking through the API against a real provider/slot (or reuse the smoke approach from prior work), then:

- Read the stored row directly with raw SQL (bypasses the extension) and confirm the guest fields are ciphertext:
  ```bash
  node -e "require('dotenv').config({path:'.env.local'}); const {Pool}=require('pg'); const p=new Pool({connectionString:process.env.DATABASE_URL}); p.query('SELECT \"guestEmail\",\"guestName\" FROM \"Booking\" ORDER BY \"createdAt\" DESC LIMIT 1').then(r=>{console.log(r.rows[0]); return p.end()})"
  ```
  Expected: `guestEmail` / `guestName` start with `v1:`.
- Load that booking's manage page (`/booking/manage/<token>`) or fetch a read path and confirm the guest details render as **plaintext** (proving the read path decrypts).

Report the raw-SQL output (must show `v1:`) and the read-path result (must show plaintext).

- [ ] **Step 5: Commit**

```bash
git add lib/prisma.ts
git commit -m "feat: transparently encrypt/decrypt Booking PII via Prisma extension"
```
(End with the `Co-Authored-By` trailer.)

---

## Task 5: Encrypt existing rows

**Files:**
- Create: `prisma/encrypt-existing-bookings.ts`

- [ ] **Step 1: Write the migration script**

Create `prisma/encrypt-existing-bookings.ts`:

```ts
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()

import { Pool } from 'pg'
import { encrypt } from '../lib/crypto'

const FIELDS = ['guestName', 'guestEmail', 'guestPhone', 'notes'] as const
const VERSIONED = /^v\d+:/

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  const { rows } = await pool.query(
    'SELECT id, "guestName", "guestEmail", "guestPhone", "notes" FROM "Booking"'
  )
  let updated = 0
  for (const row of rows) {
    const next: Record<string, string | null> = {}
    let changed = false
    for (const f of FIELDS) {
      const v = row[f]
      if (typeof v === 'string' && v !== '' && !VERSIONED.test(v)) {
        next[f] = encrypt(v)
        changed = true
      } else {
        next[f] = v
      }
    }
    if (changed) {
      await pool.query(
        'UPDATE "Booking" SET "guestName"=$1, "guestEmail"=$2, "guestPhone"=$3, "notes"=$4 WHERE id=$5',
        [next.guestName, next.guestEmail, next.guestPhone, next.notes, row.id]
      )
      updated++
    }
  }
  console.log(`Encrypted ${updated} booking(s)`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await pool.end() })
```

- [ ] **Step 2: Run it**

Run: `npx tsx prisma/encrypt-existing-bookings.ts`
Expected: prints `Encrypted N booking(s)` and exits 0. (N is the count of rows that still had plaintext — likely ~10k on first run.)

- [ ] **Step 3: Verify idempotency**

Run it again: `npx tsx prisma/encrypt-existing-bookings.ts`
Expected: `Encrypted 0 booking(s)` (everything is already `v1:`-prefixed).

- [ ] **Step 4: Spot-check**

```bash
node -e "require('dotenv').config({path:'.env.local'}); const {Pool}=require('pg'); const p=new Pool({connectionString:process.env.DATABASE_URL}); p.query('SELECT count(*)::int AS total, count(*) FILTER (WHERE \"guestEmail\" LIKE \'v1:%\')::int AS enc FROM \"Booking\"').then(r=>{console.log(r.rows[0]); return p.end()})"
```
Expected: `enc` equals `total` (every row's `guestEmail` is encrypted).

- [ ] **Step 5: Commit**

```bash
git add prisma/encrypt-existing-bookings.ts
git commit -m "feat: one-time script to encrypt existing booking PII"
```
(End with the `Co-Authored-By` trailer.)

---

## Self-Review Notes

- **Spec coverage:** core crypto + versioned format + legacy passthrough (Task 1); key + env docs (Task 2); booking transforms (Task 3); transparent Prisma extension covering create/update/upsert/createMany/updateMany writes and find*/create/update/upsert reads (Task 4); one-time migration via raw pg (Task 5). All spec sections map to a task.
- **Type/name consistency:** `encrypt`/`decrypt` (Task 1) are imported by `bookingCrypto.ts` (Task 3) and the migration (Task 5). `sealBookingData`/`openBookingResult`/`BOOKING_PII_FIELDS` (Task 3) are imported by `lib/prisma.ts` (Task 4). The `v1:` prefix and base64(`iv‖tag‖ciphertext`) layout are identical across `crypto.ts`, the migration's `VERSIONED` regex, and the smoke checks.
- **Error handling:** `encrypt` throws on missing key (Task 1 test covers it); `decrypt` throws on tamper, passes through legacy plaintext; the extension never swallows these — a corrupt row surfaces as a 500 rather than silent data loss.
- **Test reach:** the pure logic (crypto + transforms) is fully unit-tested without a DB; the thin extension wiring is verified by tsc + the existing green suite + a manual DB smoke, since route tests mock `@/lib/prisma`.
