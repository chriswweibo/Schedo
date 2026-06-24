'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface BookingFormProps {
  providerId: string
  providerName: string
  date: string
  startTime: string
  endTime: string
  bookingMode: 'INSTANT' | 'REQUEST' | 'BOTH'
}

export function BookingForm({
  providerId, providerName, date, startTime, endTime, bookingMode,
}: BookingFormProps) {
  const router = useRouter()
  const [form, setForm] = useState({ guestName: '', guestEmail: '', guestPhone: '', notes: '' })
  const bookingType = bookingMode === 'REQUEST' ? 'REQUEST' : 'INSTANT'
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, date, startTime, endTime, bookingType, ...form }),
      })
      if (res.ok) {
        const data = await res.json()
        router.push(
          `/booking/confirmation?status=${data.status}&provider=${encodeURIComponent(providerName)}&date=${date}&start=${startTime}&end=${endTime}`
        )
      } else {
        const data = await res.json()
        const err = data.error
        if (typeof err === 'string') {
          setError(err)
        } else if (err?.fieldErrors) {
          const msgs = Object.values(err.fieldErrors as Record<string, string[]>).flat()
          setError(msgs[0] ?? 'Booking failed. Please try again.')
        } else {
          setError('Booking failed. Please try again.')
        }
      }
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input label="Your name" value={form.guestName} onChange={update('guestName')} required />
      <Input label="Email" type="email" value={form.guestEmail} onChange={update('guestEmail')} required />
      <Input label="Phone (optional)" type="tel" value={form.guestPhone} onChange={update('guestPhone')} />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-stone-700">Notes (optional)</label>
        <textarea
          value={form.notes}
          onChange={update('notes')}
          rows={3}
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="Anything the provider should know?"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {error === 'This time slot is no longer available' ? (
        <Button type="button" onClick={() => router.back()}>
          Go back
        </Button>
      ) : (
        <Button type="submit" disabled={loading}>
          {loading ? 'Processing…' : 'Confirm booking'}
        </Button>
      )}
    </form>
  )
}
