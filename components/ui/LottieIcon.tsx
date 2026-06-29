'use client'
import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import type { CSSProperties } from 'react'

// lottie-web touches the DOM, so load the player client-only.
const Lottie = dynamic(() => import('lottie-react'), { ssr: false })

export function LottieIcon({
  animationData,
  loop = true,
  className,
  style,
}: {
  animationData: object
  loop?: boolean
  className?: string
  style?: CSSProperties
}) {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  // These animations are decorative — honour reduced-motion by skipping them.
  if (reduced) return null

  return (
    <Lottie animationData={animationData} loop={loop} autoplay className={className} style={style} aria-hidden />
  )
}
