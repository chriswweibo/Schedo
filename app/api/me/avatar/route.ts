import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { put, del } from '@vercel/blob'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

const MAX_BYTES = 4 * 1024 * 1024 // 4 MB
const ALLOWED: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

// POST — upload a new avatar (multipart/form-data with a `file` field).
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: 'Image uploads are not configured. Set BLOB_READ_WRITE_TOKEN.' },
      { status: 503 }
    )
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Expected multipart/form-data.' }, { status: 400 })
  }

  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
  }
  const ext = ALLOWED[file.type]
  if (!ext) {
    return NextResponse.json({ error: 'Only JPEG, PNG, or WebP images are allowed.' }, { status: 415 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'Image must be under 4 MB.' }, { status: 413 })
  }

  // Remove the previous avatar from blob storage (best-effort) so we don't orphan it.
  const current = await prisma.provider.findUnique({
    where: { id: session.user.id },
    select: { avatarUrl: true },
  })

  const blob = await put(`avatars/${session.user.slug}-${Date.now()}.${ext}`, file, {
    access: 'public',
    contentType: file.type,
  })

  await prisma.provider.update({
    where: { id: session.user.id },
    data: { avatarUrl: blob.url },
  })

  if (current?.avatarUrl?.includes('.public.blob.vercel-storage.com')) {
    try { await del(current.avatarUrl) } catch { /* best-effort cleanup */ }
  }

  return NextResponse.json({ avatarUrl: blob.url })
}

// DELETE — remove the current avatar.
export async function DELETE() {
  const session = await getServerSession(authOptions)
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const current = await prisma.provider.findUnique({
    where: { id: session.user.id },
    select: { avatarUrl: true },
  })

  await prisma.provider.update({
    where: { id: session.user.id },
    data: { avatarUrl: null },
  })

  if (current?.avatarUrl?.includes('.public.blob.vercel-storage.com')) {
    try { await del(current.avatarUrl) } catch { /* best-effort cleanup */ }
  }

  return NextResponse.json({ avatarUrl: null })
}
