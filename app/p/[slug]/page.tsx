import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ProviderCalendar } from '@/components/provider/ProviderCalendar'
import { CompletedJobCard } from '@/components/provider/CompletedJobCard'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

async function getProvider(slug: string) {
  const res = await fetch(`${process.env.NEXTAUTH_URL}/api/providers/${slug}`, {
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json()
}

export default async function ProviderProfilePage({
  params,
}: {
  params: { slug: string }
}) {
  const provider = await getProvider(params.slug)
  if (!provider) notFound()

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      {/* Header */}
      <Card className="mb-8 flex items-center gap-6 p-6">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-stone-100 text-3xl font-bold text-stone-500">
          {provider.avatarUrl ? (
            <img src={provider.avatarUrl} alt={provider.name} className="h-full w-full rounded-full object-cover" />
          ) : (
            provider.name[0]
          )}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{provider.name}</h1>
          <p className="text-stone-500">{provider.profession}</p>
        </div>
        <Link href={`/booking/${provider.id}`}>
          <Button>Book now</Button>
        </Link>
      </Card>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_300px]">
        {/* Left: bio + completed jobs */}
        <div>
          {provider.bio && (
            <div className="mb-8">
              <h2 className="mb-2 text-lg font-semibold">About</h2>
              <p className="text-stone-600 leading-relaxed">{provider.bio}</p>
            </div>
          )}

          {provider.completedJobs?.length > 0 && (
            <div>
              <h2 className="mb-4 text-lg font-semibold">Past work</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {provider.completedJobs.map((job: any) => (
                  <CompletedJobCard
                    key={job.id}
                    title={job.title}
                    description={job.description}
                    imageUrl={job.imageUrl}
                    completedAt={job.completedAt}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: calendar */}
        <div>
          <Card className="p-4">
            <h2 className="mb-4 text-lg font-semibold">Availability</h2>
            <ProviderCalendar
              providerId={provider.id}
              availability={provider.availability}
            />
          </Card>
        </div>
      </div>
    </main>
  )
}
