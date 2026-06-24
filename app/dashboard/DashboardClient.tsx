'use client'
import React, { useState, useEffect, useCallback, useRef } from 'react'
import { BookingRow } from '@/components/dashboard/BookingRow'
import { Field } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { WorksCarousel } from '@/components/provider/WorksCarousel'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

type Booking = {
  id: string; guestName: string; guestEmail: string;
  date: Date; startTime: string; endTime: string;
  status: 'PENDING' | 'CONFIRMED' | 'DECLINED' | 'CANCELLED'
}

type Availability = {
  id: string; dayOfWeek: number; startTime: string; endTime: string; isActive: boolean
}

type Job = {
  id: string; title: string; description: string | null;
  imageUrl: string | null; completedAt: Date | string
}

type Provider = {
  id: string; name: string; slug: string; bio: string | null;
  profession: string; keywords: string[]; lat: number | null; lng: number | null;
  acceptedRadiusKm: number; bookingMode: string; isVisible: boolean;
  googleId?: string | null;
  availability: Availability[]
}

type Tab = 'inbox' | 'profile' | 'location' | 'calendar'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'inbox',    label: 'Inbox',    icon: '📬' },
  { id: 'profile',  label: 'Profile',  icon: '👤' },
  { id: 'location', label: 'Location', icon: '📍' },
  { id: 'calendar', label: 'Calendar', icon: '📅' },
]

export function DashboardClient({
  provider: initialProvider,
  upcoming: initialUpcoming,
  jobs: initialJobs,
  slug,
  googleConnected = false,
}: {
  provider: Provider
  upcoming: Booking[]
  jobs: Job[]
  slug: string
  googleConnected?: boolean
}) {
  const [tab, setTab] = useState<Tab>('inbox')
  const [upcoming, setUpcoming] = useState(initialUpcoming)
  const [provider, setProvider] = useState(initialProvider)
  const [jobs, setJobs] = useState<Job[]>(initialJobs)

  const didSync = useRef(false)
  useEffect(() => {
    if (!googleConnected || didSync.current) return
    didSync.current = true
    fetch('/api/me/calendar/sync', { method: 'POST' }).catch(() => {})
  }, [googleConnected])

  const pendingCount = upcoming.filter((b) => b.status === 'PENDING').length

  function handleStatusChange(id: string, newStatus: 'CONFIRMED' | 'DECLINED') {
    setUpcoming((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: newStatus } : b))
    )
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 border-r border-border bg-card px-3 py-6 gap-1 fixed top-12 bottom-0">
        <p className="px-3 mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dashboard</p>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition text-left ${
              tab === t.id
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:bg-accent'
            }`}
          >
            <span>{t.icon}</span>
            {t.label}
            {t.id === 'inbox' && pendingCount > 0 && (
              <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-xs text-white leading-none">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </aside>

      {/* Mobile tab bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex border-t border-border bg-card">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium transition ${
              tab === t.id ? 'text-foreground' : 'text-muted-foreground'
            }`}
          >
            <span className="text-lg">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <main className="flex-1 lg:ml-56 px-4 lg:px-10 py-8 pb-24 lg:pb-8 max-w-3xl">
        <h1 className="text-xl font-bold mb-6 text-foreground">
          {TABS.find((t) => t.id === tab)?.label}
        </h1>

        {tab === 'inbox' && (
          <InboxTab
            upcoming={upcoming}
            onStatusChange={handleStatusChange}
          />
        )}
        {tab === 'profile' && (
          <ProfileTab
            provider={provider}
            slug={slug}
            onSaved={setProvider}
            jobs={jobs}
            onJobsChanged={setJobs}
          />
        )}
        {tab === 'location' && (
          <LocationTab provider={provider} slug={slug} onSaved={setProvider} />
        )}
        {tab === 'calendar' && (
          <CalendarTab availability={provider.availability} />
        )}
      </main>
    </div>
  )
}

/* ── Inbox ─────────────────────────────────────────────── */
function InboxTab({
  upcoming, onStatusChange,
}: {
  upcoming: Booking[]
  onStatusChange: (id: string, newStatus: 'CONFIRMED' | 'DECLINED') => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Upcoming bookings {upcoming.length > 0 && `(${upcoming.length})`}
      </h2>
      {upcoming.length === 0 ? (
        <p className="text-muted-foreground text-sm">No upcoming bookings.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {upcoming.map((b) => (
            <BookingRow key={b.id} {...b} onStatusChange={onStatusChange} />
          ))}
        </div>
      )}
    </div>
  )
}

