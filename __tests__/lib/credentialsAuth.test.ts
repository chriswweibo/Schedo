/**
 * @jest-environment node
 */
jest.mock('@/lib/prisma', () => ({
  prisma: { provider: { findUnique: jest.fn() } },
}))
jest.mock('bcryptjs', () => ({ __esModule: true, default: { compare: jest.fn() } }))
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { verifyProviderCredentials } from '@/lib/credentialsAuth'

describe('verifyProviderCredentials', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns null and never checks the password for a google-only provider (no passwordHash)', async () => {
    ;(prisma.provider.findUnique as jest.Mock).mockResolvedValue({
      id: 'p1', email: 'g@x.com', passwordHash: null, name: 'G', slug: 'g',
    })
    const result = await verifyProviderCredentials('g@x.com', 'whatever')
    expect(result).toBeNull()
    expect(bcrypt.compare).not.toHaveBeenCalled()
  })

  it('returns null when the provider does not exist', async () => {
    ;(prisma.provider.findUnique as jest.Mock).mockResolvedValue(null)
    expect(await verifyProviderCredentials('nobody@x.com', 'pw')).toBeNull()
  })

  it('returns null on a wrong password', async () => {
    ;(prisma.provider.findUnique as jest.Mock).mockResolvedValue({
      id: 'p1', email: 'a@x.com', passwordHash: 'hash', name: 'A', slug: 'a',
    })
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)
    expect(await verifyProviderCredentials('a@x.com', 'bad')).toBeNull()
  })

  it('returns the minimal user object on a valid password', async () => {
    ;(prisma.provider.findUnique as jest.Mock).mockResolvedValue({
      id: 'p1', email: 'a@x.com', passwordHash: 'hash', name: 'A', slug: 'a',
    })
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
    const result = await verifyProviderCredentials('a@x.com', 'pw')
    expect(result).toEqual({ id: 'p1', email: 'a@x.com', name: 'A', slug: 'a' })
  })
})
