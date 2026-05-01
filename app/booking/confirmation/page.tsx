import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function ConfirmationPage({
  searchParams,
}: {
  searchParams: { status?: string; provider?: string; date?: string; start?: string; end?: string }
}) {
  const isConfirmed = searchParams.status === 'CONFIRMED'
  const provider = searchParams.provider ?? 'the provider'

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="mb-4 text-5xl">{isConfirmed ? '✅' : '🕐'}</div>
        <h1 className="mb-2 text-2xl font-bold">
          {isConfirmed ? 'Booking confirmed!' : 'Request sent!'}
        </h1>
        <p className="mb-6 text-stone-500">
          {isConfirmed
            ? `Your booking with ${provider} on ${searchParams.date} at ${searchParams.start} is confirmed. Check your email for details.`
            : `Your request to ${provider} for ${searchParams.date} at ${searchParams.start} has been sent. We'll email you once they respond.`}
        </p>
        <Link href="/search">
          <Button variant="secondary">Find more providers</Button>
        </Link>
      </Card>
    </main>
  )
}
