import Link from 'next/link'
import type { Metadata } from 'next'
import {
  Search, CalendarCheck, CheckCircle2, ShieldCheck, Lock, BadgeCheck, ArrowRight,
  Home, Briefcase, PartyPopper, HeartPulse, GraduationCap, PawPrint,
} from 'lucide-react'
import { HomeHeroSearch } from './HomeHeroSearch'
import { LottieIcon } from '@/components/ui/LottieIcon'
import pulse from '@/components/lottie/pulse.json'

export const metadata: Metadata = {
  title: 'Schedo — Book Local Service Providers Near You',
  description:
    'Find and book trusted local professionals — from home and trades to events, wellness, lessons and business. Pick a time, book in minutes, no account needed.',
}

// Bark-style category groups. Each service links to a keyword search.
const CATEGORIES = [
  { name: 'House & Home', Icon: Home, services: ['Cleaner', 'Gardener', 'Electrician', 'Plumber', 'Handyman', 'Painter'] },
  { name: 'Events & Entertainment', Icon: PartyPopper, services: ['Photographer', 'DJ', 'Caterer', 'Event Planner', 'Videographer'] },
  { name: 'Health & Wellness', Icon: HeartPulse, services: ['Personal Trainer', 'Massage Therapist', 'Counsellor', 'Nutritionist'] },
  { name: 'Lessons & Training', Icon: GraduationCap, services: ['Tutor', 'Music Teacher', 'Language Lessons', 'Driving Instructor'] },
  { name: 'Business', Icon: Briefcase, services: ['Accountant', 'Web Design', 'Marketing', 'Consultant', 'IT Support'] },
  { name: 'Pet & More', Icon: PawPrint, services: ['Pet Care', 'Dog Walker', 'Locksmith', 'Mover'] },
]

const QUICK = ['Electrician', 'Cleaner', 'Personal Trainer', 'Photographer', 'Tutor', 'Handyman']

const STEPS = [
  { Icon: Search, title: 'Search', body: 'Tell us the service you need and where you are.' },
  { Icon: CalendarCheck, title: 'Pick a time', body: "Choose an open slot on the provider's live calendar." },
  { Icon: CheckCircle2, title: 'Get it done', body: 'They confirm your booking — no account required.' },
]

const TRUST = [
  { Icon: BadgeCheck, title: 'No account needed', body: 'Book as a guest in minutes. View, reschedule or cancel anytime from your booking link.' },
  { Icon: CalendarCheck, title: 'Real-time availability', body: "See each provider's open slots and book instantly or send a request." },
  { Icon: Lock, title: 'Private & secure', body: 'Your contact details are encrypted at rest, and we never sell your data.' },
  { Icon: ShieldCheck, title: 'No double-bookings', body: 'A slot is held the moment it’s booked, so two people can never grab the same time.' },
]

export default function HomePage() {
  return (
    <main className="flex flex-col">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b border-border bg-primary-light/40">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center sm:py-28">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-card px-3 py-1 text-xs font-semibold text-primary">
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> No account needed · Book in minutes
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-6xl">
            Get it done.<br />Book a trusted local pro.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
            Home &amp; trades, events, wellness, lessons, business — find a trusted local pro, pick a time that suits you, and book in minutes.
          </p>

          <div className="mx-auto mt-8 max-w-xl">
            <HomeHeroSearch />
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm">
              <span className="text-muted-foreground">Popular:</span>
              {QUICK.map((q) => (
                <Link
                  key={q}
                  href={`/search?keyword=${encodeURIComponent(q.toLowerCase())}`}
                  className="rounded-full border border-border bg-card px-3 py-1 font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  {q}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Browse by category ───────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Browse by category</h2>
            <p className="mt-1 text-sm text-muted-foreground">Thousands of services across home, events, wellness and more.</p>
          </div>
          <Link href="/search" className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline sm:flex">
            View all <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map(({ name, Icon, services }) => (
            <div key={name} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="font-semibold text-foreground">{name}</h3>
              </div>
              <ul className="mt-4 flex flex-wrap gap-2">
                {services.map((s) => (
                  <li key={s}>
                    <Link
                      href={`/search?keyword=${encodeURIComponent(s.toLowerCase())}`}
                      className="inline-block rounded-full border border-border px-3 py-1 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
                    >
                      {s}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section className="border-y border-border bg-muted/40">
        <div className="mx-auto w-full max-w-6xl px-6 py-16">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">How Schedo works</h2>
            <p className="mt-1 text-sm text-muted-foreground">From search to booked in three simple steps.</p>
          </div>
          <ol className="mt-10 grid gap-6 sm:grid-cols-3">
            {STEPS.map(({ Icon, title, body }, i) => (
              <li key={title} className="relative rounded-2xl border border-border bg-card p-6">
                <span className="absolute right-4 top-4 text-4xl font-bold text-primary/15">{i + 1}</span>
                <span className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-primary-light text-primary">
                  <LottieIcon animationData={pulse} className="pointer-events-none absolute -inset-4" />
                  <Icon className="relative h-6 w-6" aria-hidden />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Trust / safety ───────────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Booking you can trust</h2>
          <p className="mt-1 text-sm text-muted-foreground">Built for fast, fair, and safe bookings.</p>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST.map(({ Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-light text-primary">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-4 font-semibold text-foreground">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Provider CTA ─────────────────────────────────────── */}
      <section className="px-6 pb-20">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 rounded-3xl bg-primary px-8 py-12 text-center sm:flex-row sm:text-left">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-primary-foreground sm:text-3xl">
              Offer your services on Schedo
            </h2>
            <p className="mt-2 max-w-xl text-primary-foreground/90">
              Publish your availability, get discovered by local customers, and manage bookings — free to join.
            </p>
          </div>
          <Link
            href="/auth/register"
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-card px-6 py-3 font-semibold text-primary shadow-sm transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground"
          >
            List your services <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </section>
    </main>
  )
}
