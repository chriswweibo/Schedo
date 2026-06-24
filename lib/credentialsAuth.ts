import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

export interface AuthedProvider {
  id: string
  email: string
  name: string
  slug: string
}

/**
 * Verify a provider's email + password. Returns the minimal user object on
 * success, or null when the provider does not exist, has no password (Google-only
 * account), or the password is wrong.
 */
export async function verifyProviderCredentials(
  email: string,
  password: string,
): Promise<AuthedProvider | null> {
  const provider = await prisma.provider.findUnique({ where: { email } })
  if (!provider || !provider.passwordHash) return null
  const valid = await bcrypt.compare(password, provider.passwordHash)
  if (!valid) return null
  return { id: provider.id, email: provider.email, name: provider.name, slug: provider.slug }
}
