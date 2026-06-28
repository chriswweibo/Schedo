import type { Metadata } from 'next'
import Link from 'next/link'
import { Mail, Briefcase, ShieldCheck } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Contact us — Schedo',
  description: 'Get in touch with the Schedo team — general enquiries, becoming a provider, and privacy requests.',
}

const CONTACT = 'contact@schedo.me'

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/" className="text-sm font-medium text-primary hover:underline">← Back to Schedo</Link>
      <h1 className="mt-4 mb-2 text-3xl font-bold text-foreground">Contact us</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        We&rsquo;re a small team and we read every message. Pick the option that fits and we&rsquo;ll get back to you.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-light text-primary">
            <Mail className="h-5 w-5" aria-hidden />
          </span>
          <h2 className="mt-3 font-semibold text-foreground">General enquiries</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Questions, feedback, or need a hand with a booking?
          </p>
          <a href={`mailto:${CONTACT}`} className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
            {CONTACT}
          </a>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-light text-primary">
            <Briefcase className="h-5 w-5" aria-hidden />
          </span>
          <h2 className="mt-3 font-semibold text-foreground">Become a provider</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            List your services, publish your availability, and start taking bookings — free to join.
          </p>
          <Link href="/auth/register" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
            List your services →
          </Link>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 sm:col-span-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-light text-primary">
            <ShieldCheck className="h-5 w-5" aria-hidden />
          </span>
          <h2 className="mt-3 font-semibold text-foreground">Privacy &amp; data requests</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            To access or delete your account or any guest booking data, email us and we&rsquo;ll action it.
            See our{' '}
            <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link> for details.
          </p>
          <a href={`mailto:${CONTACT}`} className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
            {CONTACT}
          </a>
        </div>
      </div>
    </main>
  )
}
