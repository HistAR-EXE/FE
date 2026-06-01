import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { images } from '../assets/images'

const frameStyles = [
  { id: 'heritage', label: 'Di sản', border: 'border-primary' },
  { id: 'dynasty', label: 'Triều đại', border: 'border-secondary' },
  { id: 'gold', label: 'Hoàng kim', border: 'border-tertiary' },
  { id: 'minimal', label: 'Tối giản', border: 'border-outline-variant' },
] as const

export function PhotoFramePage() {
  const [activeStyle, setActiveStyle] = useState<(typeof frameStyles)[number]['id']>('heritage')
  const [activeTab, setActiveTab] = useState<'camera' | 'gallery'>('camera')

  const selectedStyle = frameStyles.find((s) => s.id === activeStyle) ?? frameStyles[0]

  return (
    <AppLayout activeBorder="left" topNav={<SimpleTopNav title="Khung ảnh di sản" />}>
      <main className="mt-16 flex-1 p-lg max-w-2xl mx-auto w-full">
        <div className={`relative rounded-xl overflow-hidden border-4 ${selectedStyle.border} aspect-square mb-lg glow-primary`}>
          <div className="absolute inset-4 border-2 border-secondary/50 rounded-lg z-10 pointer-events-none" />
          <div className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2 border-primary z-20" />
          <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 border-primary z-20" />
          <div className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 border-primary z-20" />
          <div className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2 border-primary z-20" />
          <div className="absolute top-4 left-4 right-4 flex justify-between z-20">
            <span className="px-3 py-1 rounded-full bg-surface-container/80 backdrop-blur-md border border-primary text-primary font-label-sm text-label-sm">
              TimeLens
            </span>
            <span className="px-3 py-1 rounded-full bg-surface-container/80 backdrop-blur-md border border-secondary text-secondary font-label-sm text-label-sm">
              Hoàng Thành Thăng Long
            </span>
          </div>
          <img alt="Heritage photo frame" className="w-full h-full object-cover" src={images.photoFrameCharacter} />
          <div className="absolute bottom-0 left-0 right-0 p-lg bg-gradient-to-t from-background to-transparent z-20">
            <p className="font-title-md text-title-md text-on-surface">Du hành thời gian tại di sản</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant">31/05/2026 • Hà Nội</p>
          </div>
        </div>

        <h3 className="font-title-md text-title-md text-on-surface mb-md">Chọn khung</h3>
        <div className="grid grid-cols-4 gap-sm mb-lg">
          {frameStyles.map((style) => (
            <button
              key={style.id}
              type="button"
              onClick={() => setActiveStyle(style.id)}
              className={`p-sm rounded-lg border text-center transition-colors ${
                activeStyle === style.id
                  ? `${style.border} bg-surface-container-high`
                  : 'border-outline-variant bg-surface-container hover:border-outline'
              }`}
            >
              <div className={`w-full aspect-square rounded border-2 ${style.border} mb-1`} />
              <span className="font-label-sm text-label-sm text-on-surface-variant">{style.label}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-sm mb-lg border-b border-outline-variant pb-sm">
          {(['camera', 'gallery'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`font-title-md text-title-md pb-1 px-3 transition-colors ${
                activeTab === tab
                  ? 'text-secondary border-b-2 border-secondary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {tab === 'camera' ? 'Camera' : 'Thư viện'}
            </button>
          ))}
        </div>

        <div className="flex gap-md">
          <button
            type="button"
            className="flex-1 py-sm px-md rounded-lg bg-primary text-on-primary font-title-md flex items-center justify-center gap-xs"
          >
            <MaterialIcon name="photo_camera" />
            Chụp ảnh
          </button>
          <button
            type="button"
            className="flex-1 py-sm px-md rounded-lg border border-secondary text-secondary font-title-md flex items-center justify-center gap-xs hover:bg-secondary/10"
          >
            <MaterialIcon name="download" />
            Lưu khung
          </button>
        </div>

        <Link to="/quests" className="block text-center mt-lg text-on-surface-variant hover:text-secondary">
          ← Quay lại nhiệm vụ
        </Link>
      </main>
    </AppLayout>
  )
}
