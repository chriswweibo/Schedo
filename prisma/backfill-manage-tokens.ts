import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
dotenv.config()

import { randomBytes } from 'crypto'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

async function main() {
  const rows = await prisma.booking.findMany({
    where: { manageToken: null },
    select: { id: true },
  })
  for (const { id } of rows) {
    await prisma.booking.update({
      where: { id },
      data: { manageToken: randomBytes(24).toString('hex') },
    })
  }
  console.log(`Backfilled ${rows.length} booking(s) with manageToken`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect(); await pool.end() })
