import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { advanceAtmosphere, atmosphereEligible, initialAtmosphere, skipAtmosphere } from './worldAtmosphere'
import type { AtmospherePhase, AtmosphereState } from './worldAtmosphere'

const preferenceKey = 'timelens-atmosphere-enabled:v1'
const seenInMemory = new Set<string>()
let preferenceInMemory: boolean | undefined

function readEnabled(): boolean {
  if (preferenceInMemory !== undefined) return preferenceInMemory
  try {
    const saved = localStorage.getItem(preferenceKey)
    if (saved === 'on' || saved === 'off') return saved === 'on'
  } catch { /* Private/blocked storage falls back to the current device preference. */ }
  return typeof window === 'undefined' || !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function hasSeen(key: string): boolean {
  if (seenInMemory.has(key)) return true
  try { return sessionStorage.getItem(key) === 'seen' } catch { return false }
}

function markSeen(key: string) {
  seenInMemory.add(key)
  try { sessionStorage.setItem(key, 'seen') } catch { /* The in-memory marker remains effective. */ }
}

function isActive(phase: AtmospherePhase): boolean {
  return phase === 'NOTICE' || phase === 'ALERT' || phase === 'RECOVERY'
}

type Visit = { key: string; state: AtmosphereState; live: boolean; lastTick: number }
type Options = { owner: string; zone: string; paused: boolean }

export function useWorldAtmosphere({ owner, zone, paused }: Options) {
  const key = `timelens-atmosphere-seen:v1:${JSON.stringify([owner, zone])}`
  const eligible = atmosphereEligible(zone)
  const [enabled, updateEnabled] = useState(readEnabled)
  const [snapshot, setSnapshot] = useState<{ key: string; phase: AtmospherePhase }>({ key, phase: 'CALM' })
  const currentVisit = useRef<Visit | null>(null)

  // Layout cleanup invalidates old timers before a newly committed owner/zone is shown.
  useLayoutEffect(() => {
    const state = !enabled || !eligible || hasSeen(key) ? skipAtmosphere(initialAtmosphere()) : initialAtmosphere()
    const visit: Visit = { key, state, live: true, lastTick: performance.now() }
    currentVisit.current = visit
    setSnapshot({ key, phase: state.phase })
    return () => {
      visit.live = false
      if (isActive(visit.state.phase)) markSeen(key)
      if (currentVisit.current === visit) currentVisit.current = null
    }
  }, [owner, zone])

  useEffect(() => {
    const visit = currentVisit.current
    if (!visit || !enabled || !eligible || paused) return
    let live = true
    visit.lastTick = performance.now()
    const resetClock = () => { visit.lastTick = performance.now() }
    const timer = window.setInterval(() => {
      if (!live || !visit.live || currentVisit.current !== visit) return
      const now = performance.now()
      const seconds = (now - visit.lastTick) / 1000
      visit.lastTick = now
      if (document.hidden) return
      const before = visit.state.phase
      visit.state = advanceAtmosphere(visit.state, seconds)
      if (visit.state.phase !== before) {
        // Save at warning entry, so even a reload during the sequence cannot surprise later.
        if (isActive(visit.state.phase) || visit.state.phase === 'SETTLED') markSeen(key)
        setSnapshot({ key, phase: visit.state.phase })
      }
    }, 250)
    document.addEventListener('visibilitychange', resetClock)
    return () => {
      live = false
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', resetClock)
    }
  }, [owner, zone, enabled, paused])

  const skip = useCallback(() => {
    const visit = currentVisit.current
    if (!visit?.live || visit.key !== key) return
    visit.state = skipAtmosphere(visit.state)
    markSeen(key)
    setSnapshot({ key, phase: visit.state.phase })
  }, [key])

  const setEnabled = useCallback((value: boolean) => {
    preferenceInMemory = value
    try { localStorage.setItem(preferenceKey, value ? 'on' : 'off') } catch { /* Keep the in-memory preference. */ }
    if (!value) skip()
    updateEnabled(value)
  }, [skip])

  const replay = useCallback(() => {
    const visit = currentVisit.current
    if (!enabled || !eligible || !visit?.live || visit.key !== key) return
    visit.state = { phase: 'NOTICE', elapsed: 0 }
    visit.lastTick = performance.now()
    markSeen(key)
    setSnapshot({ key, phase: 'NOTICE' })
  }, [key, enabled, eligible])

  const phase: AtmospherePhase = paused || !eligible || !enabled || snapshot.key !== key ? 'CALM' : snapshot.phase
  return { phase, enabled, setEnabled, skip, replay }
}
