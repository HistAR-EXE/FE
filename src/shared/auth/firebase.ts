import { initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth'

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
