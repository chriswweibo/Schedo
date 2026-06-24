'use client'
import { useState } from 'react'
import { Field } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface Provider {
  slug: string; bio?: string | null; keywords: string[];
  acceptedRadiusKm: number; bookingMode: string; isVisible: boolean;
}

export function SettingsForm({
  provider,
  slug,
  googleConnected = false,
  googleSyncedAt = null,
}: {
  provider: Provider
  slug: string
  googleConnected?: boolean
  googleSyncedAt?: string | null
}) {
  const [bio, setBio] = useState(provider.bio ?? '')
  const [keywords, setKeywords] = useState(provider.keywords.join(', '))
  const [address, setAddress] = useState('')
  const [radius, setRadius] = useState(provider.acceptedRadiusKm)
  const [bookingMode, setBookingMode] = useState(provider.bookingMode)
  const [isVisible, setIsVisible] = useState(provider.isVisible)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSaved(false)

    try {
      const res = await fetch(`/api/providers/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bio,
          keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
          address: address || undefined,
          acceptedRadiusKm: radius,
          bookingMode,
          isVisible,
        }),
      })
      if (res.ok) {
        setSaved(true)
      } else {
        const data = await res.json()
        setError(data.error ?? 'Save failed')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <label htmlFor="bio" className="text-sm font-medium text-stone-700">Bio</label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <Field
          label="Keywords (comma-separated)"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="emergency electrician, EV charging, panel upgrade"
        />

        <Field
          label="Address (updates your location)"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="123 Main St, London"
        />

        <div className="flex flex-col gap-1">
          <label htmlFor="radius" className="text-sm font-medium text-stone-700">
            Accepted radius: {radius} km
          </label>
          <input
            id="radius"
            type="range" min={5} max={100} step={5}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="accent-primary"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="bookingMode" className="text-sm font-medium text-stone-700">Booking mode</label>
          <select
            id="bookingMode"
            value={bookingMode}
            onChange={(e) => setBookingMode(e.target.value)}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          >
            <option value="INSTANT">Instant — confirm immediately</option>
            <option value="REQUEST">Request — you approve each booking</option>
            <option value="BOTH">Both — customer chooses</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <input
            id="visible"
            type="checkbox"
            checked={isVisible}
            onChange={(e) => setIsVisible(e.target.checked)}
            className="accent-primary h-4 w-4"
          />
          <label htmlFor="visible" className="text-sm font-medium text-stone-700">
            Visible in search results
          </label>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-primary">Settings saved.</p>}

        <Button type="submit" disabled={loading}>
          {loading ? 'Saving…' : 'Save settings'}
        </Button>
      </form>

      {googleConnected && (
        <section className="flex flex-col gap-2 border-t border-stone-200 pt-6 mt-2">
          <h2 className="text-lg font-semibold">Google Calendar</h2>
          <p className="text-sm text-stone-500">
            {syncMessage ??
              (googleSyncedAt
                ? `Last synced ${new Date(googleSyncedAt).toLocaleString()}`
                : 'Connected — not synced yet')}
          </p>
          <div>
            <Button
              type="button"
              variant="outline"
              disabled={syncing}
              onClick={async () => {
                setSyncing(true)
                setSyncMessage(null)
                try {
                  const res = await fetch('/api/me/calendar/sync', { method: 'POST' })
                  const data = await res.json()
                  setSyncMessage(res.ok ? `Synced — ${data.blockCount} blocked time(s).` : (data.error ?? 'Sync failed'))
                } catch {
                  setSyncMessage('Network error during sync.')
                } finally {
                  setSyncing(false)
                }
              }}
            >
              {syncing ? 'Syncing…' : 'Sync now'}
            </Button>
          </div>
        </section>
      )}
    </Card>
  )
}
