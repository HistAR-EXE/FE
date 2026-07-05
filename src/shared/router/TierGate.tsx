import type { ReactNode } from 'react'
import { useAuth } from '../auth/useAuth'
import { isPremium } from '../auth/types'
import { UpgradePrompt } from '../../components/monetization/UpgradePrompt'

type TierGateProps = {
  requiredTier?: 'PREMIUM'
  children: ReactNode
  fallback?: ReactNode
  compactFallback?: boolean
  message?: string
}

export function TierGate({
  children,
  fallback,
  compactFallback = false,
  message,
}: TierGateProps) {
  const { user } = useAuth()
  if (isPremium(user)) {
    return <>{children}</>
  }
  if (fallback) {
    return <>{fallback}</>
  }
  return <UpgradePrompt compact={compactFallback} message={message} />
}
