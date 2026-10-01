import { initializeApp, type FirebaseApp } from 'firebase/app'
import {
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  type Auth,
  type User,
  type UserCredential,
} from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
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
export const firebaseAuth: Auth | null = firebaseApp ? getAuth(firebaseApp) : null
export const googleProvider = new GoogleAuthProvider()
// Always show Google account picker (avoid auto-using browser's last signed-in account).
googleProvider.setCustomParameters({ prompt: 'select_account' })

/** Marks that signInWithRedirect was started — used when getRedirectResult returns null. */
export const GOOGLE_REDIRECT_PENDING_KEY = 'timelens_google_redirect_pending'

export function markGoogleRedirectPending(): void {
  try {
    sessionStorage.setItem(GOOGLE_REDIRECT_PENDING_KEY, '1')
  } catch {
    /* private mode */
  }
}

export function clearGoogleRedirectPending(): void {
  try {
    sessionStorage.removeItem(GOOGLE_REDIRECT_PENDING_KEY)
  } catch {
    /* ignore */
  }
}

function isGoogleRedirectPending(): boolean {
  try {
    return sessionStorage.getItem(GOOGLE_REDIRECT_PENDING_KEY) === '1'
  } catch {
    return false
  }
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

function waitForFirebaseUser(auth: Auth, timeoutMs = 4000): Promise<User | null> {
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

/**
 * Completes Google redirect once per page load (survives StrictMode).
 * Returns idToken, or null when there was no pending redirect.
 */
let googleRedirectIdTokenPromise: Promise<string | null> | null = null

export function resolveGoogleRedirectIdToken(auth: Auth): Promise<string | null> {
  if (!googleRedirectIdTokenPromise) {
    googleRedirectIdTokenPromise = (async () => {
      const credential = await consumeGoogleRedirectResult(auth)
      if (credential?.user) {
        clearGoogleRedirectPending()
        return credential.user.getIdToken()
      }
      if (!isGoogleRedirectPending()) return null
      const user = await waitForFirebaseUser(auth)
      clearGoogleRedirectPending()
      if (!user) return null
      return user.getIdToken()
    })().catch((err) => {
      googleRedirectIdTokenPromise = null
      throw err
    })
  }
  return googleRedirectIdTokenPromise
}