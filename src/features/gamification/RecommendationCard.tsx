// src/features/gamification/RecommendationCard.tsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { recommendationsApi, type RecommendationItem } from './recommendationsApi'
import { discoveryDeepLink } from './discoveryRouting'
import { MaterialIcon } from '../../components/ui/MaterialIcon'

type RecommendationCardProps = {
  locationId: string
  afterUnlockKey?: string
  compact?: boolean
}

export function RecommendationCard({ locationId, afterUnlockKey, compact = false }: RecommendationCardProps) {
  const [items, setItems] = useState<RecommendationItem[]>([])

  useEffect(() => {
    recommendationsApi
      .forLocation(locationId, afterUnlockKey)
      .then((res) => setItems(res.items))
      .catch(() => setItems([]))
  }, [locationId, afterUnlockKey])

  if (items.length === 0) return null

  const item = items[0]

  return (
    <section
      className={`bg-secondary/10 border border-secondary/30 rounded-xl ${compact ? 'p-sm' : 'p-md'} flex gap-md items-start`}
    >
      <MaterialIcon name="tips_and_updates" className="text-secondary shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-xs uppercase tracking-wide text-secondary font-medium mb-1">Gợi ý tiếp theo</p>
        <p className="text-sm text-on-surface font-medium">{item.poiName}</p>
        <p className="text-xs text-on-surface-variant mt-1">{item.reason}</p>
        <Link
          to={discoveryDeepLink(locationId, item.unlockKey)}
          className="inline-block mt-2 text-xs text-secondary underline"
        >
          Khám phá ngay
        </Link>
      </div>
    </section>
  )
}
