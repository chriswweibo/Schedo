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
