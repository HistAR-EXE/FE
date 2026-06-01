import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import { images } from '../assets/images'
import { profile } from '../data/mock/profile'

const socialTargets = [
  { id: 'facebook', label: 'Facebook', icon: 'public' },
  { id: 'instagram', label: 'Instagram', icon: 'photo_camera' },
  { id: 'twitter', label: 'X', icon: 'tag' },
  { id: 'copy', label: 'Sao chép', icon: 'content_copy' },
] as const

export function SharePage() {
  const [caption, setCaption] = useState(
    'Vừa hoàn thành nhiệm vụ tại Hoàng Thành Thăng Long trên TimeLens! 🏛️ #TimeLens #DiSan'
  )

  return (
    <div className="min-h-screen bg-background/95 flex flex-col fixed inset-0 z-50">
      <div className="dong-son-bg fixed inset-0 pointer-events-none" />

      <header className="relative z-10 flex justify-between items-center h-16 px-xl border-b border-outline-variant bg-surface/70 backdrop-blur-xl">
        <Link to="/profile" className="flex items-center gap-sm text-on-surface-variant hover:text-secondary">
          <MaterialIcon name="close" />
          <span className="font-title-md text-title-md">Đóng</span>
        </Link>
        <h2 className="font-headline-lg text-headline-lg text-on-surface">Chia sẻ thành tích</h2>
        <div className="w-20" />
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-lg overflow-y-auto">
        <div className="relative w-full max-w-md aspect-[4/5] rounded-xl overflow-hidden border-2 border-primary glow-primary mb-lg">
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-transparent to-background" />
          <img
            alt="Character"
            className="absolute inset-0 w-full h-full object-cover opacity-60"
            src={images.shareCharacter}
          />
          <div className="relative z-10 p-xl h-full flex flex-col justify-between">
            <div>
              <p className="font-label-sm text-label-sm text-secondary uppercase tracking-widest">TimeLens</p>
              <h1 className="font-display-lg text-display-lg text-primary mt-sm">{profile.name}</h1>
              <p className="font-title-md text-title-md text-on-surface-variant">{profile.title}</p>
            </div>
            <div className="bg-surface-container/80 backdrop-blur-md rounded-lg p-md border border-outline-variant">
              <div className="flex justify-between items-center mb-sm">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Cấp độ</span>
                <span className="font-title-md text-title-md text-secondary">{profile.level}</span>
              </div>
              <div className="flex justify-between items-center mb-sm">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Di tích</span>
                <span className="font-title-md text-title-md text-on-surface">{profile.stats.sitesVisited}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-label-sm text-label-sm text-on-surface-variant">Nhiệm vụ</span>
                <span className="font-title-md text-title-md text-primary">{profile.stats.questsCompleted}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full max-w-md mb-lg">
          <label htmlFor="share-caption" className="font-label-sm text-label-sm text-on-surface-variant mb-sm block">
            Chú thích ({caption.length}/200)
          </label>
          <textarea
            id="share-caption"
            maxLength={200}
            rows={3}
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="w-full bg-surface-container border border-outline-variant rounded-lg p-md font-body-md text-body-md text-on-surface resize-none focus:outline-none focus:border-secondary"
          />
        </div>

        <div className="grid grid-cols-4 gap-md w-full max-w-md mb-lg">
          {socialTargets.map((target) => (
            <button
              key={target.id}
              type="button"
              className="flex flex-col items-center gap-sm p-md rounded-lg border border-outline-variant bg-surface-container hover:border-secondary transition-colors"
            >
              <MaterialIcon name={target.icon} className="text-secondary" />
              <span className="font-label-sm text-label-sm text-on-surface-variant">{target.label}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          className="w-full max-w-md py-sm px-md rounded-lg bg-primary text-on-primary font-title-md flex items-center justify-center gap-xs glow-primary"
        >
          <MaterialIcon name="download" />
          Tải ảnh
        </button>
      </main>
    </div>
  )
}