const PROFESSION_OPTIONS = [
  { group: 'Trades',       items: ['Plumber', 'Electrician', 'Gas Engineer', 'Carpenter', 'Joiner', 'Roofer', 'Builder', 'Plasterer', 'Tiler', 'Bricklayer'] },
  { group: 'Home & Garden',items: ['Painter & Decorator', 'Cleaner', 'Gardener', 'Handyman', 'Locksmith', 'Window Cleaner', 'Pest Control'] },
  { group: 'Appliances',   items: ['Appliance Repair', 'HVAC Technician', 'Boiler Engineer'] },
  { group: 'Lifestyle',    items: ['Personal Trainer', 'Tutor', 'Dog Walker', 'Babysitter', 'Chef', 'Photographer'] },
]

/* ── Profile ───────────────────────────────────────────── */
function ProfileTab({
  provider, slug, onSaved, jobs, onJobsChanged,
}: {
  provider: Provider
  slug: string
  onSaved: (p: Provider) => void
  jobs: Job[]
  onJobsChanged: (jobs: Job[]) => void
}) {
  const parseProfessions = (raw: string) =>
    raw ? raw.split(',').map((s) => s.trim()).filter(Boolean) : []

  const [professions, setProfessions] = useState<string[]>(() => parseProfessions(provider.profession))
  const [bio, setBio] = useState(provider.bio ?? '')
  const [keywords, setKeywords] = useState(provider.keywords.join(', '))
  const [isVisible, setIsVisible] = useState(provider.isVisible)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  function toggleProfession(name: string) {
    setProfessions((prev) =>
      prev.includes(name) ? prev.filter((p) => p !== name) : [...prev, name]
    )
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (professions.length === 0) { setError('Please select at least one profession.'); return }
    setLoading(true); setSaved(false); setError('')
    try {
      const res = await fetch(`/api/providers/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profession: professions.join(', '),
          bio,
          keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
          isVisible,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        onSaved({ ...provider, ...data })
        setSaved(true)
      } else {
        setError('Save failed. Please try again.')
      }
    } catch {
      setError('Network error.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="p-6">
        <form onSubmit={handleSave} className="flex flex-col gap-5">

          {/* Profession checkboxes */}
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-sm font-medium text-foreground">Profession</label>
              <p className="text-xs text-muted-foreground mt-0.5">Select all that apply</p>
            </div>
            <div className="flex flex-col gap-4">
              {PROFESSION_OPTIONS.map(({ group, items }) => (
                <div key={group}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{group}</p>
                  <div className="flex flex-wrap gap-2">
                    {items.map((name) => {
                      const checked = professions.includes(name)
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => toggleProfession(name)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                            checked
                              ? 'bg-foreground text-background border-foreground'
                              : 'bg-card text-muted-foreground border-border hover:border-foreground'
                          }`}
                        >
                          {checked && <span className="mr-1">✓</span>}
                          {name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            {professions.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Selected: <span className="font-medium text-foreground">{professions.join(', ')}</span>
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground">About</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              placeholder="Tell customers about your experience and services…"
              className="rounded-lg border border-border px-3 py-2 text-sm focus:border-foreground focus:outline-none focus:ring-1 focus:ring-foreground"
            />
          </div>
          <Field
            label="Keywords (comma-separated)"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="emergency electrician, EV charging, panel upgrade"
          />
          <div className="flex items-center gap-3">
            <input
              id="visible"
              type="checkbox"
              checked={isVisible}
              onChange={(e) => setIsVisible(e.target.checked)}
              className="h-4 w-4 accent-foreground"
            />
            <label htmlFor="visible" className="text-sm font-medium text-foreground">
              Visible in search results
            </label>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {saved && <p className="text-sm text-green-600">Profile saved.</p>}
          <Button type="submit" disabled={loading}>
            {loading ? 'Saving…' : 'Save profile'}
          </Button>
        </form>
      </Card>

      <PastWorkSection jobs={jobs} onJobsChanged={onJobsChanged} />
    </div>
  )
}

/* ── Past Work ─────────────────────────────────────────── */
function PastWorkSection({
  jobs, onJobsChanged,
}: {
  jobs: Job[]
  onJobsChanged: (jobs: Job[]) => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [completedAt, setCompletedAt] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageData, setImageData] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setError('Image must be under 2 MB.'); return }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      setImagePreview(result)
      setImageData(result)
      setError('')
    }
    reader.readAsDataURL(file)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!title || !completedAt) { setError('Title and date are required.'); return }
    setAdding(true); setError('')
    try {
      const res = await fetch('/api/me/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, completedAt, imageUrl: imageData ?? undefined }),
      })
      if (res.ok) {
        const job = await res.json()
        onJobsChanged([job, ...jobs])
        setTitle(''); setDescription(''); setCompletedAt('')
        setImagePreview(null); setImageData(null)
      } else {
        setError('Failed to add. Please try again.')
      }
    } catch {
      setError('Network error.')
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/me/jobs/${id}`, { method: 'DELETE' })
      if (res.ok) onJobsChanged(jobs.filter((j) => j.id !== id))
    } catch { /* ignore */ }
  }

  return (
    <Card className="p-6">
      <h2 className="text-base font-semibold mb-4">Past work</h2>

      {/* Carousel */}
      {jobs.length > 0 && (
        <div className="mb-6">
          <WorksCarousel jobs={jobs} />
        </div>
      )}

      {/* Upload form */}
      <form onSubmit={handleAdd} className="flex flex-col gap-3 mb-6">
        {/* Image drop zone */}
        <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-background cursor-pointer hover:border-muted-foreground transition h-32 relative overflow-hidden">
          {imagePreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imagePreview} alt="preview" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <>
              <span className="text-2xl">📷</span>
              <span className="text-xs text-muted-foreground">Click to upload photo (max 2 MB)</span>
            </>
          )}
          <input type="file" accept="image/*" onChange={handleFile} className="sr-only" />
        </label>

        <Field
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Kitchen rewire"
          required
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-foreground">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Brief description of the job…"
            className="rounded-lg border border-border px-3 py-2 text-sm focus:border-foreground focus:outline-none"
          />
        </div>
        <Field
          label="Date completed"
          type="date"
          value={completedAt}
          onChange={(e) => setCompletedAt(e.target.value)}
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={adding}>
          {adding ? 'Adding…' : 'Add past work'}
        </Button>
      </form>

      {/* Manage uploads */}
      {jobs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No past work added yet.</p>
      ) : (
        <>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Manage uploads</p>
          <div className="flex flex-col gap-2">
            {jobs.map((job) => (
              <div key={job.id} className="flex items-center gap-3 rounded-xl border border-border p-2 group">
                {job.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={job.imageUrl} alt={job.title} className="h-12 w-16 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="h-12 w-16 rounded-lg bg-muted shrink-0 flex items-center justify-center text-muted-foreground text-xl">🔧</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{job.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(job.completedAt).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(job.id)}
                  className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-500 transition opacity-0 group-hover:opacity-100"
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  )
}

/* ── Location ──────────────────────────────────────────── */
function LocationTab({
  provider, slug, onSaved,
}: {
  provider: Provider
  slug: string
  onSaved: (p: Provider) => void
}) {
  const [address, setAddress] = useState('')
  const [radius, setRadius] = useState(provider.acceptedRadiusKm)
  const [bookingMode, setBookingMode] = useState(provider.bookingMode)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setSaved(false); setError('')
    try {
      const res = await fetch(`/api/providers/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: address || undefined,
          acceptedRadiusKm: radius,
          bookingMode,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        onSaved({ ...provider, ...data })
        setSaved(true)
        if (address) setAddress('')
      } else {
        setError('Save failed. Please try again.')
      }
    } catch {
      setError('Network error.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSave} className="flex flex-col gap-5">
        {provider.lat && provider.lng && (
          <p className="text-xs text-muted-foreground">
            Current location: {provider.lat.toFixed(4)}, {provider.lng.toFixed(4)}
          </p>
        )}
        <Field
          label="Update address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="123 Main St, London"
        />
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-foreground">
            Search radius: <span className="font-bold">{radius} km</span>
          </label>
          <input
            type="range" min={5} max={100} step={5}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="accent-foreground"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>5 km</span><span>100 km</span>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-foreground">Booking mode</label>
          <select
            value={bookingMode}
            onChange={(e) => setBookingMode(e.target.value)}
            className="rounded-lg border border-border px-3 py-2 text-sm focus:border-foreground focus:outline-none"
          >
            <option value="INSTANT">Instant — confirm immediately</option>
            <option value="REQUEST">Request — you approve each booking</option>
            <option value="BOTH">Both — customer chooses</option>
          </select>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-green-600">Location settings saved.</p>}
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving…' : 'Save location'}
        </Button>
      </form>
    </Card>
  )
}

