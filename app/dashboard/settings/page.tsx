import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { SettingsForm } from './SettingsForm'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/auth/login')

  const provider = await prisma.provider.findUnique({
    where: { id: session.user.id },
    select: {
      slug: true, bio: true, keywords: true, lat: true, lng: true,
      acceptedRadiusKm: true, bookingMode: true, isVisible: true,
      googleId: true, googleSyncedAt: true,
    },
  })
  if (!provider) redirect('/auth/login')

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold">Settings</h1>
      <SettingsForm
        provider={provider}
        slug={session.user.slug}
        googleConnected={!!provider.googleId}
        googleSyncedAt={provider.googleSyncedAt ? provider.googleSyncedAt.toISOString() : null}
      />
    </main>
  )
}
