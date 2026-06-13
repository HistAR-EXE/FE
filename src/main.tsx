import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App.tsx'
import { AuthProvider } from './shared/auth/AuthContext'
import { AppModeProvider } from './shared/context/AppModeProvider'
import { ToastProvider } from './shared/ui/toast/ToastProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppModeProvider>
      <AuthProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </AppModeProvider>
  </StrictMode>,
)
