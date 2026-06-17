import { useEffect, useState } from 'react'
import { images } from '../../assets/images'
import type { EraValue } from './types'

type PortalHistoricalImageProps = {
  src?: string
  fallback?: string
  alt: string
  era: EraValue
  filter: string
  onFailed?: () => void
  className?: string
}

/** Ảnh lịch sử trong cổng AR — thử png/jpg và reset khi đổi era. */
export function PortalHistoricalImage({
  src,
  fallback = images.timePortalPast,
  alt,
  era,
  filter,
  onFailed,
  className = 'absolute inset-0 w-full h-full object-cover',
}: PortalHistoricalImageProps) {
  const [url, setUrl] = useState(src || fallback)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
    setUrl(src || fallback)
  }, [src, fallback, era])

  useEffect(() => {
    if (failed) onFailed?.()
  }, [failed, onFailed])

  const onError = () => {
    if (url.endsWith('.png')) {
      setUrl(url.replace(/\.png$/i, '.jpg'))
      return
    }
    if (url.endsWith('.jpg')) {
      setUrl(url.replace(/\.jpg$/i, '.png'))
      return
    }
    if (url !== fallback) {
      setUrl(fallback)
      return
    }
    setFailed(true)
  }

  if (failed) return null

  return (
    <img
      src={url}
      alt={alt}
      className={className}
      style={{ filter }}
      onError={onError}
      draggable={false}
    />
  )
}
