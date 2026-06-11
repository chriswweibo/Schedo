'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Logo } from '@/components/ui/Logo'
import { GoogleButton } from '@/components/auth/GoogleButton'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function update(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        router.push('/auth/login?registered=1')
      } else {
        const data = await res.json()
        setError(typeof data.error === 'string' ? data.error : 'Registration failed. Please try again.')
      }
    } catch {
      setError('Network error. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Brand panel */}
      <div className="hidden lg:flex flex-col justify-between bg-stone-900 px-12 py-16 text-white">
        <Link href="/"><Logo variant="lockup" size={32} textColor="light" /></Link>
        <div>
          <p className="text-4xl font-bold leading-tight mb-4">
            Start receiving bookings today
          </p>
          <p className="text-stone-400 text-lg">
            Create your provider profile, set your availability, and let customers find and book you — for free.
          </p>
          <ul className="mt-8 flex flex-col gap-3 text-stone-300 text-sm">
            {[
              'Free provider profile',
              'Manage your own availability',
              'Instant or request-based bookings',
              'Email notifications for every booking',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="text-green-400">✓</span> {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-stone-500 text-sm">© {new Date().getFullYear()} Schedo</p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <Link href="/" className="lg:hidden block mb-8"><Logo variant="lockup" size={30} /></Link>

          <h1 className="text-2xl font-bold text-stone-900 mb-1">Create your account</h1>
          <p className="text-stone-500 text-sm mb-8">
            Already registered?{' '}
            <Link href="/auth/login" className="text-stone-900 font-medium hover:underline">
              Sign in
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Full name"
              value={form.name}
              onChange={update('name')}
              required
              autoComplete="name"
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={update('email')}
              required
              autoComplete="email"
            />
            <Input
              label="Password"
              type="password"
              value={form.password}
              onChange={update('password')}
              required
              autoComplete="new-password"
              minLength={8}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={loading} className="mt-2">
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
          <div className="mt-4">
            <GoogleButton label="Sign up with Google" />
          </div>
        </div>
      </div>
    </div>
  )
}
