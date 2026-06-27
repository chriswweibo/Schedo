'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/ui/Navbar'
import { GuestHeader } from '@/components/ui/GuestHeader'

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
      <footer className="border-t border-border px-6 py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 text-sm text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} Schedo</span>
          <nav className="flex items-center gap-5">
            <Link href="/search" className="hover:text-foreground transition">Find providers</Link>
            <Link href="/privacy" className="hover:text-foreground transition">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition">Terms</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
