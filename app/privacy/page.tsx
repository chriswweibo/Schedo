import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy Policy — Schedo',
  description: 'How Schedo collects, uses, and protects your data, including Google account and Google Calendar data.',
}

const UPDATED = 'June 24, 2026'
const CONTACT = 'schedo.it@gmail.com'

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-10 mb-3 text-xl font-semibold text-foreground">{children}</h2>
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{children}</p>
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/" className="text-sm font-medium text-primary hover:underline">← Back to Schedo</Link>
      <h1 className="mt-4 mb-2 text-3xl font-bold text-foreground">Privacy Policy</h1>
      <p className="mb-8 text-sm text-muted-foreground">Last updated: {UPDATED}</p>

      <P>
        Schedo (&ldquo;Schedo&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) operates a scheduling marketplace that connects
        local service providers with customers. This Privacy Policy explains what information we collect,
        how we use it, and the choices you have. By using Schedo you agree to this policy.
      </P>

      <H>Information we collect</H>
      <P>
        <strong>Provider accounts.</strong> When a provider registers, we collect their name, email address,
        password (stored only as a bcrypt hash), profession, service keywords, business location, and
        availability settings.
      </P>
      <P>
        <strong>Guest bookings.</strong> Customers book without an account. When they book we collect the name,
        email, optional phone number, and any note they provide. This guest contact information is encrypted at
        rest using AES-256-GCM.
      </P>
      <P>
        <strong>Google account data.</strong> If a provider signs in with Google, we receive their basic Google
        profile (name and email address) and a Google account identifier, which we use to create or link their
        Schedo provider account.
      </P>
      <P>
        <strong>Google Calendar data.</strong> If a provider connects Google Calendar, we request read-only access
        (<code className="rounded bg-muted px-1 py-0.5 text-xs">calendar.readonly</code>) and read only the
        <em> free/busy time ranges</em> of their primary calendar. We do not read event titles, descriptions,
        attendees, locations, or any other event details. OAuth tokens are encrypted at rest.
      </P>

      <H>How we use information</H>
      <P>
        We use provider and booking information to operate the service: to publish provider profiles, match
        customers to providers, process bookings, prevent double-bookings, and send transactional emails
        (booking confirmations, requests, and status updates).
      </P>
      <P>
        We use Google Calendar free/busy data for a single purpose: to automatically mark the times you are busy
        in your external calendar as unavailable in Schedo, so customers cannot book over your existing
        commitments. The sync is one-way (Google → Schedo); we never write to your Google Calendar.
      </P>

      <H>Google API Services — Limited Use disclosure</H>
      <P>
        Schedo&rsquo;s use and transfer of information received from Google APIs adheres to the{' '}
        <a
          href="https://developers.google.com/terms/api-services-user-data-policy"
          className="text-primary hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Google API Services User Data Policy
        </a>
        , including the Limited Use requirements. Specifically: we only use Google Calendar data to provide and
        improve the calendar-availability feature described above; we do not transfer or sell this data to third
        parties; we do not use it for advertising; and no humans read your Google data except as needed for
        security, to comply with applicable law, or where you have given explicit consent.
      </P>

      <H>How we share information</H>
      <P>
        We do not sell your personal information. Provider profile details (name, profession, service area,
        availability) are shown publicly to help customers find and book you. Guest booking contact details are
        shared only with the provider for the relevant booking. We use a small number of service providers to run
        Schedo (database hosting and transactional email) who process data on our behalf. We may disclose
        information if required by law.
      </P>

      <H>Data retention and security</H>
      <P>
        We retain account and booking data for as long as your account is active or as needed to provide the
        service. Sensitive data — guest contact details and Google OAuth tokens — is encrypted at rest. You can
        disconnect Google Calendar at any time, which removes the stored tokens and the calendar-derived
        availability blocks.
      </P>

      <H>Your choices</H>
      <P>
        Providers can edit or remove their profile data and disconnect Google at any time from their dashboard
        settings. To request deletion of your account or any guest booking data, contact us at{' '}
        <a href={`mailto:${CONTACT}`} className="text-primary hover:underline">{CONTACT}</a>.
      </P>

      <H>Children</H>
      <P>Schedo is not directed to children under 16, and we do not knowingly collect their personal information.</P>

      <H>Changes to this policy</H>
      <P>
        We may update this policy from time to time. Material changes will be reflected by updating the
        &ldquo;Last updated&rdquo; date above.
      </P>

      <H>Contact</H>
      <P>
        Questions about this policy? Email us at{' '}
        <a href={`mailto:${CONTACT}`} className="text-primary hover:underline">{CONTACT}</a>.
      </P>

      <p className="mt-10 border-t border-border pt-6 text-sm text-muted-foreground">
        See also our <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>.
      </p>
    </main>
  )
}
