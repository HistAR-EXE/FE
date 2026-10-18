// src/features/time-portal/ParallaxScene.tsx
// Multi-layer parallax scene với crossfade transitions giữa các era.
// Cải tiến: mid-ground image layer, CSS 3D perspective, sắc nét hơn.

import { useCallback, useEffect, useRef, useState } from 'react'
import { CompareLayerImage } from './CompareLayerImage'
import { images } from '../../assets/images'
import type { EraData } from './cuChiEraData'

type Props = {
  eraData: EraData
  /** Enable parallax tracking (pointer + gyro). */
  parallax?: boolean
}

const GYRO_RANGE_DEG = 25
const GYRO_NEUTRAL_BETA_DEG = 50
const GYRO_LOW_PASS = 0.12

function hasGyro(): boolean {
  return typeof window !== 'undefined' && typeof DeviceOrientationEvent !== 'undefined'
}

export function ParallaxScene({ eraData, parallax = true }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const parallaxTarget = useRef({ x: 0, y: 0 })
  const parallaxCurrent = useRef({ x: 0, y: 0 })
  const rafId = useRef<number | null>(null)
  const gyroSmoothed = useRef({ x: 0, y: 0 })

  const [gyroEnabled] = useState(() => hasGyro())

  // Parallax animation loop — writes CSS variables, no React re-render.
  const runParallax = useCallback(() => {
    if (rafId.current !== null) return
    const step = () => {
      const el = containerRef.current
      const c = parallaxCurrent.current
      const t = parallaxTarget.current
      c.x += (t.x - c.x) * 0.12
      c.y += (t.y - c.y) * 0.12
      if (el) {
        el.style.setProperty('--px', c.x.toFixed(4))
        el.style.setProperty('--py', c.y.toFixed(4))
      }
      if (Math.abs(t.x - c.x) < 0.002 && Math.abs(t.y - c.y) < 0.002) {
        rafId.current = null
        return
      }
      rafId.current = requestAnimationFrame(step)
    }
    rafId.current = requestAnimationFrame(step)
  }, [])

  useEffect(() => () => { if (rafId.current !== null) cancelAnimationFrame(rafId.current) }, [])

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!parallax || e.pointerType === 'touch') return
      const rect = e.currentTarget.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      parallaxTarget.current = {
        x: ((e.clientX - rect.left) / rect.width - 0.5) * -2,
        y: ((e.clientY - rect.top) / rect.height - 0.5) * -2,
      }
      runParallax()
    },
    [parallax, runParallax],
  )

  const onPointerLeave = useCallback(() => {
    parallaxTarget.current = { x: 0, y: 0 }
    runParallax()
  }, [runParallax])

  // Gyro
  const onDeviceOrientation = useCallback(
    (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return
      const clamp = (v: number) => Math.min(1, Math.max(-1, v))
      const rawX = clamp(e.gamma / GYRO_RANGE_DEG)
      const rawY = clamp((e.beta - GYRO_NEUTRAL_BETA_DEG) / GYRO_RANGE_DEG)
      const s = gyroSmoothed.current
      s.x += (rawX - s.x) * GYRO_LOW_PASS
      s.y += (rawY - s.y) * GYRO_LOW_PASS
      parallaxTarget.current = { x: -s.x, y: -s.y }
      runParallax()
    },
    [runParallax],
  )

  useEffect(() => {
    if (!parallax || !gyroEnabled) return
    window.addEventListener('deviceorientation', onDeviceOrientation)
    return () => window.removeEventListener('deviceorientation', onDeviceOrientation)
  }, [parallax, gyroEnabled, onDeviceOrientation])

  // Crossfade state — keep previous era's image visible during transition.
  const [, setPrevImage] = useState<string | null>(null)
  const [transitioning, setTransitioning] = useState(false)
  const prevEraRef = useRef(eraData.era)

  useEffect(() => {
    if (eraData.era !== prevEraRef.current) {
      setPrevImage(eraData.imageUrl)
      setTransitioning(true)
      prevEraRef.current = eraData.era
      const timer = setTimeout(() => {
        setTransitioning(false)
        setPrevImage(null)
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [eraData.era, eraData.imageUrl])

  return (
    <div
      ref={containerRef}
      className="portal-parallax relative w-full h-full overflow-hidden bg-black"
      style={{ perspective: '1200px', perspectiveOrigin: '50% 50%' }}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      {/* Background layer — main era image (sắc nét, filter nhẹ) */}
      <div className={`absolute inset-0 transition-opacity duration-700 ${transitioning ? 'opacity-0' : 'opacity-100'}`}>
        <CompareLayerImage
          src={eraData.imageUrl}
          fallback={images.timePortalPast}
          alt={eraData.title}
          className={`absolute inset-0 w-full h-full object-cover ${parallax ? 'portal-parallax-layer' : ''}`}
          style={{
            '--depth': eraData.layers[0]?.depth ?? 5,
            filter: eraData.imageFilter,
            willChange: 'transform',
            transformStyle: 'preserve-3d' as const,
          } as React.CSSProperties}
        />
      </div>

      {/* Mid-ground parallax layer — actual image for depth (ảnh phụ tạo chiều sâu 3D) */}
      {eraData.midImageUrl && eraData.layers[1] && (
        <div
          className={`absolute inset-0 pointer-events-none ${parallax ? 'portal-parallax-layer' : ''} transition-opacity duration-700`}
          style={{
            '--depth': eraData.layers[1].depth,
            zIndex: eraData.layers[1].z,
            opacity: transitioning ? 0 : 0.35,
            willChange: 'transform',
          } as React.CSSProperties}
        >
          <img
            src={eraData.midImageUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              filter: `${eraData.imageFilter} opacity(0.6)`,
              maskImage: 'radial-gradient(ellipse 80% 70% at 50% 60%, black 20%, transparent 70%)',
              WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 60%, black 20%, transparent 70%)',
            }}
            loading="lazy"
          />
          {/* Mid layer gradient overlay */}
          {eraData.layers[1].overlay && (
            <div
              className="absolute inset-0"
              style={{ background: eraData.layers[1].overlay }}
            />
          )}
        </div>
      )}

      {/* Fallback mid-ground (gradient only) when no midImageUrl */}
      {!eraData.midImageUrl && eraData.layers[1] && (
        <div
          className={`absolute inset-0 pointer-events-none ${parallax ? 'portal-parallax-layer' : ''} transition-opacity duration-700`}
          style={{
            '--depth': eraData.layers[1].depth,
            zIndex: eraData.layers[1].z,
            background: eraData.layers[1].overlay ?? 'transparent',
            opacity: transitioning ? 0 : 1,
          } as React.CSSProperties}
        />
      )}

      {/* Foreground parallax layer — depth haze with 3D offset */}
      {eraData.layers[2] && (
        <div
          className={`absolute inset-0 pointer-events-none ${parallax ? 'portal-parallax-layer' : ''} transition-opacity duration-700`}
          style={{
            '--depth': eraData.layers[2].depth,
            zIndex: eraData.layers[2].z,
            background: 'linear-gradient(0deg, rgba(0,0,0,0.25) 0%, transparent 35%, transparent 75%, rgba(0,0,0,0.1) 100%)',
            opacity: transitioning ? 0 : 0.7,
            willChange: 'transform',
          } as React.CSSProperties}
        />
      )}

      {/* Atmosphere gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-700"
        style={{
          background: eraData.atmosphereGradient,
          zIndex: 3,
        }}
      />

      {/* Film grain effect for historical eras — lighter opacity */}
      {eraData.era !== 2026 && (
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04] mix-blend-overlay"
          style={{
            zIndex: 4,
            backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
            backgroundSize: '128px 128px',
          }}
        />
      )}

      {/* Vignette — lighter for better clarity */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 5,
          background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.35) 100%)',
        }}
      />

    </div>
  )
}
