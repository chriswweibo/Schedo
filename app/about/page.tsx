import type { Metadata } from 'next'
import Link from 'next/link'
import { CalendarCheck, ShieldCheck, MapPin, Users } from 'lucide-react'

export const metadata: Metadata = {
  title: 'About us — Schedo',
  description: 'Schedo is a scheduling marketplace that connects customers with trusted local service professionals — book in minutes, no account needed.',
}

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-10 mb-3 text-xl font-semibold text-foreground">{children}</h2>
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{children}</p>
}

const VALUES = [
  { Icon: CalendarCheck, title: 'Booking, not bidding', body: 'Pick an open slot on a real calendar and book it. No quote requests, no waiting for callbacks.' },
  { Icon: ShieldCheck, title: 'Privacy first', body: 'Guest contact details are encrypted at rest and we never sell your data.' },
  { Icon: MapPin, title: 'Local by design', body: 'We match you with professionals who actually serve your area.' },
  { Icon: Users, title: 'Fair to providers', body: 'Free to list, full control of availability, and no lead fees.' },
]

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/" className="text-sm font-medium text-primary hover:underline">← Back to Schedo</Link>
      <h1 className="mt-4 mb-2 text-3xl font-bold text-foreground">About Schedo</h1>
      <p className="mb-8 text-sm text-muted-foreground">Book trusted local pros in minutes.</p>

      <P>
        Schedo is a scheduling marketplace that connects customers with trusted local service
        professionals — electricians, plumbers, gardeners, cleaners, personal trainers, tutors,
        photographers and many more. Our goal is simple: make booking a local pro as easy as
        booking a table.
      </P>

      <H>Why we built it</H>
      <P>
        Finding help shouldn&rsquo;t mean filling in a form and waiting for five companies to call you
        back. Most marketplaces sell your details as a &ldquo;lead&rdquo; and leave you to chase quotes.
        Schedo flips that around: providers publish their real availability, and you book an open
        time slot directly. No account required, and you can reschedule or cancel from your booking
        link anytime.
      </P>

      <H>How it works</H>
      <P>
        Search for the service you need, browse local providers, and pick a time that suits you.
        Bookings either confirm instantly or go to the provider as a request — either way you get an
        email and never have to create an account. Providers manage everything from a single
        dashboard and can sync their Google Calendar so you only ever see times they&rsquo;re free.
      </P>

      <H>What we stand for</H>
      <div className="mt-2 grid gap-4 sm:grid-cols-2">
        {VALUES.map(({ Icon, title, body }) => (
          <div key={title} className="rounded-2xl border border-border bg-card p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-light text-primary">
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <h3 className="mt-3 font-semibold text-foreground">{title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>

      <p className="mt-10 border-t border-border pt-6 text-sm text-muted-foreground">
        Want to offer your services?{' '}
        <Link href="/auth/register" className="text-primary hover:underline">List your services</Link>{' '}
        or <Link href="/contact" className="text-primary hover:underline">get in touch</Link>.
      </p>
    </main>
  )
}
