'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  startOfMonth, endOfMonth, eachDayOfInterval, format,
  addMonths, subMonths, isToday, isBefore, startOfDay
} from 'date-fns'
import { getRange } from '@/lib/slotRange'
import type { TimeSlot } from '@/lib/availability'

interface ProviderCalendarProps {
  providerId: string
  availability: Array<{ dayOfWeek: number; isActive: boolean }>
  /** When provided, the confirm button calls this with the picked slot
   *  (used for rescheduling) instead of linking to the booking page. */
  onPick?: (date: string, startTime: string, endTime: string) => void | Promise<void>
  pickLabel?: string
  /** When true, selecting a date reveals the time slots beside the calendar
   *  (the month grid shifts left) instead of below it, with a Back control. */
  slideToSide?: boolean
  /** Fires true when a date is selected and false when cleared — lets the
   *  parent hide surrounding content (e.g. the past-work carousel). */
  onSelectionChange?: (active: boolean) => void
}

type SelectionState =
  | { phase: 'idle' }
  | { phase: 'anchored'; anchorKey: string }
  | { phase: 'selected'; startKey: string; endKey: string }

export function ProviderCalendar({ providerId, availability, onPick, pickLabel, slideToSide, onSelectionChange }: ProviderCalendarProps) {
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
    onSelectionChange?.(true)
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

  function clearSelection() {
    setSelectedDate(null)
    setSelection({ phase: 'idle' })
    setHoverKey(null)
    setSlots([])
    setSlotsError(null)
    onSelectionChange?.(false)
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

  // Two-pane mode: calendar on the left, time slots revealed to the right.
  const twoPane = !!slideToSide && !!selectedDate

  return (
    <div className={twoPane ? 'flex flex-col gap-5 sm:flex-row sm:items-start' : undefined}>
      {/* Month panel — shifts left and narrows when a date is picked */}
      <div className={twoPane ? 'transition-all duration-300 sm:w-72 sm:shrink-0' : undefined}>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-1.5">
        <button
          onClick={() => { setMonth(subMonths(month, 1)); setSelection({ phase: 'idle' }); setHoverKey(null) }}
          disabled={isCurrentMonth}
          aria-label="Previous month"
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:cursor-default disabled:hover:bg-transparent"
        ><ChevronLeft className="h-4 w-4" aria-hidden /></button>
        <span className="text-sm font-semibold">{format(month, 'MMMM yyyy')}</span>
        <button
          onClick={() => { setMonth(addMonths(month, 1)); setSelection({ phase: 'idle' }); setHoverKey(null) }}
          aria-label="Next month"
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        ><ChevronRight className="h-4 w-4" aria-hidden /></button>
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
                ${isSelected ? 'bg-primary text-primary-foreground' : ''}
                ${isClickable && !isSelected ? 'bg-primary-light text-primary hover:bg-primary hover:text-primary-foreground' : ''}
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
      </div>{/* /month panel */}

      {/* Slots */}
      {selectedDate && (
        <div className={twoPane ? 'min-w-0 flex-1 animate-in fade-in slide-in-from-right-4 duration-300' : 'mt-3'}>
          {slideToSide && (
            <button
              type="button"
              onClick={clearSelection}
              className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Back
            </button>
          )}
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-foreground">
              {format(selectedDate, 'EEEE, MMMM d')}
            </p>
            {/* Legend */}
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-0.5"><span className="inline-block w-2 h-2 rounded-sm bg-primary" /> Available</span>
              <span className="flex items-center gap-0.5"><span className="inline-block w-2 h-2 rounded-sm bg-amber-400" /> Booked</span>
              <span className="flex items-center gap-0.5"><span className="inline-block w-2 h-2 rounded-sm bg-orange-400" /> Pending</span>
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
                  else if (slot.status === 'pending') cls += 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300 cursor-default'
                  else if (slot.status === 'blocked') cls += 'bg-muted text-muted-foreground cursor-default'
                  else if (isAnchor)                  cls += 'bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/40 ring-offset-1 ring-offset-background'
                  else if (inSelection)               cls += 'bg-primary text-primary-foreground shadow-sm'
                  else if (inPreview)                 cls += 'bg-primary/60 text-primary-foreground'
                  else                                cls += 'bg-primary-light text-primary hover:bg-primary hover:text-primary-foreground cursor-pointer'

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
                const dateStr = format(selectedDate!, 'yyyy-MM-dd')
                return onPick ? (
                  <button
                    type="button"
                    onClick={() => onPick(dateStr, anchorSlot.startTime, anchorSlot.endTime)}
                    className="mt-3 flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition"
                  >
                    {pickLabel ?? 'Move to'} {anchorSlot.startTime}–{anchorSlot.endTime} · 1h
                  </button>
                ) : (
                  <Link
                    href={`/booking/${providerId}?date=${dateStr}&start=${anchorSlot.startTime}&end=${anchorSlot.endTime}`}
                    className="mt-3 flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition"
                  >
                    Book {anchorSlot.startTime}–{anchorSlot.endTime} · 1h
                  </Link>
                )
              })()}

              {/* Range booking: shown after two different slots are selected */}
              {selectionRange && selectionRange.length > 0 && (() => {
                const startTime = selectionRange[0].startTime
                const endTime   = selectionRange[selectionRange.length - 1].endTime
                const dateStr = format(selectedDate!, 'yyyy-MM-dd')
                return onPick ? (
                  <button
                    type="button"
                    onClick={() => onPick(dateStr, startTime, endTime)}
                    className="mt-3 flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition"
                  >
                    {pickLabel ?? 'Move to'} {startTime}–{endTime} · {selectionRange.length}h
                  </button>
                ) : (
                  <Link
                    href={`/booking/${providerId}?date=${dateStr}&start=${startTime}&end=${endTime}`}
                    className="mt-3 flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition"
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