/* ── Calendar ──────────────────────────────────────────── */
type CalendarBooking = {
  id: string; date: string; startTime: string; endTime: string
  status: 'PENDING' | 'CONFIRMED'; guestName: string
}
type CalendarBlock = { id: string; date: string; startTime: string; endTime: string }
type CalendarData = { bookings: CalendarBooking[]; blockedSlots: CalendarBlock[] }

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6) // 06:00–22:00

function getSunday(d: Date) {
  const date = new Date(d)
  date.setDate(date.getDate() - date.getDay())
  date.setHours(0, 0, 0, 0)
  return date
}

function fmt(d: Date) { return d.toISOString().slice(0, 10) }
function pad(n: number) { return String(n).padStart(2, '0') }

type SlotStatus = 'outside' | 'available' | 'blocked' | 'pending' | 'confirmed'

function getSlotStatus(
  date: Date, hour: number,
  availability: Availability[], data: CalendarData
): { status: SlotStatus; blockId?: string; booking?: CalendarBooking } {
  const dateStr = fmt(date)
  const slotTime = `${pad(hour)}:00`
  const slotEnd  = `${pad(hour + 1)}:00`

  const avail = availability.find(a => a.dayOfWeek === date.getDay())
  if (!avail || !avail.isActive || avail.startTime > slotTime || avail.endTime < slotEnd) {
    return { status: 'outside' }
  }

  const booking = data.bookings.find(b =>
    b.date.slice(0, 10) === dateStr && b.startTime <= slotTime && b.endTime >= slotEnd
  )
  if (booking) return { status: booking.status === 'CONFIRMED' ? 'confirmed' : 'pending', booking }

  const block = data.blockedSlots.find(b =>
    b.date.slice(0, 10) === dateStr && b.startTime <= slotTime && b.endTime >= slotEnd
  )
  if (block) return { status: 'blocked', blockId: block.id }

  return { status: 'available' }
}

