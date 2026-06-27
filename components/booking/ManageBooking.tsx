'use client'
import { useState } from 'react'
import { parseISO, format } from 'date-fns'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Badge, BadgeVariant } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ProviderCalendar } from '@/components/provider/ProviderCalendar'

interface Initial {
  status: string
  providerName: string
  date: string // yyyy-MM-dd
  startTime: string
  endTime: string
}

export function ManageBooking({
  token, providerId, availability, initial,
}: {
  token: string
  providerId: string
  availability: Array<{ dayOfWeek: number; isActive: boolean }>
  initial: Initial
}) {
  const [status, setStatus] = useState(initial.status)
  const [date, setDate] = useState(initial.date)
  const [startTime, setStartTime] = useState(initial.startTime)
  const [endTime, setEndTime] = useState(initial.endTime)
  const [rescheduling, setRescheduling] = useState(false)
  const [busy, setBusy] = useState(false)

  const active = status === 'PENDING' || status === 'CONFIRMED'
  const dateLabel = (() => {
    try { return format(parseISO(date), 'EEEE, MMMM d, yyyy') } catch { return date }
  })()

  async function post(body: object): Promise<{ ok: boolean; data: { error?: string } }> {
    const res = await fetch('/api/booking-manage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    return { ok: res.ok, data }
  }

  async function handleCancel() {
    if (!window.confirm('Cancel this booking? This cannot be undone.')) return
    setBusy(true)
    try {
      const { ok, data } = await post({ token, action: 'cancel' })
      if (ok) { setStatus('CANCELLED'); setRescheduling(false); toast.success('Your booking was cancelled.') }
      else toast.error(data.error ?? 'Could not cancel. Please try again.')
    } catch { toast.error('Network error. Please try again.') } finally { setBusy(false) }
  }

  async function handleReschedule(newDate: string, newStart: string, newEnd: string) {
    setBusy(true)
    try {
      const { ok, data } = await post({ token, action: 'reschedule', date: newDate, startTime: newStart, endTime: newEnd })
      if (ok) {
        setDate(newDate); setStartTime(newStart); setEndTime(newEnd); setRescheduling(false)
        toast.success('Your booking was rescheduled.')
      } else toast.error(data.error ?? 'That time is no longer available.')
    } catch { toast.error('Network error. Please try again.') } finally { setBusy(false) }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-6 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="font-semibold">{initial.providerName}</p>
          <Badge variant={status.toLowerCase() as BadgeVariant}>{status.toLowerCase()}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{dateLabel}</p>
        <p className="text-sm font-medium text-foreground">{startTime} – {endTime}</p>
      </Card>

      {active ? (
        rescheduling ? (
          <Card className="p-4">
            <p className="text-sm font-semibold mb-2 text-foreground">Pick a new time</p>
            <ProviderCalendar
              providerId={providerId}
              availability={availability}
              onPick={handleReschedule}
              pickLabel="Move to"
            />
            <Button variant="ghost" className="mt-3 w-full" onClick={() => setRescheduling(false)} disabled={busy}>
              Keep current time
            </Button>
          </Card>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setRescheduling(true)} disabled={busy}>
              Reschedule
            </Button>
            <Button variant="ghost" className="flex-1" onClick={handleCancel} disabled={busy}>
              {busy ? 'Working…' : 'Cancel booking'}
            </Button>
          </div>
        )
      ) : (
        <p className="text-sm text-muted-foreground text-center">
          This booking is {status.toLowerCase()} and can no longer be changed.
        </p>
      )}
    </div>
  )
}
