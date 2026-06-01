import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { images } from '../assets/images'

const scenes = [
  { id: 'kien-thien', label: 'Điện Kính Thiên', image: images.tour360Panorama },
  { id: 'doan-mon', label: 'Đoan Môn', image: images.detailThangLongHero },
  { id: 'cot-co', label: 'Cột cờ Hà Nội', image: images.portalPresent },
]

export function Tour360Page() {
  const { slug } = useParams<{ slug?: string }>()
  const backSlug = slug ?? 'thang-long'
  const [activeScene, setActiveScene] = useState(scenes[0].id)
  const [isPaused, setIsPaused] = useState(false)

  const currentScene = scenes.find((s) => s.id === activeScene) ?? scenes[0]

  return (
    <AppLayout activeBorder="left" className="overflow-hidden">
      <header className="fixed top-0 right-0 left-0 md:left-[16rem] z-50 backdrop-blur-xl border-b border-outline-variant bg-surface/70 flex justify-between items-center h-16 px-xl">
        <div className="flex items-center gap-md">
          <Link to={`/explore/${backSlug}`} className="text-on-surface-variant hover:text-secondary p-2">
            <MaterialIcon name="arrow_back" />
          </Link>
          <nav className="flex items-center gap-1 font-label-sm text-label-sm text-on-surface-variant">
            <Link to="/explore" className="hover:text-secondary">
              Khám phá
            </Link>
            <MaterialIcon name="chevron_right" className="text-xs" />
            <Link to={`/explore/${backSlug}`} className="hover:text-secondary">
              Hoàng Thành
            </Link>
            <MaterialIcon name="chevron_right" className="text-xs" />
            <span className="text-on-surface">Tour 360°</span>
          </nav>
        </div>
        <div className="flex items-center gap-md">
          <button type="button" className="text-on-surface-variant hover:text-secondary p-2 rounded-full hover:bg-surface-variant/50">
            <MaterialIcon name="fullscreen" />
          </button>
        </div>
      </header>

      <div
        className="mt-16 relative h-[calc(100vh-4rem)] panorama-container cursor-grab active:cursor-grabbing"
        onMouseDown={() => setIsPaused(true)}
        onMouseUp={() => setIsPaused(false)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div
          className={`absolute inset-0 bg-cover bg-center panorama-bg ${isPaused ? '[animation-play-state:paused]' : ''}`}
          style={{ backgroundImage: `url('${currentScene.image}')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-transparent to-background/60 pointer-events-none" />

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="w-16 h-16 rounded-full border-2 border-secondary/50 flex items-center justify-center animate-pulse">
            <MaterialIcon name="360" className="text-secondary text-3xl" />
          </div>
        </div>

        <div className="absolute bottom-xl left-xl z-20 max-w-md">
          <h2 className="font-display-lg text-display-lg text-primary bloom-glow">{currentScene.label}</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant mt-sm">
            Kéo để xoay góc nhìn 360°. Nhấn vào các điểm sáng để khám phá chi tiết kiến trúc.
          </p>
        </div>

        <div className="absolute bottom-xl right-xl flex gap-sm z-20">
          {scenes.map((scene) => (
            <button
              key={scene.id}
              type="button"
              onClick={() => setActiveScene(scene.id)}
              className={`w-20 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                activeScene === scene.id ? 'border-secondary glow-secondary scale-105' : 'border-outline-variant opacity-70 hover:opacity-100'
              }`}
            >
              <img alt={scene.label} className="w-full h-full object-cover" src={scene.image} />
            </button>
          ))}
        </div>

        <div className="absolute top-xl right-xl z-20 bg-surface/70 backdrop-blur-xl border border-outline-variant rounded-lg p-md">
          <p className="font-label-sm text-label-sm text-on-surface-variant uppercase mb-sm">Điểm nóng</p>
          {['Cột cờ Hà Nội', 'Hầm B52', 'Đoan Môn'].map((spot) => (
            <button
              key={spot}
              type="button"
              className="block w-full text-left font-body-md text-body-md text-on-surface hover:text-secondary py-1 transition-colors"
            >
              {spot}
            </button>
          ))}
        </div>
      </div>
    </AppLayout>
  )
}
