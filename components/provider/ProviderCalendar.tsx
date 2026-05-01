'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  startOfMonth, endOfMonth, eachDayOfInterval, format,
  addMonths, subMonths, isToday, isBefore, startOfDay
} from 'date-fns'

interface ProviderCalendarProps {
  providerId: string
  availability: Array<{ dayOfWeek: number; isActive: boolean }>
}

type SlotStatus = 'available' | 'booked' | 'blocked' | 'outside'
interface TimeSlot { startTime: string; endTime: string; status: SlotStatus }

export function ProviderCalendar({ providerId, availability }: ProviderCalendarProps) {
  const [month, setMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
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
    setSelectedKeys(new Set())
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
      <div className="flex items-center justify-between mb-1.5">
        <button
          onClick={() => setMonth(subMonths(month, 1))}
          disabled={isCurrentMonth}
          className="p-0.5 text-stone-500 hover:text-stone-900 disabled:opacity-30 disabled:cursor-default"
        >←</button>
        <span className="text-sm font-semibold">{format(month, 'MMMM yyyy')}</span>
        <button onClick={() => setMonth(addMonths(month, 1))} className="p-0.5 text-stone-500 hover:text-stone-900">→</button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 text-center text-xs font-medium text-stone-400 mb-0.5">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5">
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
              className={`rounded py-1 text-xs transition
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
        <div className="mt-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-slate-700">
              {format(selectedDate, 'EEEE, MMMM d')}
            </p>
            {/* Legend */}
            <div className="flex items-center gap-2 text-[10px] text-stone-400">
              <span className="flex items-center gap-0.5"><span className="inline-block w-2 h-2 rounded-sm bg-indigo-500" /> Avail</span>
              <span className="flex items-center gap-0.5"><span className="inline-block w-2 h-2 rounded-sm bg-stone-200" /> Unavail</span>
              <span className="flex items-center gap-0.5"><span className="inline-block w-2 h-2 rounded-sm bg-blue-200" /> Booked</span>
            </div>
          </div>

          {loadingSlots ? (
            <div className="grid grid-cols-4 gap-1.5">
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className="h-8 rounded-lg bg-stone-100 animate-pulse" />
              ))}
            </div>
          ) : slotsError ? (
            <p className="text-xs text-red-500">{slotsError}</p>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-1.5">
                {slots.map((slot) => {
                  const key = `${slot.startTime}-${slot.endTime}`
                  const isSelected = selectedKeys.has(key)
                  const isAvailable = slot.status === 'available'

                  let cls = 'h-8 rounded-lg text-[11px] font-medium transition-all '
                  if (slot.status === 'outside')   cls += 'bg-stone-100 text-stone-300 cursor-default'
                  else if (slot.status === 'booked')   cls += 'bg-blue-100 text-blue-400 cursor-default'
                  else if (slot.status === 'blocked')  cls += 'bg-stone-200 text-stone-400 cursor-default'
                  else if (isSelected) cls += 'bg-indigo-600 text-white shadow-sm scale-[1.03]'
                  else cls += 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 cursor-pointer'

                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => {
                        if (!isAvailable) return
                        setSelectedKeys((prev) => {
                          const next = new Set(prev)
                          if (next.has(key)) next.delete(key)
                          else next.add(key)
                          return next
                        })
                      }}
                      className={cls}
                    >
                      {slot.startTime}
                    </button>
                  )
                })}
              </div>

              {selectedKeys.size > 0 && (() => {
                const selected = slots.filter((s) => selectedKeys.has(`${s.startTime}-${s.endTime}`))
                const startTime = selected[0].startTime
                const endTime   = selected[selected.length - 1].endTime
                return (
                  <Link
                    href={`/booking/${providerId}?date=${format(selectedDate, 'yyyy-MM-dd')}&start=${startTime}&end=${endTime}`}
                    className="mt-3 flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
                  >
                    Book {startTime}–{endTime} · {selected.length}h
                  </Link>
                )
              })()}
            </>
          )}
        </div>
      )}
    </div>
  )
}
