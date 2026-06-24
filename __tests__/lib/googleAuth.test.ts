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
