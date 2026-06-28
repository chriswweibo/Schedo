'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Field } from '@/components/ui/field'
import { Button } from '@/components/ui/button'

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
  const [conflict, setConflict] = useState(false)

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
        return
      }

      // Slot taken between selection and submit — surface it as a toast and
      // let the customer pick another time (their inputs stay on screen).
      if (res.status === 409) {
        setConflict(true)
        toast.error('That time slot was just taken', {
          description: 'Someone grabbed it first — please pick another time.',
        })
        return
      }
      if (res.status === 429) {
        toast.error('Too many attempts', {
          description: 'Please wait a moment and try again.',
        })
        return
      }

      const data = await res.json().catch(() => ({}))
      const err = data.error
      if (err?.fieldErrors) {
        const msgs = Object.values(err.fieldErrors as Record<string, string[]>).flat()
        setError(msgs[0] ?? 'Booking failed. Please try again.')
      } else if (typeof err === 'string') {
        setError(err)
      } else {
        setError('Booking failed. Please try again.')
      }
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Your name" autoComplete="name" value={form.guestName} onChange={update('guestName')} required />
      <Field label="Email" type="email" inputMode="email" autoComplete="email" value={form.guestEmail} onChange={update('guestEmail')} required />
      <Field label="Phone (optional)" type="tel" inputMode="tel" autoComplete="tel" value={form.guestPhone} onChange={update('guestPhone')} />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-foreground">Notes (optional)</label>
        <textarea
          value={form.notes}
          onChange={update('notes')}
          rows={3}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="Anything the provider should know?"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {conflict ? (
        <Button type="button" onClick={() => router.back()}>
          Pick another time
        </Button>
      ) : (
        <Button type="submit" disabled={loading}>
          {loading ? 'Processing…' : bookingType === 'REQUEST' ? 'Send booking request' : 'Confirm booking'}
        </Button>
      )}
    </form>
  )
}
