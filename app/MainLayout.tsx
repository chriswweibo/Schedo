'use client'
import { usePathname } from 'next/navigation'
import { Navbar } from '@/components/ui/Navbar'

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuth = pathname.startsWith('/auth')

  if (isAuth) return <>{children}</>

  return (
    <>
      <Navbar />
      <div className="pt-12">{children}</div>
    </>
  )
}
