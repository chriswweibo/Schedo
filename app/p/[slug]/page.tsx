export const revalidate = 300

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { ProviderCalendar } from '@/components/provider/ProviderCalendar'
import { Card } from '@/components/ui/card'
import { prisma } from '@/lib/prisma'

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const provider = await prisma.provider.findUnique({
    where: { slug: params.slug },
    select: { name: true, profession: true, bio: true, avatarUrl: true },
  })
  if (!provider) return { title: 'Provider not found — Schedo' }
  const title = `${provider.name} — ${provider.profession} | Schedo`
  const description = provider.bio ?? `Book ${provider.name}, a ${provider.profession}, on Schedo.`
  return {
    title,
    description,
    openGraph: { title, description, images: provider.avatarUrl ? [provider.avatarUrl] : [] },
  }
}

const WorksCarousel = dynamic(
  () => import('@/components/provider/WorksCarousel').then((m) => m.WorksCarousel),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-52 rounded-2xl bg-muted animate-pulse" />
    ),
  }
)

async function getProvider(slug: string) {
  return prisma.provider.findUnique({
    where: { slug },
    select: {
      id: true, name: true, slug: true, bio: true, avatarUrl: true,
      profession: true, keywords: true,
      bookingMode: true, isVisible: true,
      availability: { where: { isActive: true } },
      completedJobs: {
        orderBy: { completedAt: 'desc' },
        take: 24,
        select: { id: true, title: true, description: true, imageUrl: true, completedAt: true },
      },
    },
  })
}

export default async function ProviderProfilePage({
  params,
}: {
  params: { slug: string }
}) {
  const provider = await getProvider(params.slug)
  if (!provider) notFound()

  const professions = provider.profession.split(',').map((s) => s.trim()).filter(Boolean)

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 flex flex-col gap-8">

      {/* ── Header ──────────────────────────────────────────── */}
      <Card className="p-6">
        <div className="flex items-start gap-5">
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-3xl font-bold text-indigo-400 dark:bg-indigo-950 dark:text-indigo-300 overflow-hidden">
            {provider.avatarUrl ? (
              <Image src={provider.avatarUrl} alt={provider.name} fill className="object-cover" />
            ) : (
              <span>{provider.name[0]}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold leading-tight text-foreground">{provider.name}</h1>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {professions.map((p) => (
                <span key={p} className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  {p}
                </span>
              ))}
            </div>
            {provider.bio && (
              <p className="mt-3 text-muted-foreground text-sm leading-relaxed">{provider.bio}</p>
            )}
          </div>
        </div>
      </Card>

      {/* ── Past work + Calendar ────────────────────────────── */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-4 text-lg font-semibold text-foreground">Past work</h2>
          <WorksCarousel jobs={provider.completedJobs} />
        </section>

        <section id="availability">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Book a slot</h2>
          <Card className="p-4">
            <ProviderCalendar
              providerId={provider.id}
              availability={provider.availability}
            />
          </Card>
        </section>
      </div>

    </main>
  )
}
