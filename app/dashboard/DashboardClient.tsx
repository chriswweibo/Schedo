'use client'
import { useState } from 'react'
import { BookingRow } from '@/components/dashboard/BookingRow'

type Booking = {
  id: string; guestName: string; guestEmail: string;
  date: Date; startTime: string; endTime: string;
  status: 'PENDING' | 'CONFIRMED' | 'DECLINED' | 'CANCELLED'
}

export function DashboardClient({
  upcoming: initialUpcoming,
  pending: initialPending,
}: {
  upcoming: Booking[]
  pending: Booking[]
}) {
  const [pending, setPending] = useState(initialPending)

  function handleStatusChange(id: string, newStatus: 'CONFIRMED' | 'DECLINED') {
    setPending((prev) => prev.filter((b) => b.id !== id))
  }

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h2 className="mb-4 text-lg font-semibold">Pending requests ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="text-stone-400">No pending requests.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {pending.map((b) => (
              <BookingRow key={b.id} {...b} onStatusChange={handleStatusChange} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold">Upcoming bookings ({initialUpcoming.length})</h2>
        {initialUpcoming.length === 0 ? (
          <p className="text-stone-400">No upcoming bookings.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {initialUpcoming.map((b) => (
              <BookingRow key={b.id} {...b} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
