// src/shared/context/appModeUtils.ts
import type { AppMode } from './modeContext'

export const ONLINE_ROUTES = ['/explore', '/tour/360', '/chat', '/time-portal'] as const
export const OFFLINE_ROUTES = ['/scan', '/quests', '/secret', '/photo-frame', '/share'] as const

export function isOnlinePriorityRoute(pathname: string): boolean {
  return ONLINE_ROUTES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export function isOfflinePriorityRoute(pathname: string): boolean {
  return OFFLINE_ROUTES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

export function modeBadgeLabel(mode: AppMode | null): string {
  if (mode === 'online') return 'Khám phá từ xa'
  if (mode === 'offline') return 'Đang tại di tích'
  return 'Chọn chế độ'
}
