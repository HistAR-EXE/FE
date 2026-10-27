import { useCallback, useEffect, useRef, useState } from 'react'
import { DISCOVERY_RECORDED_EVENT } from '../gamification/discoveryRouting'

export type ProfileResource<T> = { data: T | null; status: 'loading' | 'ready' | 'error'; reload: () => Promise<void> }

/** Each resource is isolated. A failed secondary API never replaces valid identity with an empty profile. */
export function useProfileResource<T>(key: string | null, loader: () => Promise<T>): ProfileResource<T> {
  const [stored, setStored] = useState<{ key: string | null; data: T | null; status: 'loading' | 'ready' | 'error' }>({ key: null, data: null, status: 'loading' })
  const version = useRef(0)
  const reload = useCallback(async () => {
    const request = ++version.current
    if (!key) return
    setStored(previous => ({ key, data: previous.key === key ? previous.data : null, status: 'loading' }))
    try {
      const data = await loader()
      if (request === version.current) setStored({ key, data, status: 'ready' })
    } catch {
      if (request === version.current) setStored({ key, data: null, status: 'error' })
    }
  }, [key, loader])
  useEffect(() => {
    void reload()
    const refresh = () => { void reload() }
    window.addEventListener('focus', refresh)
    window.addEventListener(DISCOVERY_RECORDED_EVENT, refresh)
    return () => {
      ++version.current
      window.removeEventListener('focus', refresh)
      window.removeEventListener(DISCOVERY_RECORDED_EVENT, refresh)
    }
  }, [reload])
  return { data: stored.key === key ? stored.data : null, status: stored.key === key ? stored.status : 'loading', reload }
}
