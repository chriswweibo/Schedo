'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface Initial {
  date: string
  startTime: string
  endTime: string
  status: string
  guestName: string
  guestPhone: string
  notes: string
}

type Slot = { startTime: string; endTime: string; status: string }

export function ManageBookingClient({
  token,
  providerId,
  initial,
}: {
  token: string
  providerId: string
  initial: Initial
}) {
  const router = useRouter()
  const [details, setDetails] = useState({
    guestName: initial.guestName,
    guestPhone: initial.guestPhone,
    notes: initial.notes,
  })
  const [rescheduleDate, setRescheduleDate] = useState(initial.date)
  const [slots, setSlots] = useState<Slot[]>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function call(body: unknown) {
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const res = await fetch(`/api/bookings/manage/${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok) {
        setMessage('Saved.')
        router.refresh()
      } else {
        setError(typeof data.error === 'string' ? data.error : 'Update failed. Please try again.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function loadSlots(date: string) {
    setRescheduleDate(date)
    const res = await fetch(`/api/availability/${providerId}?date=${date}`)
    if (res.ok) setSlots(await res.json())
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="mb-1 text-lg font-semibold">Current booking</h2>
        <p className="text-sm text-stone-600">
          {initial.date} · {initial.startTime} – {initial.endTime} · {initial.status}
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Edit details</h2>
        <Input
          label="Your name"
          value={details.guestName}
          onChange={(e) => setDetails((d) => ({ ...d, guestName: e.target.value }))}
        />
        <Input
          label="Phone"
          value={details.guestPhone}
          onChange={(e) => setDetails((d) => ({ ...d, guestPhone: e.target.value }))}
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-stone-700">Notes</label>
          <textarea
            value={details.notes}
            onChange={(e) => setDetails((d) => ({ ...d, notes: e.target.value }))}
            rows={3}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <Button
          variant="secondary"
          disabled={loading}
          onClick={() => call({ action: 'edit', ...details })}
        >
          Save details
        </Button>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Reschedule</h2>
        <Input
          label="New date"
          type="date"
          value={rescheduleDate}
          onChange={(e) => loadSlots(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {slots
            .filter((s) => s.status === 'available')
            .map((s) => (
              <Button
                key={s.startTime}
                variant="secondary"
                disabled={loading}
                onClick={() =>
                  call({
                    action: 'reschedule',
                    date: rescheduleDate,
                    startTime: s.startTime,
                    endTime: s.endTime,
                  })
                }
              >
                {s.startTime}
              </Button>
            ))}
          {slots.length > 0 && slots.every((s) => s.status !== 'available') && (
            <p className="text-sm text-stone-500">No open slots that day.</p>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-3 border-t border-stone-200 pt-6">
        <h2 className="text-lg font-semibold text-red-600">Cancel booking</h2>
        <Button
          variant="secondary"
          disabled={loading}
          onClick={() => {
            if (confirm('Cancel this booking? This cannot be undone.')) call({ action: 'cancel' })
          }}
        >
          Cancel booking
        </Button>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {message && <p className="text-sm text-green-600">{message}</p>}
    </div>
  )
}