function CalendarTab({ availability }: { availability: Availability[] }) {
  const [weekStart, setWeekStart] = useState(() => getSunday(new Date()))
  const [data, setData] = useState<CalendarData>({ bookings: [], blockedSlots: [] })
  const [loading, setLoading] = useState(false)
  const [acting, setActing] = useState<string | null>(null)

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/me/calendar?from=${fmt(weekStart)}&to=${fmt(weekEnd)}`)
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [weekStart]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchData() }, [fetchData])

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })

  async function handleSlotClick(date: Date, hour: number, status: string, blockId?: string) {
    if (status === 'confirmed' || status === 'pending' || status === 'outside') return
    const key = `${fmt(date)}-${hour}`
    setActing(key)
    try {
      if (status === 'blocked' && blockId) {
        await fetch(`/api/me/blocks/${blockId}`, { method: 'DELETE' })
      } else if (status === 'available') {
        await fetch('/api/me/blocks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: fmt(date), startTime: `${pad(hour)}:00`, endTime: `${pad(hour + 1)}:00` }),
        })
      }
      await fetchData()
    } finally {
      setActing(null)
    }
  }

  const prevWeek = () => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })
  const nextWeek = () => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })
  const goToday  = () => setWeekStart(getSunday(new Date()))
  const todayStr = fmt(new Date())

  const monthLabel = weekStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="flex flex-col gap-4">

      {/* ── Top bar ─────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-foreground tracking-tight">{monthLabel}</h3>
        <div className="flex items-center gap-1.5">
          {loading && (
            <span className="text-xs text-muted-foreground mr-2 animate-pulse">Refreshing…</span>
          )}
          <button
            onClick={prevWeek}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors text-sm font-medium"
          >‹</button>
          <button
            onClick={goToday}
            className="px-3 h-8 rounded-lg text-xs font-semibold text-muted-foreground bg-muted hover:bg-accent transition-colors"
          >Today</button>
          <button
            onClick={nextWeek}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors text-sm font-medium"
          >›</button>
        </div>
      </div>

      {/* ── Calendar card ───────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden shadow-sm border border-border bg-card">

        {/* Column headers */}
        <div className="grid border-b border-border bg-muted" style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}>
          <div /> {/* time gutter */}
          {days.map((d, i) => {
            const isToday = fmt(d) === todayStr
            return (
              <div key={i} className="py-2.5 flex flex-col items-center gap-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {DAYS[d.getDay()]}
                </span>
                <span className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold transition-colors
                  ${isToday ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-foreground'}`}>
                  {d.getDate()}
                </span>
              </div>
            )
          })}
        </div>

        {/* Time grid */}
        <div className="overflow-y-auto" style={{ maxHeight: '380px' }}>
          {HOURS.slice(0, -1).map((hour) => (
            <div key={hour} className="grid border-b border-border last:border-0"
              style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}>
              {/* Time label */}
              <div className="flex items-start justify-end pr-2 pt-1">
                <span className="text-[10px] font-medium text-muted-foreground leading-none">
                  {hour === 12 ? '12 PM' : hour < 12 ? `${hour} AM` : `${hour - 12} PM`}
                </span>
              </div>
              {/* Day cells */}
              {days.map((date, di) => {
                const key = `${fmt(date)}-${hour}`
                const { status, blockId, booking } = getSlotStatus(date, hour, availability, data)
                const isActing = acting === key
                const isToday = fmt(date) === todayStr

                let cellClass = 'border-l border-border h-10 px-1 py-0.5 flex flex-col items-center justify-center transition-all duration-150 '
                let inner: React.ReactNode = null

                if (status === 'outside') {
                  cellClass += 'bg-muted cursor-default'
                } else if (status === 'available') {
                  cellClass += isToday
                    ? 'bg-indigo-50/40 hover:bg-emerald-50 cursor-pointer group'
                    : 'bg-card hover:bg-emerald-50 cursor-pointer group'
                  inner = (
                    <span className="opacity-0 group-hover:opacity-100 text-[9px] font-semibold text-emerald-600 transition-opacity">
                      Block
                    </span>
                  )
                } else if (status === 'blocked') {
                  cellClass += 'bg-slate-700 hover:bg-slate-600 cursor-pointer'
                  inner = <span className="text-[10px] font-bold text-slate-300">✕</span>
                } else if (status === 'pending') {
                  cellClass += 'bg-amber-400 cursor-default'
                  inner = (
                    <span className="text-[9px] font-semibold text-amber-900 truncate w-full text-center px-0.5 leading-tight">
                      {booking?.guestName ?? 'Pending'}
                    </span>
                  )
                } else if (status === 'confirmed') {
                  cellClass += 'bg-indigo-500 cursor-default'
                  inner = (
                    <span className="text-[9px] font-semibold text-white truncate w-full text-center px-0.5 leading-tight">
                      {booking?.guestName ?? 'Booked'}
                    </span>
                  )
                }

                return (
                  <button
                    key={`${di}-${hour}`}
                    type="button"
                    disabled={isActing || status === 'confirmed' || status === 'pending' || status === 'outside'}
                    onClick={() => handleSlotClick(date, hour, status, blockId)}
                    title={
                      booking ? `${booking.guestName} · ${status}`
                      : status === 'blocked' ? 'Blocked — click to unblock'
                      : status === 'available' ? 'Click to block this slot'
                      : ''
                    }
                    className={`${cellClass} ${isActing ? 'opacity-40 scale-95' : ''}`}
                  >
                    {isActing ? <span className="text-[10px] text-muted-foreground">…</span> : inner}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ── Legend ──────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {[
          { bg: 'bg-card ring-1 ring-border', label: 'Available' },
          { bg: 'bg-emerald-50 ring-1 ring-emerald-200', label: 'Hover to block' },
          { bg: 'bg-amber-400', label: 'Pending request' },
          { bg: 'bg-indigo-500', label: 'Confirmed' },
          { bg: 'bg-slate-700', label: 'Blocked' },
          { bg: 'bg-muted ring-1 ring-border', label: 'Outside hours' },
        ].map(({ bg, label }) => (
          <span key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={`w-3 h-3 rounded-sm shrink-0 ${bg}`} />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
