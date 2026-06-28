import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Cookie Policy — Schedo',
  description: 'How Schedo uses cookies and similar technologies, and how you can control them.',
}

const UPDATED = 'June 28, 2026'
const CONTACT = 'schedo.it@gmail.com'

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-10 mb-3 text-xl font-semibold text-foreground">{children}</h2>
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{children}</p>
}

export default function CookiePolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/" className="text-sm font-medium text-primary hover:underline">← Back to Schedo</Link>
      <h1 className="mt-4 mb-2 text-3xl font-bold text-foreground">Cookie Policy</h1>
      <p className="mb-8 text-sm text-muted-foreground">Last updated: {UPDATED}</p>

      <P>
        This Cookie Policy explains how Schedo (&ldquo;we&rdquo;, &ldquo;us&rdquo;) uses cookies and
        similar technologies when you visit Schedo. It should be read alongside our{' '}
        <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
      </P>

      <H>What are cookies?</H>
      <P>
        Cookies are small text files stored on your device by your browser. &ldquo;Similar
        technologies&rdquo; include browser local storage, which works much like a cookie but is read
        only by the site itself. We use both, sparingly.
      </P>

      <H>How we use them</H>
      <P>
        Schedo is built to need as little tracking as possible. We do <strong>not</strong> use
        advertising cookies, and we do <strong>not</strong> sell your data or share it with
        third-party ad networks. The only cookies and storage we rely on are:
      </P>

      <div className="my-6 overflow-hidden rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/60 text-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">Name / type</th>
              <th className="px-4 py-3 font-semibold">Purpose</th>
              <th className="px-4 py-3 font-semibold">Category</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-t border-border">
              <td className="px-4 py-3 align-top"><code className="rounded bg-muted px-1 py-0.5 text-xs">next-auth.session-token</code></td>
              <td className="px-4 py-3 align-top">Keeps a signed-in provider authenticated between pages.</td>
              <td className="px-4 py-3 align-top">Strictly necessary</td>
            </tr>
            <tr className="border-t border-border">
              <td className="px-4 py-3 align-top"><code className="rounded bg-muted px-1 py-0.5 text-xs">next-auth.csrf-token</code></td>
              <td className="px-4 py-3 align-top">Protects sign-in and form submissions against cross-site request forgery.</td>
              <td className="px-4 py-3 align-top">Strictly necessary</td>
            </tr>
            <tr className="border-t border-border">
              <td className="px-4 py-3 align-top"><code className="rounded bg-muted px-1 py-0.5 text-xs">next-auth.callback-url</code></td>
              <td className="px-4 py-3 align-top">Returns you to the right page after signing in.</td>
              <td className="px-4 py-3 align-top">Strictly necessary</td>
            </tr>
            <tr className="border-t border-border">
              <td className="px-4 py-3 align-top"><code className="rounded bg-muted px-1 py-0.5 text-xs">theme</code> (local storage)</td>
              <td className="px-4 py-3 align-top">Remembers your light / dark mode preference.</td>
              <td className="px-4 py-3 align-top">Functional</td>
            </tr>
          </tbody>
        </table>
      </div>

      <P>
        Guests who book do not need an account, so no authentication cookies are set for guest
        bookings — your booking is managed through the secure link we email you.
      </P>

      <H>Managing cookies</H>
      <P>
        You can delete or block cookies through your browser settings, and clear local storage the
        same way. Note that blocking the strictly-necessary cookies above will prevent providers from
        signing in and using the dashboard. Customers browsing and booking as guests are unaffected.
      </P>

      <H>Changes to this policy</H>
      <P>
        We may update this policy as our use of cookies changes. Material changes will be reflected by
        updating the &ldquo;Last updated&rdquo; date above.
      </P>

      <H>Contact</H>
      <P>
        Questions about cookies? Email us at{' '}
        <a href={`mailto:${CONTACT}`} className="text-primary hover:underline">{CONTACT}</a>.
      </P>

      <p className="mt-10 border-t border-border pt-6 text-sm text-muted-foreground">
        See also our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>{' '}
        and <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>.
      </p>
    </main>
  )
}
