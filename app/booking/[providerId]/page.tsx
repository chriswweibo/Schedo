import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format, isValid } from 'date-fns'
import { CalendarDays, Clock, ArrowLeft, Zap, CheckCircle2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { BookingForm } from '@/components/booking/BookingForm'
import { prisma } from '@/lib/prisma'

/** Hours between two "HH:MM" strings (e.g. 09:00 → 11:00 = 2). */
function durationHours(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return (eh * 60 + em - (sh * 60 + sm)) / 60
}

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
  const profileHref = `/p/${provider.slug ?? ''}`

  if (!date || !startTime || !endTime) {
    return (
      <main className="mx-auto max-w-lg px-4 py-10">
        <h1 className="mb-2 text-2xl font-bold">Book {provider.name}</h1>
        <p className="text-muted-foreground">
          Please select a date and time slot from{' '}
          <Link href={profileHref} className="text-primary underline">
            {provider.name}&apos;s profile
          </Link>
          .
        </p>
      </main>
    )
  }

  const dateObj = new Date(`${date}T00:00:00`)
  const prettyDate = isValid(dateObj) ? format(dateObj, 'EEEE, d MMMM yyyy') : date
  const hours = durationHours(startTime, endTime)
  const prettyDuration = Number.isFinite(hours) && hours > 0 ? `${hours} hr${hours > 1 ? 's' : ''}` : null
  const isInstant = provider.bookingMode !== 'REQUEST'

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href={profileHref}
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Back to {provider.name}
      </Link>

      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        {/* ── Appointment summary (Calendly-style left rail) ── */}
        <Card className="h-fit p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Booking with</p>
          <h1 className="mt-1 text-xl font-bold text-foreground">{provider.name}</h1>
          <p className="text-sm text-muted-foreground">{provider.profession}</p>

          <div className="my-5 h-px bg-border" />

          <dl className="space-y-4">
            <div className="flex items-start gap-3">
              <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Date</dt>
                <dd className="text-sm font-semibold text-foreground">{prettyDate}</dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
              <div>
                <dt className="text-xs font-medium text-muted-foreground">Time</dt>
                <dd className="text-sm font-semibold text-foreground">
                  {startTime} – {endTime}
                  {prettyDuration && <span className="font-normal text-muted-foreground"> · {prettyDuration}</span>}
                </dd>
              </div>
            </div>
          </dl>

          <div className="mt-5 flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2.5 text-xs text-muted-foreground">
            {isInstant ? (
              <>
                <Zap className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                <span>Instant confirmation — your slot is locked in right away.</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                <span>{provider.name} will review and confirm your request by email.</span>
              </>
            )}
          </div>
        </Card>

        {/* ── Guest details form ── */}
        <Card className="p-6">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Your details</h2>
          <BookingForm
            providerId={provider.id}
            providerName={provider.name}
            date={date}
            startTime={startTime}
            endTime={endTime}
            bookingMode={provider.bookingMode}
          />
        </Card>
      </div>
    </main>
  )
}
