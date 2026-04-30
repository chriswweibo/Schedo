/**
 * @jest-environment node
 */
import { POST } from '@/app/api/providers/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/prisma', () => ({
  prisma: {
    provider: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'

describe('POST /api/providers', () => {
  beforeEach(() => jest.clearAllMocks())

  it('creates a provider and returns 201', async () => {
    ;(prisma.provider.findUnique as jest.Mock).mockResolvedValue(null)
    ;(prisma.provider.create as jest.Mock).mockResolvedValue({
      id: 'p1',
      name: 'Jane Smith',
      slug: 'jane-smith-abc12',
      email: 'jane@example.com',
      profession: 'Plumber',
    })

    const req = new NextRequest('http://localhost/api/providers', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Jane Smith',
        email: 'jane@example.com',
        password: 'secret1234',
        profession: 'Plumber',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const data = await res.json()
    expect(data.slug).toBeDefined()
  })

  it('returns 409 when email already taken', async () => {
    ;(prisma.provider.findUnique as jest.Mock).mockResolvedValue({ id: 'existing' })

    const req = new NextRequest('http://localhost/api/providers', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Jane Smith',
        email: 'taken@example.com',
        password: 'secret1234',
        profession: 'Plumber',
      }),
    })
    const res = await POST(req)
    expect(res.status).toBe(409)
  })

  it('returns 400 on invalid input', async () => {
    const req = new NextRequest('http://localhost/api/providers', {
      method: 'POST',
      body: JSON.stringify({ name: 'X', email: 'not-an-email', password: '123' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
