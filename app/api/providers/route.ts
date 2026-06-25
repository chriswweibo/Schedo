import { NextRequest, NextResponse } from 'next/server'
import * as bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { RegisterProviderSchema } from '@/lib/validations'
import { checkRateLimit, clientIp } from '@/lib/ratelimit'
import { searchProviders } from '@/lib/search'

function generateSlug(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const suffix = Math.random().toString(36).slice(2, 7)
  return `${base}-${suffix}`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = RegisterProviderSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { name, email, password, profession } = parsed.data

    const existing = await prisma.provider.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const slug = generateSlug(name)

    const provider = await prisma.provider.create({
      data: { name, email, passwordHash, profession, slug },
      select: { id: true, name: true, slug: true, email: true, profession: true },
    })

    return NextResponse.json(provider, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const { ok } = await checkRateLimit('search:' + clientIp(req), 30, 60)
  if (!ok) {
    return NextResponse.json({ error: 'Too many requests, please try again shortly.' }, { status: 429 })
  }

  try {
    const { searchParams } = req.nextUrl
    const lat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : null
    const lng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : null
    const keyword = searchParams.get('keyword') ?? ''
    const name = searchParams.get('name') ?? ''
    const date = searchParams.get('date') ?? ''
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1

    const { providers, page: pg, pageSize, hasMore } = await searchProviders({
      lat,
      lng,
      keyword,
      name,
      date,
      page,
      pageSize: 50,
    })

    // Return the providers array for backward compatibility; pagination fields are additive.
    return NextResponse.json(providers, {
      headers: {
        'X-Page': String(pg),
        'X-Page-Size': String(pageSize),
        'X-Has-More': String(hasMore),
      },
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
