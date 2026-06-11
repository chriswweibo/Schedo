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
        async $allOperations({ operation, args, query }: { operation: string; args: unknown; query: (a: unknown) => Promise<unknown> }) {
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
