import { useCallback, useSyncExternalStore } from 'react'

/**
 * Tracks browser online/offline status reactively.
 * Essential for a PWA that may go offline during a heritage-site visit.
 *
 * @example
 * const isOnline = useOnlineStatus()
 * if (!isOnline) return <OfflineBanner />
 */
export function useOnlineStatus(): boolean {
  const subscribe = useCallback((onStoreChange: () => void) => {
    window.addEventListener('online', onStoreChange)
    window.addEventListener('offline', onStoreChange)
    return () => {
      window.removeEventListener('online', onStoreChange)
      window.removeEventListener('offline', onStoreChange)
    }
  }, [])

  const getSnapshot = useCallback(() => navigator.onLine, [])

  return useSyncExternalStore(subscribe, getSnapshot, () => true)
}
