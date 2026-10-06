import { useEffect, useState } from 'react'

export type MascotMode = 'idle' | 'listening' | 'speaking' | 'thinking'

const FRAMES = Array.from({ length: 11 }, (_, index) => `/mascot/mascot-${index + 1}.png`)

const INTERVAL_MS: Record<MascotMode, number> = {
  idle: 900,
  listening: 180,
  speaking: 120,
  thinking: 280,
}

type MascotAvatarProps = {
  mode?: MascotMode
  className?: string
  alt?: string
}

export function MascotAvatar({ mode = 'idle', className, alt = 'Mascot' }: MascotAvatarProps) {
  const [frame, setFrame] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setFrame((current) => (current + 1) % FRAMES.length)
    }, INTERVAL_MS[mode])
    return () => window.clearInterval(timer)
  }, [mode])

  return (
    <img
      src={FRAMES[frame]}
      alt={alt}
      className={`object-contain ${className ?? ''}`}
      draggable={false}
    />
  )
}
