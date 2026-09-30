// src/lib/consent.ts
// One-time consent (analytics / camera / GPS) stored in localStorage. Camera & GPS flags are informational for the
// UI (the browser still prompts); analytics=false stops pilot events from being emitted.
export const CONSENT_STORAGE_KEY = 'histar_consent_v1'

export type ConsentState = {
  analytics: boolean
  camera: boolean
  gps: boolean
  decidedAt: string
}

export function getConsent(): ConsentState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<ConsentState>
    return {
      analytics: parsed.analytics === true,
      camera: parsed.camera === true,
      gps: parsed.gps === true,
      decidedAt: typeof parsed.decidedAt === 'string' ? parsed.decidedAt : new Date(0).toISOString(),
    }
  } catch {
    return null
  }
}

export function saveConsent(state: Omit<ConsentState, 'decidedAt'>): ConsentState {
  const next: ConsentState = { ...state, decidedAt: new Date().toISOString() }
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(next))
  } catch {
    // storage unavailable (private mode): the modal will simply show again next visit
  }
  return next
}

/** Undecided is allowed (pilot notice shown); only an explicit decline disables analytics events. */
export function isAnalyticsAllowed(): boolean {
  const consent = getConsent()
  return consent === null || consent.analytics
}