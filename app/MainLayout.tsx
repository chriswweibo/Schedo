'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Navbar } from '@/components/ui/Navbar'

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuth = pathname.startsWith('/auth')

  if (isAuth) return <>{children}</>

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="flex-1 pt-12">{children}</div>
      <footer className="border-t border-stone-200 px-6 py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 text-sm text-stone-500 sm:flex-row">
          <span>© {new Date().getFullYear()} Schedo</span>
          <nav className="flex items-center gap-5">
            <Link href="/search" className="hover:text-stone-900 transition">Find providers</Link>
            <Link href="/privacy" className="hover:text-stone-900 transition">Privacy</Link>
            <Link href="/terms" className="hover:text-stone-900 transition">Terms</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
