import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Schedo — Book Local Service Providers',
  description: 'Find and book electricians, plumbers, gardeners, and more.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-stone-50 text-stone-900 min-h-screen`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
