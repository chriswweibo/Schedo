'use client'
import { useRef, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Camera, Loader2, Trash2 } from 'lucide-react'

const ACCEPT = 'image/jpeg,image/png,image/webp'
const MAX_BYTES = 4 * 1024 * 1024

/** Center-crop to a square and resize to `size`px, returning a JPEG File. */
async function resizeToSquare(file: File, size = 512): Promise<File> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(fr.result as string)
    fr.onerror = () => reject(new Error('read failed'))
    fr.readAsDataURL(file)
  })
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new window.Image()
    i.onload = () => resolve(i)
    i.onerror = () => reject(new Error('decode failed'))
    i.src = dataUrl
  })
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const side = Math.min(img.width, img.height)
  const sx = (img.width - side) / 2
  const sy = (img.height - side) / 2
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
  if (!blob) throw new Error('resize failed')
  return new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
}

export function AvatarUpload({ initialUrl, name }: { initialUrl: string | null; name: string }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState<string | null>(initialUrl)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (!file) return
    setError('')

    if (!ACCEPT.split(',').includes(file.type)) {
      setError('Please choose a JPEG, PNG, or WebP image.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('Image must be under 4 MB.')
      return
    }

    setBusy(true)
    try {
      const resized = await resizeToSquare(file)
      const body = new FormData()
      body.append('file', resized)
      const res = await fetch('/api/me/avatar', { method: 'POST', body })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? 'Upload failed. Please try again.')
        return
      }
      setUrl(data.avatarUrl)
      router.refresh() // update the avatar shown elsewhere (profile, search)
    } catch {
      setError('Could not process that image. Please try another.')
    } finally {
      setBusy(false)
    }
  }

  async function onRemove() {
    setError('')
    setBusy(true)
    try {
      const res = await fetch('/api/me/avatar', { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? 'Could not remove photo.')
        return
      }
      setUrl(null)
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-5">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-primary-light text-2xl font-bold text-primary">
        {url ? (
          <Image src={url} alt={name} fill sizes="80px" className="object-cover" />
        ) : (
          <span className="flex h-full w-full items-center justify-center">{name?.[0] ?? '?'}</span>
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/60">
            <Loader2 className="h-5 w-5 animate-spin text-foreground" aria-hidden />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:opacity-50"
          >
            <Camera className="h-4 w-4" aria-hidden /> {url ? 'Change photo' : 'Upload photo'}
          </button>
          {url && (
            <button
              type="button"
              onClick={onRemove}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" aria-hidden /> Remove
            </button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">JPEG, PNG, or WebP · up to 4 MB · square crop.</p>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <input ref={inputRef} type="file" accept={ACCEPT} onChange={onPick} className="hidden" />
      </div>
    </div>
  )
}
