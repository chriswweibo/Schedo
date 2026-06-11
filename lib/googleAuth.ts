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
