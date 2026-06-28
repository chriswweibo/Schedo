import Link from 'next/link'
import { format, isValid } from 'date-fns'
import { CheckCircle2, Clock, CalendarDays, Mail, Search } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function ConfirmationPage({
  searchParams,
}: {
  searchParams: { status?: string; provider?: string; date?: string; start?: string; end?: string }
}) {
  const isConfirmed = searchParams.status === 'CONFIRMED'
  const provider = searchParams.provider ?? 'the provider'
  const date = searchParams.date ?? ''
  const start = searchParams.start ?? ''
  const end = searchParams.end ?? ''

  const dateObj = date ? new Date(`${date}T00:00:00`) : null
  const prettyDate = dateObj && isValid(dateObj) ? format(dateObj, 'EEEE, d MMMM yyyy') : date || 'the scheduled date'
  const prettyTime = start ? (end ? `${start} – ${end}` : start) : 'the scheduled time'

  return (
    <main className="flex min-h-[80vh] items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md p-8 text-center">
        <div
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${
            isConfirmed ? 'bg-primary-light text-primary' : 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400'
          }`}
        >
          {isConfirmed ? <CheckCircle2 className="h-7 w-7" aria-hidden /> : <Clock className="h-7 w-7" aria-hidden />}
        </div>

        <h1 className="mt-5 text-2xl font-bold text-foreground">
          {isConfirmed ? 'Booking confirmed' : 'Request sent'}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isConfirmed
            ? `You're all set with ${provider}.`
            : `Your request to ${provider} has been sent. We'll email you once they respond.`}
        </p>

        {/* Structured summary */}
        <div className="mt-6 space-y-3 rounded-xl border border-border bg-muted/40 p-4 text-left">
          <p className="text-sm font-semibold text-foreground">{provider}</p>
          <div className="flex items-center gap-2.5 text-sm text-foreground">
            <CalendarDays className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            {prettyDate}
          </div>
          <div className="flex items-center gap-2.5 text-sm text-foreground">
            <Clock className="h-4 w-4 shrink-0 text-primary" aria-hidden />
            {prettyTime}
          </div>
        </div>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Check your email — you can reschedule or cancel from there anytime.
        </p>

        <Link href="/search" className="mt-6 inline-block">
          <Button variant="outline">
            <Search className="mr-2 h-4 w-4" aria-hidden /> Find more providers
          </Button>
        </Link>
      </Card>
    </main>
  )
}
