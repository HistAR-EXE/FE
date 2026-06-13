import { useEffect, useState } from 'react'
import { useAppMode } from '../../shared/context/useAppMode'
import { MaterialIcon } from '../ui/MaterialIcon'

export function OfflineSyncBadge({ className = '' }: { className?: string }) {
  const { mode } = useAppMode()
  const [online, setOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )

  useEffect(() => {
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  if (mode === 'offline') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 ${className}`}
        title="Chế độ tại di tích"
      >
        <MaterialIcon name="sync" className="text-[12px]" />
        <span className="hidden sm:inline">Quest/check-in onsite · Khám phá online cần mạng</span>
        <span className="sm:hidden">Onsite mode</span>
      </span>
    )
  }

  if (!online) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300 ${className}`}
        title="Mất kết nối"
      >
        <MaterialIcon name="cloud_off" className="text-[12px]" />
        <span className="hidden sm:inline">Mất kết nối — thử lại khi có mạng</span>
        <span className="sm:hidden">Offline</span>
      </span>
    )
  }

  return null
}
