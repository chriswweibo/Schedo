'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  startOfMonth, endOfMonth, eachDayOfInterval, format,
  addMonths, subMonths, isToday, isBefore, startOfDay
} from 'date-fns'
import { getRange } from '@/lib/slotRange'
import type { TimeSlot } from '@/lib/availability'

interface ProviderCalendarProps {
  providerId: string
  availability: Array<{ dayOfWeek: number; isActive: boolean }>
}

type SelectionState =
  | { phase: 'idle' }
  | { phase: 'anchored'; anchorKey: string }
  | { phase: 'selected'; startKey: string; endKey: string }

export function ProviderCalendar({ providerId, availability }: ProviderCalendarProps) {
  const [month, setMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selection, setSelection] = useState<SelectionState>({ phase: 'idle' })
  const [hoverKey, setHoverKey] = useState<string | null>(null)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [slotsError, setSlotsError] = useState<string | null>(null)
  const [fullyBookedDays, setFullyBookedDays] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const controller = new AbortController()
    const monthKey = format(month, 'yyyy-MM')
    fetch(`/api/availability/${providerId}?month=${monthKey}`, { signal: controller.signal })
      .then((r) => r.ok ? r.json() : {})
      .then(setFullyBookedDays)
      .catch((err) => { if (err.name !== 'AbortError') setFullyBookedDays({}) })
    return () => controller.abort()
  }, [providerId, month])

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
    setSelection({ phase: 'idle' })
    setHoverKey(null)
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

  const previewSet = useMemo<Set<string>>(() => {
    if (selection.phase !== 'anchored' || !hoverKey || hoverKey === selection.anchorKey) {
      return new Set()
    }
    const range = getRange(slots, selection.anchorKey, hoverKey)
    if (!range) return new Set()
    return new Set(range.map((s) => s.startTime))
  }, [slots, selection, hoverKey])

  const selectionRange = useMemo<TimeSlot[] | null>(() => {
    if (selection.phase !== 'selected') return null
    return getRange(slots, selection.startKey, selection.endKey)
  }, [slots, selection])

  const selectionSet = useMemo<Set<string>>(() => {
    if (!selectionRange) return new Set()
    return new Set(selectionRange.map((s) => s.startTime))
  }, [selectionRange])

  return (
    <div>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-1.5">
        <button
          onClick={() => { setMonth(subMonths(month, 1)); setSelection({ phase: 'idle' }); setHoverKey(null) }}
          disabled={isCurrentMonth}
          className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-default"
        >←</button>
        <span className="text-sm font-semibold">{format(month, 'MMMM yyyy')}</span>
        <button onClick={() => { setMonth(addMonths(month, 1)); setSelection({ phase: 'idle' }); setHoverKey(null) }} className="p-0.5 text-muted-foreground hover:text-foreground">→</button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 text-center text-xs font-medium text-muted-foreground mb-0.5">
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
          const dateKey = format(day, 'yyyy-MM-dd')
          const isFullyBooked = isAvail && !isPast && fullyBookedDays[dateKey] === true
          const isSelected = selectedDate && dateKey === format(selectedDate, 'yyyy-MM-dd')
          const isClickable = isAvail && !isPast && !isFullyBooked

          return (
            <button
              key={day.toISOString()}
              onClick={() => handleDayClick(day)}
              disabled={!isClickable}
              aria-label={`${format(day, 'EEEE, d MMMM yyyy')}${isFullyBooked ? ', fully booked' : !isClickable ? ', unavailable' : ''}`}
              aria-pressed={!!isSelected}
              className={`rounded py-1 text-xs transition
                ${isSelected ? 'bg-primary text-white' : ''}
                ${isClickable && !isSelected ? 'bg-primary-light text-primary hover:bg-primary hover:text-white' : ''}
                ${isFullyBooked ? 'bg-muted text-muted-foreground cursor-default' : ''}
                ${!isAvail || isPast ? 'text-muted-foreground/50 cursor-default' : ''}
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
            <p className="text-xs font-semibold text-foreground">
              {format(selectedDate, 'EEEE, MMMM d')}
            </p>
            {/* Legend */}
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-0.5"><span className="inline-block w-2 h-2 rounded-sm bg-blue-500" /> Available</span>
              <span className="flex items-center gap-0.5"><span className="inline-block w-2 h-2 rounded-sm bg-amber-400" /> Booked</span>
              <span className="flex items-center gap-0.5"><span className="inline-block w-2 h-2 rounded-sm bg-muted-foreground/30" /> Unavailable</span>
            </div>
          </div>

          {loadingSlots ? (
            <div className="grid grid-cols-4 gap-1.5">
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className="h-8 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : slotsError ? (
            <p className="text-xs text-red-500">{slotsError}</p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-2">Click a start time, then an end time to pick a range.</p>
              <div className="grid grid-cols-4 gap-1.5">
                {slots.map((slot) => {
                  const key = slot.startTime
                  const isAvailable = slot.status === 'available'
                  const isAnchor    = selection.phase === 'anchored' && selection.anchorKey === key
                  const inPreview   = previewSet.has(key)
                  const inSelection = selectionSet.has(key)

                  let cls = 'h-8 rounded-lg text-[11px] font-medium transition-all '
                  if (slot.status === 'outside')      cls += 'bg-muted text-muted-foreground/50 cursor-default'
                  else if (slot.status === 'booked')  cls += 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 cursor-default line-through'
                  else if (slot.status === 'blocked') cls += 'bg-muted text-muted-foreground cursor-default'
                  else if (isAnchor)                  cls += 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-300 ring-offset-1'
                  else if (inSelection)               cls += 'bg-indigo-600 text-white shadow-sm'
                  else if (inPreview)                 cls += 'bg-indigo-400 text-white opacity-75'
                  else                                cls += 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 cursor-pointer'

                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={!isAvailable}
                      aria-label={`${slot.startTime} to ${slot.endTime}, ${slot.status}`}
                      onMouseEnter={() => { if (isAvailable) setHoverKey(key) }}
                      onMouseLeave={() => setHoverKey(null)}
                      onClick={() => {
                        if (!isAvailable) return

                        if (selection.phase === 'idle') {
                          setSelection({ phase: 'anchored', anchorKey: key })
                          return
                        }

                        if (selection.phase === 'anchored') {
                          if (key === selection.anchorKey) {
                            setSelection({ phase: 'idle' })
                            return
                          }
                          const range = getRange(slots, selection.anchorKey, key)
                          if (range) {
                            setSelection({
                              phase: 'selected',
                              startKey: range[0].startTime,
                              endKey: range[range.length - 1].startTime,
                            })
                          }
                          return
                        }

                        // phase === 'selected' — clicking a new slot re-anchors immediately
                        setSelection({ phase: 'anchored', anchorKey: key })
                        setHoverKey(null)
                      }}
                      className={cls}
                    >
                      {slot.startTime}
                    </button>
                  )
                })}
              </div>

              {/* Single-hour booking: show Book link as soon as one slot is anchored */}
              {selection.phase === 'anchored' && (() => {
                const anchorSlot = slots.find((s) => s.startTime === selection.anchorKey)
                if (!anchorSlot) return null
                return (
                  <Link
                    href={`/booking/${providerId}?date=${format(selectedDate!, 'yyyy-MM-dd')}&start=${anchorSlot.startTime}&end=${anchorSlot.endTime}`}
                    className="mt-3 flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
                  >
                    Book {anchorSlot.startTime}–{anchorSlot.endTime} · 1h
                  </Link>
                )
              })()}

              {/* Range booking: shown after two different slots are selected */}
              {selectionRange && selectionRange.length > 0 && (() => {
                const startTime = selectionRange[0].startTime
                const endTime   = selectionRange[selectionRange.length - 1].endTime
                return (
                  <Link
                    href={`/booking/${providerId}?date=${format(selectedDate!, 'yyyy-MM-dd')}&start=${startTime}&end=${endTime}`}
                    className="mt-3 flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition"
                  >
                    Book {startTime}–{endTime} · {selectionRange.length}h
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
