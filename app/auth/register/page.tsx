'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', password: '', profession: '' })
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
    const res = await fetch('/api/providers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setLoading(false)
    if (res.ok) {
      router.push('/auth/login?registered=1')
    } else {
      const data = await res.json()
      setError(data.error ?? 'Registration failed')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md p-8">
        <h1 className="mb-6 text-2xl font-semibold">Join as a Provider</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="Full name" value={form.name} onChange={update('name')} required />
          <Input label="Email" type="email" value={form.email} onChange={update('email')} required />
          <Input label="Password" type="password" value={form.password} onChange={update('password')} required />
          <Input label="Profession (e.g. Electrician)" value={form.profession} onChange={update('profession')} required />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={loading}>{loading ? 'Creating account…' : 'Create account'}</Button>
        </form>
        <p className="mt-4 text-sm text-stone-500">
          Already registered?{' '}
          <Link href="/auth/login" className="text-primary hover:underline">Sign in</Link>
        </p>
      </Card>
    </div>
  )
}
