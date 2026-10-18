import { useCallback, useSyncExternalStore } from 'react'

/**
 * Reactive localStorage hook — syncs across tabs and re-renders on change.
 * Falls back gracefully in private browsing / SSR.
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const handler = (e: StorageEvent) => {
        if (e.key === key) onStoreChange()
      }
      window.addEventListener('storage', handler)
      return () => window.removeEventListener('storage', handler)
    },
    [key],
  )

  const getSnapshot = useCallback((): T => {
    try {
      const raw = localStorage.getItem(key)
      return raw !== null ? (JSON.parse(raw) as T) : initialValue
    } catch {
      return initialValue
    }
  }, [key, initialValue])

  const value = useSyncExternalStore(subscribe, getSnapshot, () => initialValue)

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      try {
        const resolved = next instanceof Function ? next(getSnapshot()) : next
        localStorage.setItem(key, JSON.stringify(resolved))
        // Trigger re-render in the same tab (StorageEvent only fires cross-tab)
        window.dispatchEvent(new StorageEvent('storage', { key }))
      } catch {
        /* quota exceeded or private browsing — silently skip */
      }
    },
    [key, getSnapshot],
  )

  const removeValue = useCallback(() => {
    try {
      localStorage.removeItem(key)
      window.dispatchEvent(new StorageEvent('storage', { key }))
    } catch {
      /* ignore */
    }
  }, [key])

  return [value, setValue, removeValue] as const
}
