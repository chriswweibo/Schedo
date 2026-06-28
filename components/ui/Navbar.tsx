'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { Logo } from '@/components/ui/Logo'
import { ThemeToggle } from '@/components/ui/theme-toggle'

export function Navbar() {
  const { data: session, status } = useSession()
  const [me, setMe] = useState<{ name: string; avatarUrl: string | null } | null>(null)

  useEffect(() => {
    if (status !== 'authenticated') {
      setMe(null)
      return
    }
    let cancelled = false
    const load = () => {
      fetch('/api/me')
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (!cancelled) setMe(d) })
        .catch(() => {})
    }
    load()
    // AvatarUpload dispatches this after a successful change/remove.
    window.addEventListener('avatar-updated', load)
    return () => { cancelled = true; window.removeEventListener('avatar-updated', load) }
  }, [status])

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
            <Link
              href="/dashboard/settings"
              aria-label="Your profile"
              title="Your profile"
              className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-primary-light text-sm font-semibold text-primary ring-1 ring-border transition hover:ring-primary"
            >
              {me?.avatarUrl ? (
                <Image src={me.avatarUrl} alt={me.name ?? 'Your profile'} fill sizes="32px" className="object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center">{me?.name?.[0] ?? '·'}</span>
              )}
            </Link>
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
