import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Lightweight current-provider lookup for client components (e.g. the navbar
// avatar). Returns just what the UI needs, always fresh from the DB.
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const provider = await prisma.provider.findUnique({
    where: { id: session.user.id },
    select: { name: true, slug: true, avatarUrl: true },
  })
  if (!provider) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(provider)
}
