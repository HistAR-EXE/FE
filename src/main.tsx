// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import './styles/admin-ops.css'
import './shared/i18n'
import App from './App.tsx'
import { AuthProvider } from './shared/auth/AuthContext'
import { AppModeProvider } from './shared/context/AppModeProvider'
import { ToastProvider } from './shared/ui/toast/ToastProvider'
import { ThemeProvider } from './shared/theme/ThemeProvider'
import { registerAppServiceWorker } from './pwa/registerSW'
import { startOutboxAutoFlush } from './lib/offlineOutbox'
import { startSessionEndTracking } from './lib/pilotEvents'
import { initSentry } from './shared/observability/sentry'

initSentry()
registerAppServiceWorker()
startOutboxAutoFlush()
startSessionEndTracking()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AppModeProvider>
        <AuthProvider>
          <ToastProvider>
            {/* UserProgressProvider nằm trong Router (routes/AppRoutes.tsx). */}
            <App />
          </ToastProvider>
        </AuthProvider>
      </AppModeProvider>
    </ThemeProvider>
  </StrictMode>,
)
