import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { images } from '../assets/images'

const eras = ['1900', '1954', '1975', 'Hiện tại'] as const

const portalParticles = Array.from({ length: 24 }, (_, i) => ({
  id: i,
  left: `${((i * 37) % 100)}%`,
  delay: `${(i * 0.21) % 5}s`,
  size: `${2 + (i % 4)}px`,
  variant: i % 2 === 0 ? 'particle-gold' : 'particle-cyan',
}))

function Particles() {
  const particles = portalParticles

  return (
    <div className="absolute inset-0 pointer-events-none z-[15] overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className={`particle ${p.variant}`}
          style={{
            left: p.left,
            bottom: '10%',
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  )
}

export function TimePortalPage() {
  const { slug } = useParams<{ slug?: string }>()
  const backSlug = slug ?? 'thang-long'
  const containerRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState(50)
  const [activeEra, setActiveEra] = useState<(typeof eras)[number]>('1900')
  const [isDragging, setIsDragging] = useState(false)

  const updatePosition = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
    setPosition((x / rect.width) * 100)
  }, [])

  useEffect(() => {
    if (!isDragging) return

    const onMove = (e: MouseEvent) => updatePosition(e.clientX)
    const onUp = () => setIsDragging(false)

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [isDragging, updatePosition])

  return (
    <AppLayout activeBorder="left" className="overflow-hidden">
      <header className="fixed top-0 right-0 left-0 md:left-[16rem] z-50 backdrop-blur-xl border-b border-outline-variant bg-surface/70 flex justify-between items-center h-16 px-xl">
        <div className="flex items-center gap-md">
          <Link to={`/explore/${backSlug}`} className="text-on-surface-variant hover:text-secondary p-2">
            <MaterialIcon name="arrow_back" />
          </Link>
          <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface">Cổng thời gian</h2>
        </div>
        <div className="flex items-center gap-md">
          <button type="button" className="text-on-surface-variant hover:text-secondary p-2 rounded-full hover:bg-surface-variant/50">
            <MaterialIcon name="notifications" />
          </button>
          <div className="w-8 h-8 rounded-full border border-outline overflow-hidden">
            <img alt="Avatar" className="w-full h-full object-cover" src={images.avatarPortal} />
          </div>
        </div>
      </header>

      <div ref={containerRef} className="split-view-container mt-16 bg-surface-container-lowest">
        <div className="pattern-overlay" />
        <Particles />

        <div
          className="view-layer view-past"
          style={{
            backgroundImage: `url('${images.portalPast}')`,
            clipPath: `polygon(0 0, ${position}% 0, ${position}% 100%, 0 100%)`,
          }}
        >
          <div className="absolute top-xl left-xl z-20 max-w-md pointer-events-none drop-shadow-2xl">
            <h2 className="font-display-lg text-display-lg font-bold text-primary mb-1">Hoàng Thành Thăng Long</h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant flex items-center gap-xs">
              <MaterialIcon name="location_on" className="text-primary text-sm" />
              Hà Nội, Việt Nam • {activeEra}
            </p>
          </div>
        </div>

        <div
          className="view-layer view-present"
          style={{ backgroundImage: `url('${images.portalPresent}')` }}
        />

        <div
          className="slider-handle"
          style={{ left: `${position}%` }}
          onMouseDown={() => setIsDragging(true)}
          role="slider"
          aria-valuenow={position}
          aria-label="So sánh quá khứ và hiện tại"
          tabIndex={0}
        >
          <div className="slider-button">
            <MaterialIcon name="compare_arrows" className="text-primary" />
          </div>
        </div>

        <div className="absolute bottom-xl left-1/2 -translate-x-1/2 z-30 bg-surface/70 backdrop-blur-xl border border-outline-variant/50 rounded-full px-lg py-sm flex gap-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
          {eras.map((era) => (
            <button
              key={era}
              type="button"
              onClick={() => setActiveEra(era)}
              className={`font-title-md text-title-md transition-colors ${
                activeEra === era
                  ? 'text-primary era-tab-active'
                  : era === 'Hiện tại'
                    ? 'text-secondary hover:text-secondary-fixed'
                    : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {era}
            </button>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
