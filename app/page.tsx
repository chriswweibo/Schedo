import Link from 'next/link'
import { HomeSearchForm } from './HomeSearchForm'
import { HomeMap } from './HomeMap'

const CATEGORY_GROUPS = [
  {
    group: 'Trades',
    icon: '🔩',
    items: [
      { label: 'Electrician',  icon: '⚡', keyword: 'electrician' },
      { label: 'Plumber',      icon: '🔧', keyword: 'plumber' },
      { label: 'Gas Engineer', icon: '🔥', keyword: 'gas engineer' },
      { label: 'Carpenter',    icon: '🪚', keyword: 'carpenter' },
      { label: 'Joiner',       icon: '🪵', keyword: 'joiner' },
      { label: 'Roofer',       icon: '🏠', keyword: 'roofer' },
      { label: 'Builder',      icon: '🏗️', keyword: 'builder' },
      { label: 'Plasterer',    icon: '🪣', keyword: 'plasterer' },
      { label: 'Tiler',        icon: '🟫', keyword: 'tiler' },
      { label: 'Bricklayer',   icon: '🧱', keyword: 'bricklayer' },
    ],
  },
  {
    group: 'Home & Garden',
    icon: '🏡',
    items: [
      { label: 'Painter',        icon: '🎨', keyword: 'painter' },
      { label: 'Cleaner',        icon: '🧹', keyword: 'cleaner' },
      { label: 'Gardener',       icon: '🌿', keyword: 'gardener' },
      { label: 'Handyman',       icon: '🔨', keyword: 'handyman' },
      { label: 'Locksmith',      icon: '🔑', keyword: 'locksmith' },
      { label: 'Window Cleaner', icon: '🪟', keyword: 'window cleaner' },
      { label: 'Pest Control',   icon: '🐛', keyword: 'pest control' },
    ],
  },
  {
    group: 'Appliances',
    icon: '🔌',
    items: [
      { label: 'Appliance Repair', icon: '🫙', keyword: 'appliance repair' },
      { label: 'HVAC',             icon: '❄️', keyword: 'hvac' },
      { label: 'Boiler Engineer',  icon: '♨️', keyword: 'boiler' },
    ],
  },
  {
    group: 'Lifestyle',
    icon: '✨',
    items: [
      { label: 'Personal Trainer', icon: '💪', keyword: 'personal trainer' },
      { label: 'Tutor',            icon: '📚', keyword: 'tutor' },
      { label: 'Dog Walker',       icon: '🐕', keyword: 'dog walker' },
      { label: 'Babysitter',       icon: '👶', keyword: 'babysitter' },
      { label: 'Chef',             icon: '👨‍🍳', keyword: 'chef' },
      { label: 'Photographer',     icon: '📷', keyword: 'photographer' },
    ],
  },
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
          <p className="mb-6 text-lg text-stone-500">
            Electricians, plumbers, gardeners and more — no account needed.
          </p>
          <HomeSearchForm />

          {/* Two-level category browser */}
          <div className="mt-6 flex flex-col gap-3">
            {CATEGORY_GROUPS.map(({ group, icon, items }) => (
              <div key={group} className="flex items-start gap-3">
                {/* Parent label */}
                <div className="flex w-28 shrink-0 items-center gap-1.5 pt-1">
                  <span className="text-sm leading-none">{icon}</span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">
                    {group}
                  </span>
                </div>

                {/* Child chips */}
                <div className="flex flex-wrap gap-1.5">
                  {items.map((cat) => (
                    <Link
                      key={cat.keyword}
                      href={`/search?keyword=${encodeURIComponent(cat.keyword)}`}
                      className="flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2.5 py-1 text-xs font-medium text-stone-600 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                    >
                      <span className="leading-none">{cat.icon}</span>
                      {cat.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="hidden h-full min-h-[400px] lg:block">
          <HomeMap />
        </div>
      </section>
    </main>
  )
}
