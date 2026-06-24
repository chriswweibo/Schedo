'use client'
import { Suspense, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/Logo'
import { GoogleButton } from '@/components/auth/GoogleButton'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const registered = searchParams.get('registered')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await signIn('credentials', { email, password, redirect: false })
    setLoading(false)
    if (result?.error) {
      setError('Invalid email or password')
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between bg-stone-900 px-12 py-16 text-white">
        <Link href="/"><Logo variant="lockup" size={32} textColor="light" /></Link>
        <div>
          <p className="text-4xl font-bold leading-tight mb-4">
            Welcome back to your provider dashboard
          </p>
          <p className="text-stone-400 text-lg">
            Manage your bookings, availability, and profile all in one place.
          </p>
        </div>
        <p className="text-stone-500 text-sm">© {new Date().getFullYear()} Schedo</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <Link href="/" className="lg:hidden block mb-8"><Logo variant="lockup" size={30} /></Link>

          <h1 className="text-2xl font-bold text-stone-900 mb-1">Sign in</h1>
          <p className="text-stone-500 text-sm mb-8">
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" className="text-stone-900 font-medium hover:underline">
              Register as a provider
            </Link>
          </p>

          {registered && (
            <div className="mb-6 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
              Account created — sign in to continue.
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={loading} className="mt-2">
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
          <div className="mt-4">
            <GoogleButton />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
