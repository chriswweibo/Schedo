'use client'
import { useRef, useState } from 'react'
import { format } from 'date-fns'

interface Job {
  id: string
  title: string
  description: string | null
  imageUrl: string | null
  completedAt: Date | string
}

export function WorksCarousel({ jobs }: { jobs: Job[] }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const [lightbox, setLightbox] = useState<Job | null>(null)

  function scrollTo(index: number) {
    const track = trackRef.current
    if (!track) return
    const card = track.children[index] as HTMLElement
    if (!card) return
    track.scrollTo({ left: card.offsetLeft, behavior: 'smooth' })
    setActive(index)
  }

  function onScroll() {
    const track = trackRef.current
    if (!track) return
    const cardWidth = (track.children[0] as HTMLElement)?.offsetWidth ?? 1
    setActive(Math.round(track.scrollLeft / cardWidth))
  }

  function prev() { scrollTo(Math.max(0, active - 1)) }
  function next() { scrollTo(Math.min(jobs.length - 1, active + 1)) }

  if (jobs.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border-2 border-dashed border-stone-200 text-stone-400 text-sm">
        No past work uploaded yet
      </div>
    )
  }

  return (
    <>
      <div className="relative group">
        {/* Prev button */}
        {active > 0 && (
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-md text-stone-600 hover:text-stone-900 transition opacity-0 group-hover:opacity-100"
            aria-label="Previous"
          >
            ‹
          </button>
        )}

        {/* Track */}
        <div
          ref={trackRef}
          onScroll={onScroll}
          className="flex overflow-x-auto scroll-smooth snap-x snap-mandatory gap-3 pb-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {jobs.map((job) => (
            <div
              key={job.id}
              onClick={() => setLightbox(job)}
              className="w-full shrink-0 snap-start rounded-2xl border border-stone-200 bg-white overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
            >
              {job.imageUrl ? (
                <div className="relative h-52 w-full overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={job.imageUrl} alt={job.title} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <p className="absolute bottom-3 left-3 right-3 text-white text-sm font-semibold leading-snug drop-shadow">
                    {job.title}
                  </p>
                </div>
              ) : (
                <div className="flex h-52 items-center justify-center bg-stone-100 text-stone-300 text-5xl">
                  🔧
                </div>
              )}
              <div className="px-4 py-3">
                {!job.imageUrl && (
                  <p className="font-semibold text-sm leading-snug mb-1">{job.title}</p>
                )}
                {job.description && (
                  <p className="text-xs text-stone-500 line-clamp-2">{job.description}</p>
                )}
                <p className="mt-1.5 text-xs text-stone-400">
                  {format(new Date(job.completedAt), 'MMMM yyyy')}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Next button */}
        {active < jobs.length - 1 && (
          <button
            onClick={next}
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-md text-stone-600 hover:text-stone-900 transition opacity-0 group-hover:opacity-100"
            aria-label="Next"
          >
            ›
          </button>
        )}
      </div>

      {/* Dot indicators */}
      {jobs.length > 1 && (
        <div className="mt-3 flex justify-center gap-1.5">
          {jobs.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollTo(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === active ? 'w-5 bg-indigo-600' : 'w-1.5 bg-stone-300'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative w-full max-w-2xl rounded-2xl bg-white overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {lightbox.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={lightbox.imageUrl} alt={lightbox.title} className="w-full max-h-[60vh] object-contain bg-stone-100" />
            )}
            <div className="p-5">
              <p className="font-semibold text-slate-900">{lightbox.title}</p>
              {lightbox.description && (
                <p className="mt-1.5 text-sm text-stone-600">{lightbox.description}</p>
              )}
              <p className="mt-2 text-xs text-stone-400">
                {format(new Date(lightbox.completedAt), 'MMMM yyyy')}
              </p>
            </div>
            <button
              onClick={() => setLightbox(null)}
              className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70 transition text-sm"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  )
}
