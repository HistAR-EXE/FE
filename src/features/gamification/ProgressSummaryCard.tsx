import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { collectionApi } from '../collection/api'
import { DISCOVERY_RECORDED_EVENT } from './discoveryRouting'
import { debounce } from '../../shared/utils/debounce'
import { useAuth } from '../../shared/auth/useAuth'
import { CU_CHI_LOCATION_ID } from '../../shared/config/constants'
import { useDiscoverySummary } from './useDiscoverySummary'

export type ProgressSummary = {
  discovered: number
  discoveryTotal: number
  collected: number
  artifactTotal: number
  overallPercent: number
}

export function computeOverallPercent(
  discovered: number,
  discoveryTotal: number,
  collected: number,
  artifactTotal: number,
): number {
  const discPct = discoveryTotal > 0 ? discovered / discoveryTotal : 0
  const artPct = artifactTotal > 0 ? collected / artifactTotal : 0
  if (discoveryTotal === 0 && artifactTotal === 0) return 0
  if (discoveryTotal === 0) return Math.round(artPct * 100)
  if (artifactTotal === 0) return Math.round(discPct * 100)
  return Math.round(((discPct + artPct) / 2) * 100)
}

type ProgressSummaryCardProps = {
  locationId?: string
  compact?: boolean
  variant?: 'default' | 'slim'
  questLabel?: string
}

export function ProgressSummaryCard({
  locationId = CU_CHI_LOCATION_ID,
  compact = false,
  variant = 'default',
  questLabel,
}: ProgressSummaryCardProps) {
  const { isAuthenticated } = useAuth()
  const { summary: discoverySummary, loading: discoveryLoading } = useDiscoverySummary(locationId)
  const [artifactCollected, setArtifactCollected] = useState(0)
  const [artifactTotal, setArtifactTotal] = useState(0)
  const [artifactsLoading, setArtifactsLoading] = useState(false)
  const lastDiscoveryVersionRef = useRef(0)

  const refetchArtifacts = useCallback(async () => {
    if (!isAuthenticated) return
    setArtifactsLoading(true)
    try {
      const artifacts = await collectionApi.mine(locationId)
      setArtifactCollected(artifacts.collected)
      setArtifactTotal(artifacts.total)
    } catch {
      setArtifactCollected(0)
      setArtifactTotal(0)
    } finally {
      setArtifactsLoading(false)
    }
  }, [isAuthenticated, locationId])

  const debouncedRefetchArtifacts = useMemo(() => debounce(refetchArtifacts, 500), [refetchArtifacts])

  useEffect(() => {
    if (!isAuthenticated) {
      setArtifactCollected(0)
      setArtifactTotal(0)
      return
    }
    void refetchArtifacts()
  }, [isAuthenticated, refetchArtifacts])

  useEffect(() => {
    if (!discoverySummary) return
    const version = discoverySummary.version ?? 0
    if (version >= lastDiscoveryVersionRef.current) {
      lastDiscoveryVersionRef.current = version
      debouncedRefetchArtifacts()
    }
  }, [debouncedRefetchArtifacts, discoverySummary])

  useEffect(() => {
    const onRecorded = () => debouncedRefetchArtifacts()
    window.addEventListener(DISCOVERY_RECORDED_EVENT, onRecorded)
    return () => {
      debouncedRefetchArtifacts.cancel()
      window.removeEventListener(DISCOVERY_RECORDED_EVENT, onRecorded)
    }
  }, [debouncedRefetchArtifacts])

  const summary: ProgressSummary | null = useMemo(() => {
    if (!isAuthenticated || !discoverySummary) return null
    return {
      discovered: discoverySummary.discovered,
      discoveryTotal: discoverySummary.total,
      collected: artifactCollected,
      artifactTotal,
      overallPercent: computeOverallPercent(
        discoverySummary.discovered,
        discoverySummary.total,
        artifactCollected,
        artifactTotal,
      ),
    }
  }, [artifactCollected, artifactTotal, discoverySummary, isAuthenticated])

  const loading = (discoveryLoading || artifactsLoading) && !summary

  if (!isAuthenticated) {
    return (
      <section className="bg-surface-container border border-outline-variant rounded-xl p-md">
        <p className="text-sm text-on-surface-variant">Đăng nhập để theo dõi tiến độ khám phá và cổ vật.</p>
      </section>
    )
  }

  if (loading) {
    return (
      <section className="bg-surface-container border border-outline-variant rounded-xl p-md animate-pulse h-24" />
    )
  }

  if (!summary) return null

  const discoveryLabel = `${summary.discovered}/${summary.discoveryTotal}`
  const artifactLabel = `${summary.collected}/${summary.artifactTotal}`

  if (variant === 'slim') {
    return (
      <section className="flex items-center justify-between gap-md px-4 py-2 bg-surface-container border border-outline-variant rounded-lg">
        <div className="flex-1 min-w-0 flex items-center gap-sm">
          <div className="flex-1 h-1.5 bg-neutral-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-500"
              style={{ width: `${Math.min(100, summary.overallPercent)}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-primary tabular-nums shrink-0">{summary.overallPercent}%</span>
        </div>
        {questLabel && (
          <span className="shrink-0 text-[11px] px-2 py-0.5 rounded-full border border-secondary/40 bg-secondary/10 text-secondary">
            {questLabel}
          </span>
        )}
      </section>
    )
  }

  return (
    <section className="bg-surface-container border border-outline-variant rounded-xl p-md md:p-lg">
      <div className="flex items-center justify-between gap-sm mb-sm">
        <h2 className="font-title-md text-on-surface">Tiến độ khám phá</h2>
        <span className="font-display-sm text-primary tabular-nums">{summary.overallPercent}%</span>
      </div>
      {!compact && (
        <div className="h-2.5 bg-neutral-200 rounded-full overflow-hidden mb-md">
          <div
            className="h-full bg-gradient-to-r from-primary-500 to-accent-500 transition-all duration-500"
            style={{ width: `${Math.min(100, summary.overallPercent)}%` }}
          />
        </div>
      )}
      <div className={`grid gap-sm ${compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-3'}`}>
        <div className="flex justify-between sm:flex-col sm:justify-start gap-1 rounded-lg bg-surface-container-high/60 px-md py-sm border border-outline-variant/50">
          <span className="text-xs text-on-surface-variant uppercase tracking-wide">Khám phá</span>
          <span className="font-title-md text-secondary tabular-nums">{discoveryLabel}</span>
        </div>
        <div className="flex justify-between sm:flex-col sm:justify-start gap-1 rounded-lg bg-surface-container-high/60 px-md py-sm border border-outline-variant/50">
          <span className="text-xs text-on-surface-variant uppercase tracking-wide">Cổ vật</span>
          <span className="font-title-md text-secondary tabular-nums">{artifactLabel}</span>
        </div>
        <div className="flex justify-between sm:flex-col sm:justify-start gap-1 rounded-lg bg-surface-container-high/60 px-md py-sm border border-outline-variant/50">
          <span className="text-xs text-on-surface-variant uppercase tracking-wide">Tiến độ</span>
          <span className="font-title-md text-primary tabular-nums">{summary.overallPercent}%</span>
        </div>
      </div>
    </section>
  )
}
