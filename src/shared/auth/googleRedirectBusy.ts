import { useEffect, useState } from 'react'

let busy = false
const listeners = new Set<(value: boolean) => void>()

export function setGoogleRedirectBusy(value: boolean) {
  if (busy === value) return
  busy = value
  listeners.forEach((listener) => listener(value))
}

export function isGoogleRedirectBusy(): boolean {
  return busy
}

export function useGoogleRedirectBusy(): boolean {
  const [state, setState] = useState(busy)
  useEffect(() => {
    listeners.add(setState)
    return () => {
      listeners.delete(setState)
    }
  }, [])
  return state
}
