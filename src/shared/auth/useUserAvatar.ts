// src/shared/auth/useUserAvatar.ts
import { images } from '../../assets/images'
import { useAuth } from './useAuth'

export function useUserAvatar(fallback: string = images.avatarHomeV3) {
  const { user } = useAuth()
  return user?.avatarUrl || fallback
}
