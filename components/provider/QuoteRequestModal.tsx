'use client'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { X } from 'lucide-react'
import { Field } from '@/components/ui/field'
import { Button } from '@/components/ui/button'

interface SelectedProvider {
  id: string
  name: string
}

export function QuoteRequestModal({
  providers,
  open,
  onClose,
  onSent,
}: {
  providers: SelectedProvider[]
  open: boolean
  onClose: () => void
  onSent: () => void
}) {
  const [form, setForm] = useState({ guestName: '', guestEmail: '', guestPhone: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerIds: providers.map((p) => p.id), ...form }),
      })
      if (res.ok) {
        const data = await res.json()
        toast.success(`Request sent to ${data.sentTo} provider${data.sentTo > 1 ? 's' : ''}`, {
          description: 'They’ll reply to you by email with a quote.',
        })
        setForm({ guestName: '', guestEmail: '', guestPhone: '', message: '' })
        onSent()
        return
      }
      if (res.status === 429) {
        setError('Too many requests — please wait a moment and try again.')
        return
      }
      const data = await res.json().catch(() => ({}))
      const fieldErrs = data.error?.fieldErrors
      setError(
        fieldErrs ? (Object.values(fieldErrs).flat()[0] as string) :
        typeof data.error === 'string' ? data.error :
        'Could not send your request. Please try again.'
      )
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Request quotes"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-card p-6 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-start justify-between gap-4">
          <h2 className="text-xl font-bold text-foreground">Request quotes</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Describe what you need — we’ll send it to {providers.length} provider{providers.length > 1 ? 's' : ''}, who’ll reply with a quote. No date needed.
        </p>

        <div className="mb-4 flex flex-wrap gap-1.5">
          {providers.map((p) => (
            <span key={p.id} className="rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-medium text-primary">
              {p.name}
            </span>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Your name" autoComplete="name" value={form.guestName} onChange={update('guestName')} required />
          <Field label="Email" type="email" inputMode="email" autoComplete="email" value={form.guestEmail} onChange={update('guestEmail')} required />
          <Field label="Phone (optional)" type="tel" inputMode="tel" autoComplete="tel" value={form.guestPhone} onChange={update('guestPhone')} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="quote-message" className="text-sm font-medium text-foreground">What do you need done?</label>
            <textarea
              id="quote-message"
              value={form.message}
              onChange={update('message')}
              rows={4}
              required
              minLength={10}
              placeholder="e.g. Need a 3-bedroom house repainted, walls and ceilings. When are you available and what would it cost?"
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={loading}>
            {loading ? 'Sending…' : `Send request to ${providers.length} provider${providers.length > 1 ? 's' : ''}`}
          </Button>
        </form>
      </div>
    </div>
  )
}
