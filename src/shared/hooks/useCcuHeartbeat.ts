import { useEffect, useState } from 'react'
import { httpClient } from '../api/httpClient'
import { ApiError } from '../api/contracts'
import { useAuth } from '../auth/useAuth'

/** Org members send CCU heartbeat every 60s so BE can enforce concurrent user limits. */
export function useCcuHeartbeat() {
  const { user } = useAuth()
  const [ccuLimitOpen, setCcuLimitOpen] = useState(false)

  useEffect(() => {
    if (!user?.orgId) return

    const ping = () => {
      void httpClient.post('/api/org/ccu/heartbeat').catch((err: unknown) => {
        if (err instanceof ApiError && (err.code === 'CCU_LIMIT_EXCEEDED' || err.quotaType === 'ORG_CCU')) {
          setCcuLimitOpen(true)
        }
      })
    }

    ping()
    const timer = window.setInterval(ping, 60_000)
    return () => window.clearInterval(timer)
  }, [user?.orgId])

  return { ccuLimitOpen, dismissCcuLimit: () => setCcuLimitOpen(false) }
}
