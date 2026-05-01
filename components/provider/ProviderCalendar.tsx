'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  startOfMonth, endOfMonth, eachDayOfInterval, format,
  addMonths, subMonths, isToday, isBefore, startOfDay
} from 'date-fns'
import { Button } from '@/components/ui/Button'

interface ProviderCalendarProps {
  providerId: string
  availability: Array<{ dayOfWeek: number; isActive: boolean }>
}

interface TimeSlot { startTime: string; endTime: string }

export function ProviderCalendar({ providerId, availability }: ProviderCalendarProps) {
  const [month, setMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [slotsError, setSlotsError] = useState<string | null>(null)

  const today = startOfDay(new Date())

  const activeDays = new Set(
    availability.filter((a) => a.isActive).map((a) => a.dayOfWeek)
  )

  const days = eachDayOfInterval({
    start: startOfMonth(month),
    end: endOfMonth(month),
  })

  const startPad = startOfMonth(month).getDay() // 0=Sun

  const isCurrentMonth = month.getFullYear() === new Date().getFullYear() && month.getMonth() === new Date().getMonth()

  async function handleDayClick(day: Date) {
    if (!activeDays.has(day.getDay())) return
    if (isBefore(day, today)) return
    setSelectedDate(day)
    setLoadingSlots(true)
    setSlotsError(null)
    const dateStr = format(day, 'yyyy-MM-dd')
    try {
      const res = await fetch(`/api/availability/${providerId}?date=${dateStr}`)
      if (!res.ok) throw new Error('Failed to load slots')
      const data: TimeSlot[] = await res.json()
      setSlots(data)
    } catch {
      setSlotsError('Could not load available slots. Please try again.')
      setSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }

  return (
    <div>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setMonth(subMonths(month, 1))}
          disabled={isCurrentMonth}
          className="p-1 text-stone-500 hover:text-stone-900 disabled:opacity-30 disabled:cursor-default"
        >←</button>
        <span className="font-semibold">{format(month, 'MMMM yyyy')}</span>
        <button onClick={() => setMonth(addMonths(month, 1))} className="p-1 text-stone-500 hover:text-stone-900">→</button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 text-center text-xs font-medium text-stone-400 mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
        {days.map((day) => {
          const isAvail = activeDays.has(day.getDay())
          const isPast = isBefore(day, today)
          const isSelected = selectedDate && format(selectedDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')

          return (
            <button
              key={day.toISOString()}
              onClick={() => handleDayClick(day)}
              disabled={!isAvail || isPast}
              className={`rounded-lg py-1.5 text-sm transition
                ${isSelected ? 'bg-primary text-white' : ''}
                ${isAvail && !isPast && !isSelected ? 'bg-primary-light text-primary hover:bg-primary hover:text-white' : ''}
                ${!isAvail || isPast ? 'text-stone-300 cursor-default' : ''}
                ${isToday(day) && !isSelected ? 'font-bold' : ''}
              `}
            >
              {format(day, 'd')}
            </button>
          )
        })}
      </div>

      {/* Slots */}
      {selectedDate && (
        <div className="mt-4">
          <p className="mb-2 text-sm font-medium text-stone-700">
            Available slots for {format(selectedDate, 'MMMM d')}
          </p>
          {loadingSlots ? (
            <p className="text-sm text-stone-400">Loading…</p>
          ) : slotsError ? (
            <p className="text-sm text-red-600">{slotsError}</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-stone-400">No available slots for this day.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {slots.map((slot) => (
                <Link
                  key={`${slot.startTime}-${slot.endTime}`}
                  href={`/booking/${providerId}?date=${format(selectedDate, 'yyyy-MM-dd')}&start=${slot.startTime}&end=${slot.endTime}`}
                  className="rounded-lg border border-primary px-3 py-1 text-sm text-primary hover:bg-primary hover:text-white transition"
                >
                  {slot.startTime}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
