import dynamic from 'next/dynamic'
import Link from 'next/link'
import { HomeSearchForm } from './HomeSearchForm'

const ProviderMap = dynamic(
  () => import('@/components/map/ProviderMap').then((m) => m.ProviderMap),
  { ssr: false, loading: () => <div className="h-full w-full rounded-xl bg-stone-200 animate-pulse" /> }
)

const CATEGORIES = [
  { label: 'Electrical', icon: '⚡' },
  { label: 'Plumbing', icon: '🔧' },
  { label: 'Gardening', icon: '🌿' },
  { label: 'Building', icon: '🏗️' },
  { label: 'Painting', icon: '🎨' },
  { label: 'Cleaning', icon: '🧹' },
  { label: 'Roofing', icon: '🏠' },
  { label: 'Flooring', icon: '🪵' },
]

export default function HomePage() {
  return (
    <main>
      {/* Hero */}
      <section className="grid min-h-[70vh] grid-cols-1 gap-0 lg:grid-cols-2">
        <div className="flex flex-col justify-center px-8 py-16 lg:px-16">
          <h1 className="mb-4 text-4xl font-bold leading-tight text-stone-900 lg:text-5xl">
            Book trusted local<br />service providers
          </h1>
          <p className="mb-8 text-lg text-stone-500">
            Electricians, plumbers, gardeners and more — no account needed.
          </p>
          <HomeSearchForm />
        </div>
        <div className="hidden h-full min-h-[400px] lg:block">
          <ProviderMap providers={[]} zoom={10} />
        </div>
      </section>

      {/* Category grid */}
      <section className="px-8 py-12 lg:px-16">
        <h2 className="mb-6 text-xl font-semibold text-stone-800">Browse by category</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.label}
              href={`/search?keyword=${cat.label.toLowerCase()}`}
              className="flex flex-col items-center gap-2 rounded-xl border border-stone-200 bg-white p-4 text-center shadow-sm transition hover:border-primary hover:shadow-md"
            >
              <span className="text-3xl">{cat.icon}</span>
              <span className="text-sm font-medium text-stone-700">{cat.label}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
