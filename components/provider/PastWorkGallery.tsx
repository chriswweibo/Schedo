'use client'
import Image from 'next/image'
import { useState } from 'react'

interface Job {
  id: string
  title: string
  description: string | null
  imageUrl: string | null
  completedAt: Date | string
}

function formatMonth(d: Date | string) {
  return new Date(d).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })
}

function JobCard({ job }: { job: Job }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative overflow-hidden rounded-2xl bg-stone-100 aspect-square text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        {job.imageUrl ? (
          <Image
            src={job.imageUrl}
            alt={job.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-indigo-50 to-slate-100">
            <span className="text-4xl opacity-40">🔧</span>
          </div>
        )}

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3">
          <p className="text-white text-sm font-semibold leading-snug line-clamp-2">{job.title}</p>
          <p className="text-white/70 text-xs mt-0.5">{formatMonth(job.completedAt)}</p>
        </div>

        {/* Date badge (always visible, top-right) */}
        <span className="absolute top-2 right-2 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
          {formatMonth(job.completedAt)}
        </span>
      </button>

      {/* Lightbox */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative max-w-lg w-full bg-white rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {job.imageUrl ? (
              <div className="relative w-full aspect-video">
                <Image src={job.imageUrl} alt={job.title} fill className="object-cover" />
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center bg-indigo-50 text-5xl">🔧</div>
            )}
            <div className="p-5">
              <p className="font-semibold text-slate-900">{job.title}</p>
              <p className="text-xs text-stone-400 mt-0.5">{formatMonth(job.completedAt)}</p>
              {job.description && (
                <p className="mt-3 text-sm text-stone-600 leading-relaxed">{job.description}</p>
              )}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-black/40 text-white text-sm hover:bg-black/60"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export function PastWorkGallery({ jobs }: { jobs: Job[] }) {
  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-stone-200 bg-stone-50 py-16 text-center">
        <span className="text-4xl opacity-30">🖼️</span>
        <div>
          <p className="text-sm font-medium text-stone-500">No past work uploaded yet</p>
          <p className="text-xs text-stone-400 mt-0.5">This provider hasn&apos;t added any portfolio items</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </div>
  )
}
