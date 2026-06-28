import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Terms of Service — Schedo',
  description: 'The terms that govern your use of Schedo.',
}

const UPDATED = 'June 24, 2026'
const CONTACT = 'contact@schedo.me'

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-10 mb-3 text-xl font-semibold text-foreground">{children}</h2>
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{children}</p>
}

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/" className="text-sm font-medium text-primary hover:underline">← Back to Schedo</Link>
      <h1 className="mt-4 mb-2 text-3xl font-bold text-foreground">Terms of Service</h1>
      <p className="mb-8 text-sm text-muted-foreground">Last updated: {UPDATED}</p>

      <P>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of Schedo (the
        &ldquo;Service&rdquo;). By using Schedo, you agree to these Terms. If you do not agree, do not use the
        Service.
      </P>

      <H>The service</H>
      <P>
        Schedo is a marketplace that lets service providers publish their availability and lets customers book
        appointments. Schedo facilitates discovery and scheduling; it is not a party to the agreement for
        services between a provider and a customer, and is not responsible for the quality, safety, or legality of
        the services booked.
      </P>

      <H>Provider accounts</H>
      <P>
        Providers are responsible for the accuracy of their profile, availability, and the information they
        publish, and for keeping their account credentials secure. Providers must have the right to offer the
        services they list and must comply with all applicable laws and regulations.
      </P>

      <H>Bookings</H>
      <P>
        Customers may book as guests without an account. By making a booking you agree to provide accurate contact
        information. Depending on the provider&rsquo;s settings, a booking may be confirmed instantly or held as a
        request pending the provider&rsquo;s approval. Schedo does not process payments.
      </P>

      <H>Acceptable use</H>
      <P>
        You agree not to misuse the Service, including by: submitting false or misleading information; attempting
        to disrupt or gain unauthorized access to the Service; using the Service for unlawful purposes; or
        scraping or harvesting data without permission.
      </P>

      <H>Google Calendar integration</H>
      <P>
        If you connect Google Calendar, you authorize Schedo to read your primary calendar&rsquo;s free/busy times
        to block out your Schedo availability, as described in our{' '}
        <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>. You can disconnect
        at any time from your settings.
      </P>

      <H>Disclaimers</H>
      <P>
        The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind,
        whether express or implied, including fitness for a particular purpose and non-infringement. We do not
        warrant that the Service will be uninterrupted, secure, or error-free.
      </P>

      <H>Limitation of liability</H>
      <P>
        To the maximum extent permitted by law, Schedo will not be liable for any indirect, incidental, special,
        consequential, or punitive damages, or any loss of profits or revenues, arising out of or related to your
        use of the Service.
      </P>

      <H>Termination</H>
      <P>
        You may stop using the Service at any time. We may suspend or terminate access if you breach these Terms
        or if we discontinue the Service.
      </P>

      <H>Changes</H>
      <P>
        We may update these Terms from time to time. Material changes will be reflected by updating the
        &ldquo;Last updated&rdquo; date above. Continued use of the Service after changes constitutes acceptance.
      </P>

      <H>Contact</H>
      <P>
        Questions about these Terms? Email us at{' '}
        <a href={`mailto:${CONTACT}`} className="text-primary hover:underline">{CONTACT}</a>.
      </P>

      <p className="mt-10 border-t border-border pt-6 text-sm text-muted-foreground">
        See also our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
      </p>
    </main>
  )
}
