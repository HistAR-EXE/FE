// src/components/ui/MaterialIcon.tsx
import type { CSSProperties, ReactNode } from 'react'
import './navigationSymbols.css'

// Same Material Symbols used by the product; this small local subset keeps navigation readable offline.
const localNavigationSymbols = new Set(['360','account_circle','admin_panel_settings','arrow_back','assignment','chevron_left','chevron_right','expand_less','expand_more','explore','forum','history','history_edu','layers','leaderboard','logout','menu','museum','person','photo_camera','settings','view_in_ar'])

type MaterialIconProps = {
  name: string
  filled?: boolean
  className?: string
  style?: CSSProperties
}

export function MaterialIcon({
  name,
  filled = false,
  className = '',
  style,
}: MaterialIconProps) {
  return (
    <span
      className={`material-symbols-outlined ${localNavigationSymbols.has(name) ? 'timelens-local-symbol' : ''} ${className}`}
      style={{
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}`,
        ...style,
      }}
    >
      {name}
    </span>
  )
}

type GlassPanelProps = {
  children: ReactNode
  className?: string
}

export function GlassPanel({ children, className = '' }: GlassPanelProps) {
  return <div className={`glass-panel ${className}`}>{children}</div>
}

type XpProgressBarProps = {
  percent: number
  className?: string
}

export function XpProgressBar({ percent, className = '' }: XpProgressBarProps) {
  return (
    <div
      className={`h-2 w-full bg-surface-container-highest rounded-full overflow-hidden ${className}`}
    >
      <div
        className="h-full xp-gradient rounded-full"
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}
