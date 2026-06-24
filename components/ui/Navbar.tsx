'use client'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { Logo } from '@/components/ui/Logo'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export function Navbar() {
  const { data: session } = useSession()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-2 bg-background/80 backdrop-blur border-b border-border">
      <Link href="/" className="hover:opacity-80 transition">
        <Logo variant="lockup" size={30} />
      </Link>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        {session ? (
          <>
            <Link
              href="/dashboard"
              className="rounded-lg px-4 py-1.5 text-sm font-medium text-foreground hover:bg-accent transition"
            >
              Dashboard
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: '/auth/login' })}
              className="rounded-lg border border-border px-4 py-1.5 text-sm font-medium text-foreground hover:bg-accent transition"
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link
              href="/auth/login"
              className="rounded-lg px-4 py-1.5 text-sm font-medium text-foreground hover:bg-accent transition"
            >
              Sign in
            </Link>
            <Link
              href="/auth/register"
              className="rounded-lg bg-foreground px-4 py-1.5 text-sm font-medium text-background hover:opacity-90 transition"
            >
              Register
            </Link>
          </>
        )}
      </div>
    </header>
  )
}
