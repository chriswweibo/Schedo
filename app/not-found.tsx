import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="mb-4 text-5xl">🧭</div>
        <h1 className="mb-2 text-2xl font-bold">Page not found</h1>
        <p className="mb-6 text-muted-foreground">
          We couldn&apos;t find the page you were looking for. It may have been
          moved, or the link might be out of date.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link href="/">
            <Button variant="default">Back home</Button>
          </Link>
          <Link href="/search">
            <Button variant="outline">Find providers</Button>
          </Link>
        </div>
      </Card>
    </main>
  )
}
