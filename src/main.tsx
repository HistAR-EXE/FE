// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import './shared/i18n'
import App from './App.tsx'
import { AuthProvider } from './shared/auth/AuthContext'
import { AppModeProvider } from './shared/context/AppModeProvider'
import { UserProgressProvider } from './shared/context/UserProgressProvider'
import { ToastProvider } from './shared/ui/toast/ToastProvider'
import { ThemeProvider } from './shared/theme/ThemeProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AppModeProvider>
        <AuthProvider>
          <ToastProvider>
            <UserProgressProvider>
              <App />
            </UserProgressProvider>
          </ToastProvider>
        </AuthProvider>
      </AppModeProvider>
    </ThemeProvider>
  </StrictMode>,
)
