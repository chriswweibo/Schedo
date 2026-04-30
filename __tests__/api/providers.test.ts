/**
 * @jest-environment node
 */
import { POST, GET } from '@/app/api/providers/route'
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

describe('GET /api/providers', () => {
  beforeEach(() => jest.clearAllMocks())

  it('filters by radius — returns only providers within range', async () => {
    ;(prisma.provider.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'p1', name: 'Near Provider', slug: 'near', profession: 'Electrician',
        lat: 51.51, lng: -0.12, acceptedRadiusKm: 25, keywords: [],
        isVisible: true, avatarUrl: null, createdAt: new Date(),
        availability: [],
      },
      {
        id: 'p2', name: 'Far Provider', slug: 'far', profession: 'Plumber',
        lat: 53.0, lng: -1.5, acceptedRadiusKm: 25, keywords: [],
        isVisible: true, avatarUrl: null, createdAt: new Date(),
        availability: [],
      },
    ])

    // Search near London (51.5, -0.1) — p1 is ~1km away, p2 is ~170km away
    const req = new NextRequest(
      'http://localhost/api/providers?lat=51.5&lng=-0.1'
    )
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveLength(1)
    expect(data[0].slug).toBe('near')
  })

  it('returns all visible providers when no location given', async () => {
    ;(prisma.provider.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'p1', name: 'Provider', slug: 'p', profession: 'Builder',
        lat: null, lng: null, acceptedRadiusKm: 25, keywords: [],
        isVisible: true, avatarUrl: null, createdAt: new Date(),
        availability: [],
      },
    ])

    const req = new NextRequest('http://localhost/api/providers')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveLength(1)
  })

  it('filters by keyword match on profession', async () => {
    ;(prisma.provider.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'p1', name: 'Alice', slug: 'alice', profession: 'Electrician',
        lat: null, lng: null, acceptedRadiusKm: 25, keywords: [],
        isVisible: true, avatarUrl: null, createdAt: new Date(),
        availability: [],
      },
      {
        id: 'p2', name: 'Bob', slug: 'bob', profession: 'Plumber',
        lat: null, lng: null, acceptedRadiusKm: 25, keywords: [],
        isVisible: true, avatarUrl: null, createdAt: new Date(),
        availability: [],
      },
    ])

    const req = new NextRequest('http://localhost/api/providers?keyword=plumber')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data).toHaveLength(1)
    expect(data[0].slug).toBe('bob')
  })
})
