import { useEffect } from 'react'
import { adminApi } from '../../features/admin/api'
import { useAuth } from '../../shared/auth/useAuth'
import { appEnv } from '../../shared/config/env'

const HEARTBEAT_INTERVAL_MS = 60_000

export function DemoActivityHeartbeat() {
  const { user } = useAuth()

  useEffect(() => {
    if (!appEnv.demoMode || !user) return

    const send = () => {
      if (document.visibilityState === 'visible') {
        void adminApi.heartbeatDemoActivity().catch(() => {
          // Activity tracking must never interrupt the user's demo session.
        })
      }
    }

    send()
    const timer = window.setInterval(send, HEARTBEAT_INTERVAL_MS)
    document.addEventListener('visibilitychange', send)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', send)
    }
  }, [user])

  return null
}
