import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'
import { ThemeToggle } from '@/components/ui/theme-toggle'

// Header for guest-facing booking pages. Guests have no account, so this
// deliberately omits the provider account navigation (Dashboard/Sign in/Register).
export function GuestHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-2 bg-background/80 backdrop-blur border-b border-border">
      <Link href="/" className="hover:opacity-80 transition">
        <Logo variant="lockup" size={30} />
      </Link>
      <ThemeToggle />
    </header>
  )
}
