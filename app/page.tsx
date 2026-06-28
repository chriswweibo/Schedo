import Link from 'next/link'
import type { Metadata } from 'next'
import {
  Search, CalendarCheck, CheckCircle2, ShieldCheck, Lock, BadgeCheck,
  Zap, Wrench, Leaf, Sparkles, Hammer, PaintRoller, Wind, Camera, ArrowRight,
} from 'lucide-react'
import { HomeHeroSearch } from './HomeHeroSearch'

export const metadata: Metadata = {
  title: 'Schedo — Book Local Service Providers Near You',
  description:
    'Find and book trusted local electricians, plumbers, gardeners, cleaners and more. Pick a time, book in minutes — no account needed.',
}

const POPULAR = [
  { label: 'Electrician', keyword: 'electrician', Icon: Zap },
  { label: 'Plumber', keyword: 'plumber', Icon: Wrench },
  { label: 'Gardener', keyword: 'gardener', Icon: Leaf },
  { label: 'Cleaner', keyword: 'cleaner', Icon: Sparkles },
  { label: 'Handyman', keyword: 'handyman', Icon: Hammer },
  { label: 'Painter', keyword: 'painter', Icon: PaintRoller },
  { label: 'HVAC', keyword: 'hvac', Icon: Wind },
  { label: 'Photographer', keyword: 'photographer', Icon: Camera },
]

const QUICK = ['Electrician', 'Plumber', 'Cleaner', 'Gardener', 'Handyman', 'Locksmith']

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
            Electricians, plumbers, gardeners and more — search, pick a time that suits you, and book in minutes.
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

      {/* ── Popular services ─────────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Browse popular services</h2>
            <p className="mt-1 text-sm text-muted-foreground">Pick a category to see providers near you.</p>
          </div>
          <Link href="/search" className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline sm:flex">
            View all <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {POPULAR.map(({ label, keyword, Icon }) => (
            <Link
              key={keyword}
              href={`/search?keyword=${encodeURIComponent(keyword)}`}
              className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary hover:shadow-sm"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-light text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="font-semibold text-foreground">{label}</span>
            </Link>
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
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-light text-primary">
                  <Icon className="h-6 w-6" aria-hidden />
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
