'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import { ProviderCalendar } from '@/components/provider/ProviderCalendar'
import { Card } from '@/components/ui/card'

interface Job {
  id: string
  title: string
  description: string | null
  imageUrl: string | null
  completedAt: Date | string
}

const WorksCarousel = dynamic(
  () => import('@/components/provider/WorksCarousel').then((m) => m.WorksCarousel),
  {
    ssr: false,
    loading: () => <div className="h-52 w-full rounded-2xl bg-muted animate-pulse" />,
  }
)

export function ProfileBooking({
  providerId,
  availability,
  jobs,
}: {
  providerId: string
  availability: Array<{ dayOfWeek: number; isActive: boolean }>
  jobs: Job[]
}) {
  // True once a date is picked — hides the carousel and lets the calendar
  // expand to a two-pane (calendar + times) layout.
  const [booking, setBooking] = useState(false)

  return (
    <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
      {/* Past work — hidden once a date is selected */}
      {!booking && (
        <section className="w-full lg:w-1/2">
          <h2 className="mb-4 text-lg font-semibold text-foreground">Past work</h2>
          <WorksCarousel jobs={jobs} />
        </section>
      )}

      {/* Booking — expands to full width when a date is selected */}
      <section id="availability" className={`w-full transition-all duration-300 ${booking ? '' : 'lg:w-1/2'}`}>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Book a slot</h2>
        <Card className="p-4">
          <ProviderCalendar
            providerId={providerId}
            availability={availability}
            slideToSide
            onSelectionChange={setBooking}
          />
        </Card>
      </section>
    </div>
  )
}
