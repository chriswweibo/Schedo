import { notFound } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { BookingForm } from '@/components/booking/BookingForm'
import { prisma } from '@/lib/prisma'

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: { providerId: string }
  searchParams: { date?: string; start?: string; end?: string }
}) {
  const provider = await prisma.provider.findUnique({
    where: { id: params.providerId },
    select: { id: true, name: true, slug: true, profession: true, bookingMode: true },
  })
  if (!provider) notFound()

  const date = searchParams.date ?? ''
  const startTime = searchParams.start ?? ''
  const endTime = searchParams.end ?? ''

  if (!date || !startTime || !endTime) {
    return (
      <main className="mx-auto max-w-lg px-4 py-10">
        <h1 className="mb-2 text-2xl font-bold">Book {provider.name}</h1>
        <p className="text-stone-500">
          Please select a date and time slot from{' '}
          <a href={`/p/${provider.slug ?? ''}`} className="text-primary underline">
            {provider.name}&apos;s profile
          </a>
          .
        </p>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold">Book {provider.name}</h1>
      <p className="mb-6 text-stone-500">
        {provider.profession} · {date} {startTime}–{endTime}
      </p>
      <Card className="p-6">
        <BookingForm
          providerId={provider.id}
          providerName={provider.name}
          date={date}
          startTime={startTime}
          endTime={endTime}
          bookingMode={provider.bookingMode}
        />
      </Card>
    </main>
  )
}
