'use client'
import { signIn } from 'next-auth/react'
import { Button } from '@/components/ui/button'

export function GoogleButton({ label = 'Continue with Google' }: { label?: string }) {
  if (process.env.NEXT_PUBLIC_GOOGLE_ENABLED !== 'true') return null
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
    >
      {label}
    </Button>
  )
}
