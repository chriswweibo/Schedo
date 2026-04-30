import { NextRequest, NextResponse } from 'next/server'
import * as bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { RegisterProviderSchema } from '@/lib/validations'

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
