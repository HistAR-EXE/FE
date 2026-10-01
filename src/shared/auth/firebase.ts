import { initializeApp, type FirebaseApp } from 'firebase/app'
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  indexedDBLocalPersistence,
  initializeAuth,
  onAuthStateChanged,
  type Auth,
  type User,
  type UserCredential,
} from 'firebase/auth'

/** Safari needs auth on the same site as the app — proxy `/__/auth` on Vercel (see vercel.json). */
function resolveAuthDomain(): string | undefined {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase()
    if (host === 'timelens.asia' || host === 'www.timelens.asia') return host
  }
  const fromEnv = (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined)?.trim()
  return fromEnv || undefined
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: resolveAuthDomain(),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
}

export const firebaseEnabled = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId,
)

export const firebaseApp: FirebaseApp | null = firebaseEnabled ? initializeApp(firebaseConfig) : null

function createFirebaseAuth(app: FirebaseApp): Auth {
  if (typeof window === 'undefined') {
    return getAuth(app)
  }
  try {
    return initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
      popupRedirectResolver: browserPopupRedirectResolver,
    })
  } catch (error) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code)
        : ''
    if (code === 'auth/already-initialized') {
      return getAuth(app)
    }
    throw error
  }
}

export const firebaseAuth: Auth | null = firebaseApp ? createFirebaseAuth(firebaseApp) : null
export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

/** Marks that signInWithRedirect was started — survives iOS cross-site redirect better in localStorage. */
export const GOOGLE_REDIRECT_PENDING_KEY = 'timelens_google_redirect_pending'
const GOOGLE_REDIRECT_PENDING_TTL_MS = 15 * 60 * 1000

export function markGoogleRedirectPending(): void {
  try {
    localStorage.setItem(GOOGLE_REDIRECT_PENDING_KEY, String(Date.now()))
  } catch {
    try {
      sessionStorage.setItem(GOOGLE_REDIRECT_PENDING_KEY, '1')
    } catch {
      /* private mode */
    }
  }
}

export function clearGoogleRedirectPending(): void {
  try {
    localStorage.removeItem(GOOGLE_REDIRECT_PENDING_KEY)
  } catch {
    /* ignore */
  }
  try {
    sessionStorage.removeItem(GOOGLE_REDIRECT_PENDING_KEY)
  } catch {
    /* ignore */
  }
}

export function isGoogleRedirectPending(): boolean {
  try {
    const raw = localStorage.getItem(GOOGLE_REDIRECT_PENDING_KEY)
    if (raw) {
      const ts = Number(raw)
      if (Number.isFinite(ts) && ts > 0) {
        if (Date.now() - ts > GOOGLE_REDIRECT_PENDING_TTL_MS) {
          clearGoogleRedirectPending()
          return false
        }
        return true
      }
      // Legacy value "1" from older builds — treat as expired stale flag.
      clearGoogleRedirectPending()
    }
  } catch {
    /* ignore */
  }
  try {
    if (sessionStorage.getItem(GOOGLE_REDIRECT_PENDING_KEY) === '1') return true
  } catch {
    return false
  }
  return false
}

/** Firebase may append auth params when returning from histar-*.firebaseapp.com. */
export function isFirebaseAuthCallbackUrl(): boolean {
  if (typeof window === 'undefined') return false
  if (isGoogleRedirectPending()) return true
  const { search, hash } = window.location
  return (
    /(?:^|[?&#])apiKey=/i.test(search + hash) ||
    /(?:^|[?&#])authType=/i.test(search + hash) ||
    /(?:^|[?&#])mode=signIn/i.test(search + hash)
  )
}

/** getRedirectResult is one-shot; cache so React StrictMode remount does not lose it. */
let redirectResultPromise: Promise<UserCredential | null> | null = null

export function consumeGoogleRedirectResult(auth: Auth): Promise<UserCredential | null> {
  if (!redirectResultPromise) {
    redirectResultPromise = getRedirectResult(auth).catch((err) => {
      redirectResultPromise = null
      throw err
    })
  }
  return redirectResultPromise
}

// Start consuming redirect as early as possible (before React effects — critical on iOS Safari).
if (typeof window !== 'undefined' && firebaseAuth) {
  void consumeGoogleRedirectResult(firebaseAuth)
}

function waitForFirebaseUser(auth: Auth, timeoutMs = 12000): Promise<User | null> {
  if (auth.currentUser) return Promise.resolve(auth.currentUser)
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      unsub()
      resolve(auth.currentUser)
    }, timeoutMs)
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) return
      window.clearTimeout(timer)
      unsub()
      resolve(user)
    })
  })
}

let googleRedirectIdTokenPromise: Promise<string | null> | null = null
let googleRedirectFailedPending = false

export function didGoogleRedirectFailAfterPending(): boolean {
  return googleRedirectFailedPending
}

/**
 * Completes Google redirect once per page load (survives StrictMode).
 * Returns idToken, or null when there was no pending redirect.
 */
/** Call before a new signInWithRedirect so a failed attempt can retry. */
export function resetGoogleRedirectFlow(): void {
  redirectResultPromise = null
  googleRedirectIdTokenPromise = null
  googleRedirectFailedPending = false
}

export function resolveGoogleRedirectIdToken(auth: Auth): Promise<string | null> {
  if (!googleRedirectIdTokenPromise) {
    const expectRedirect = isGoogleRedirectPending() || isFirebaseAuthCallbackUrl()
    googleRedirectIdTokenPromise = (async () => {
      const credential = await consumeGoogleRedirectResult(auth)
      if (credential?.user) {
        clearGoogleRedirectPending()
        googleRedirectFailedPending = false
        return credential.user.getIdToken()
      }

      if (!expectRedirect) return null

      const user = await waitForFirebaseUser(auth)
      clearGoogleRedirectPending()
      if (!user) {
        googleRedirectFailedPending = true
        return null
      }
      googleRedirectFailedPending = false
      return user.getIdToken()
    })().catch((err) => {
      googleRedirectIdTokenPromise = null
      clearGoogleRedirectPending()
      throw err
    })
  }
  return googleRedirectIdTokenPromise
}
