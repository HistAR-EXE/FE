import { appEnv } from '../../shared/config/env'

export function DemoEnvironmentBanner() {
  if (!appEnv.demoMode) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 left-1/2 z-[100] -translate-x-1/2 rounded-full border border-amber-300 bg-amber-50/95 px-4 py-2 text-sm font-bold text-amber-950 shadow-lg backdrop-blur"
    >
      Dữ liệu demo · Không phải dữ liệu người dùng thật
    </div>
  )
}
