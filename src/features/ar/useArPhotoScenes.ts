import { useEffect, useState } from 'react'
import { photoScenesApi, type PhotoScene } from '../photo-scenes/api'
import { getArSceneBySlug } from './cuChiArScenes'
import type { CuChiSceneSlug, EraValue } from './types'

export function useArPhotoScenes(locationId: string | undefined, sceneSlug: CuChiSceneSlug) {
  const [scenes, setScenes] = useState<PhotoScene[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!locationId) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    photoScenesApi
      .byLocation(locationId)
      .then((data) => {
        if (!cancelled) {
          setScenes(data)
          setError(null)
        }
      })
      .catch(() => {
        if (!cancelled) setError('Không tải được dữ liệu scene.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [locationId])

  const config = getArSceneBySlug(sceneSlug)
  const dbScene = scenes.find((s) => s.id === config.sceneId) ?? scenes.find((s) => s.unlockKey === config.unlockKey)

  const captionForEra = (era: EraValue): string => {
    const layer = dbScene?.layers?.find((l) => l.era === era)
    if (layer?.caption) return layer.caption
    const fallback = dbScene?.layers?.find((l) => l.era === 1968)
    return fallback?.caption ?? ''
  }

  const overlayImageForEra = (era: EraValue): string | undefined => {
    if (era === 2026) return undefined
    const layer = dbScene?.layers?.find((l) => l.era === era)
    if (layer?.imageUrl) {
      // 1948 trong seed hiện dùng ảnh bản đồ tổng quát; ưu tiên ảnh 1968 để AR nhìn giống tái hiện tại điểm hơn.
      if (era === 1948 && layer.imageUrl.includes('/map/')) {
        const era1968 = dbScene?.layers?.find((l) => l.era === 1968)
        if (era1968?.imageUrl) return era1968.imageUrl
      }
      return layer.imageUrl
    }
    const era1968 = dbScene?.layers?.find((l) => l.era === 1968)
    if (era1968?.imageUrl) return era1968.imageUrl
    return `/media/cu-chi/scenes/${config.slug}-${era}.png`
  }

  return { scenes, loading, error, config, dbScene, captionForEra, overlayImageForEra }
}
