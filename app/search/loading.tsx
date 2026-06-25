export default function SearchLoading() {
  return (
    <div className="flex h-[calc(100vh-3rem)] overflow-hidden">
      {/* Results list skeleton */}
      <div className="w-full lg:w-[420px] shrink-0 flex flex-col gap-3 overflow-y-auto p-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 animate-pulse"
          >
            {/* Avatar */}
            <div className="h-14 w-14 shrink-0 rounded-full bg-muted" />
            {/* Text lines */}
            <div className="flex-1 flex flex-col gap-2">
              <div className="h-4 w-2/3 rounded bg-muted" />
              <div className="h-3 w-1/2 rounded bg-muted" />
              <div className="h-3 w-1/3 rounded bg-muted" />
            </div>
            {/* Button placeholder */}
            <div className="h-9 w-16 shrink-0 rounded-lg bg-muted" />
          </div>
        ))}
      </div>

      {/* Map skeleton — hidden on mobile */}
      <div className="hidden lg:block flex-1 p-4">
        <div className="h-full w-full rounded-xl bg-muted animate-pulse" />
      </div>
    </div>
  )
}
