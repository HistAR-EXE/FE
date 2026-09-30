// src/pwa/registerSW.ts
// Web PWA only (Workbox generateSW). Flutter app streams media from R2 and does not use this.
import { registerSW } from 'virtual:pwa-register'

export function registerAppServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return
  // autoUpdate: new SW activates and reloads silently; no prompt UI needed.
  registerSW({
    immediate: true,
    onRegisterError(error) {
      console.warn('[PWA] service worker registration failed', error)
    },
  })
}
