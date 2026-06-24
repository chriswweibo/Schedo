'use client'
import { useState } from 'react'
import { format } from 'date-fns'
import { Badge, BadgeVariant } from '@/components/ui/Badge'
import { Button } from '@/components/ui/button'

interface BookingRowProps {
  id: string
  guestName: string
  guestEmail: string
  date: string | Date
  startTime: string
  endTime: string
  status: 'PENDING' | 'CONFIRMED' | 'DECLINED' | 'CANCELLED'
  onStatusChange?: (id: string, newStatus: 'CONFIRMED' | 'DECLINED') => void
}

export function BookingRow({
  id, guestName, guestEmail, date, startTime, endTime, status, onStatusChange,
}: BookingRowProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleAction(newStatus: 'CONFIRMED' | 'DECLINED') {
    setLoading(newStatus)
    setError(null)
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error ?? 'Action failed. Please try again.')
        return
      }
      onStatusChange?.(id, newStatus)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex-1 min-w-0">
        <p className="font-semibold">{guestName}</p>
        <p className="text-sm text-stone-500">{guestEmail}</p>
        <p className="text-sm text-stone-600">
          {format(new Date(date), 'MMMM d, yyyy')} · {startTime}–{endTime}
        </p>
      </div>
      <Badge variant={status.toLowerCase() as BadgeVariant} />
      {status === 'PENDING' && (
        <div className="flex gap-2">
          <Button
            variant="default"
            onClick={() => handleAction('CONFIRMED')}
            disabled={loading !== null}
          >
            {loading === 'CONFIRMED' ? '…' : 'Accept'}
          </Button>
          <Button
            variant="ghost"
            onClick={() => handleAction('DECLINED')}
            disabled={loading !== null}
          >
            {loading === 'DECLINED' ? '…' : 'Decline'}
          </Button>
        </div>
      )}
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </div>
  )
}
