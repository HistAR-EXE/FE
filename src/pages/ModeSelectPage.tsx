// src/pages/ModeSelectPage.tsx
import { useLocation, useNavigate } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { MaterialIcon } from '../components/ui/MaterialIcon'
import type { AppMode } from '../shared/context/modeContext'
import { useAppMode } from '../shared/context/useAppMode'

const modeOptions: { mode: AppMode; icon: string; title: string; description: string; to: string }[] = [
  {
    mode: 'online',
    icon: 'home',
    title: 'Khám phá từ xa',
    description: 'Tham quan 360°, trò chuyện AI, xem ảnh xưa-nay',
    to: '/explore',
  },
  {
    mode: 'offline',
    icon: 'location_on',
    title: 'Đang tại di tích',
    description: 'Check-in, nhiệm vụ, chụp ảnh kỷ niệm',
    to: '/scan',
  },
]

export function ModeSelectPage() {
  const { setMode } = useAppMode()
  const navigate = useNavigate()
  const location = useLocation()
  const pendingFrom = (location.state as { from?: string } | null)?.from

  const handleSelect = (mode: AppMode, defaultTo: string) => {
    setMode(mode)
    const target = pendingFrom?.startsWith('/') ? pendingFrom : defaultTo
    navigate(target, { replace: true })
  }

  return (
    <AppLayout hideSideNav hideMobileChrome className="pb-0 md:pb-0">
      <main className="min-h-screen flex flex-col items-center justify-center px-lg py-xl">
        <div className="w-full max-w-2xl flex flex-col gap-xl">
          <div className="text-center">
            <h1 className="font-display-lg text-display-lg font-bold text-primary">Bạn đang ở đâu?</h1>
            <p className="font-body-md text-body-md text-on-surface-variant mt-sm">
              Chọn chế độ phù hợp — bạn có thể đổi bất cứ lúc nào
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            {modeOptions.map((option) => (
              <button
                key={option.mode}
                type="button"
                onClick={() => handleSelect(option.mode, option.to)}
                className="group text-left bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden hover:border-primary/50 transition-all hover:bg-surface-container focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary/50"
              >
                <div className="h-28 relative overflow-hidden bg-surface-container-high flex items-center justify-center shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
                  <MaterialIcon
                    name={option.icon}
                    className="text-5xl text-secondary group-hover:text-primary transition-colors relative z-10"
                    filled
                  />
                </div>
                <div className="p-md">
                  <h2 className="font-title-md text-title-md text-on-surface group-hover:text-primary transition-colors">
                    {option.title}
                  </h2>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-1">{option.description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>
    </AppLayout>
  )
}
