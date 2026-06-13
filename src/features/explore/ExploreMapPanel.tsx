import { Link, useLocation } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import type { Location } from '../locations/api'
import { discoveriesApi, type DiscoveryPoint } from '../gamification/api'
import { discoveryDeepLink } from '../gamification/discoveryRouting'
import { useDiscoverySummary } from '../gamification/useDiscoverySummary'
import { CU_CHI_LOCATION_ID } from '../../shared/config/constants'
import { useAuth } from '../../shared/auth/useAuth'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import { images } from '../../assets/images'

type ExploreMapPanelProps = {
  locations: Location[]
  mapZoom: number
  onZoomIn: () => void
  onZoomOut: () => void
}

const CU_CHI_MAP_HERO = '/media/cu-chi/map/hero.jpg'

export function ExploreMapPanel({ locations, mapZoom, onZoomIn, onZoomOut }: ExploreMapPanelProps) {
  const location = useLocation()
  const { isAuthenticated } = useAuth()
  const [points, setPoints] = useState<DiscoveryPoint[]>([])
  const { summary, refetch: refetchSummary } = useDiscoverySummary(CU_CHI_LOCATION_ID)
  const [useLegacyPins, setUseLegacyPins] = useState(false)

  useEffect(() => {
    discoveriesApi
      .pointsByLocation(CU_CHI_LOCATION_ID)
      .then((list) => {
        setPoints(list)
        setUseLegacyPins(list.length === 0)
      })
      .catch(() => setUseLegacyPins(true))
  }, [])

  useEffect(() => {
    if (location.pathname.includes('/explore') && isAuthenticated) {
      void refetchSummary()
    }
  }, [isAuthenticated, location.pathname, refetchSummary])

  const discoveredKeys = useMemo(() => new Set(summary?.keys ?? []), [summary])
  const progressLabel = summary
    ? `Đã khám phá ${summary.discovered}/${summary.total} — ${Math.round((summary.discovered / Math.max(summary.total, 1)) * 100)}%`
    : points.length > 0
      ? `Khám phá 0/${points.length} — đăng nhập để lưu tiến trình`
      : 'Đang quét khu vực...'

  const mapBg = CU_CHI_MAP_HERO

  return (
    <section className="flex-1 h-64 lg:h-full min-h-[16rem] lg:min-h-0 rounded-2xl overflow-hidden border border-outline-variant relative bg-surface-container-lowest shadow-inner order-last lg:order-none">
      <div
        className="absolute inset-0 bg-cover bg-center opacity-80 transition-transform duration-300"
        style={{
          backgroundImage: `url('${mapBg}'), url('${images.exploreMapBg}')`,
          filter: 'grayscale(40%) sepia(15%) brightness(55%) contrast(110%)',
          transform: `scale(${mapZoom})`,
        }}
      />
      <div className="absolute inset-0 bg-dongson-pattern opacity-20 pointer-events-none" />
      <div className="absolute right-md bottom-md flex flex-col gap-sm z-20">
        <button
          type="button"
          onClick={onZoomIn}
          className="w-10 h-10 bg-surface/80 border border-outline-variant rounded-full flex items-center justify-center text-on-surface"
        >
          <MaterialIcon name="add" />
        </button>
        <button
          type="button"
          onClick={onZoomOut}
          className="w-10 h-10 bg-surface/80 border border-outline-variant rounded-full flex items-center justify-center text-on-surface"
        >
          <MaterialIcon name="remove" />
        </button>
      </div>
      <div className="absolute top-md left-md bg-surface-container-high/80 border border-outline-variant px-4 py-2 rounded-full flex items-center gap-2 z-20 max-w-[90%]">
        <div className="w-2 h-2 rounded-full bg-secondary animate-pulse shrink-0" />
        <span className="font-title-md text-secondary text-sm truncate">{progressLabel}</span>
      </div>

      {!useLegacyPins &&
        points.map((point) => {
          const visited = discoveredKeys.has(point.unlockKey)
          return (
            <Link
              key={point.id}
              to={discoveryDeepLink(CU_CHI_LOCATION_ID, point.unlockKey)}
              className="absolute group cursor-pointer z-20 -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${point.mapXPct}%`, top: `${point.mapYPct}%` }}
              title={point.name}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full border ${
                  visited ? 'bg-primary border-primary glow-primary' : 'bg-surface-container border-outline-variant opacity-40'
                }`}
              />
              <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity w-max bg-surface-container border border-outline-variant px-2 py-1 rounded-md shadow-lg">
                <span className="font-label-sm text-label-sm text-on-surface-variant">{point.name}</span>
              </div>
            </Link>
          )
        })}

      {useLegacyPins &&
        locations.slice(0, 3).map((location, idx) => (
          <Link
            key={location.id}
            to={`/explore/${location.id}`}
            className={`absolute group cursor-pointer z-20 ${
              idx === 0 ? 'top-1/2 left-1/3' : idx === 1 ? 'top-[30%] left-[60%]' : 'top-[70%] left-[45%]'
            } -translate-x-1/2 -translate-y-1/2`}
          >
            <div className={`${idx === 0 ? 'w-4 h-4 bg-secondary' : 'w-3 h-3 bg-primary/70'} rounded-full border border-primary`} />
            <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity w-max bg-surface-container border border-outline-variant px-2 py-1 rounded-md shadow-lg">
              <span className="font-label-sm text-label-sm text-on-surface-variant">{location.name}</span>
            </div>
          </Link>
        ))}
    </section>
  )
}
