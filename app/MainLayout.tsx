'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/ui/Navbar'
import { GuestHeader } from '@/components/ui/GuestHeader'
import { Logo } from '@/components/ui/Logo'

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuth = pathname.startsWith('/auth')
  // Guest booking flow (no account) — show a minimal header, not the provider nav.
  const isGuestFlow = pathname.startsWith('/booking')

  if (isAuth) return <>{children}</>

  return (
    <div className="flex min-h-screen flex-col">
      {isGuestFlow ? <GuestHeader /> : <Navbar />}
      <div className="flex-1 pt-12">{children}</div>
      <footer className="border-t border-border bg-muted/30 px-6 py-12">
        <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo variant="lockup" tone="mono" size={30} className="text-foreground" />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              Book trusted local professionals — pick a time and book in minutes, no account needed.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Discover</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link href="/search" className="hover:text-foreground transition">Find providers</Link></li>
              <li><Link href="/auth/register" className="hover:text-foreground transition">List your services</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Company</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link href="/about" className="hover:text-foreground transition">About us</Link></li>
              <li><Link href="/contact" className="hover:text-foreground transition">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Legal</h3>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li><Link href="/privacy" className="hover:text-foreground transition">Privacy policy</Link></li>
              <li><Link href="/terms" className="hover:text-foreground transition">Terms</Link></li>
              <li><Link href="/cookies" className="hover:text-foreground transition">Cookie policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-6xl border-t border-border pt-6 text-sm text-muted-foreground">
          © {new Date().getFullYear()} Schedo
        </div>
      </footer>
    </div>
  )
}
