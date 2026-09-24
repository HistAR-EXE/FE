import { useEffect, useState, type ReactNode } from 'react'
import { resolveMediaUrl } from '../config/env'
import { isPlaceholderImage } from '../media/isPlaceholderImage'

type SmartImageProps = {
  src?: string | null
  fallback?: string
  alt: string
  className?: string
  style?: React.CSSProperties
  aspectRatio?: string
  /** Fill a relative parent (absolute inset-0 + object-cover). */
  fill?: boolean
  placeholderIcon?: ReactNode
  onLoad?: () => void
  onFailed?: () => void
}

function swapExtension(url: string): string | null {
  if (url.endsWith('.png')) return url.replace(/\.png$/i, '.jpg')
  if (url.endsWith('.jpg') || url.endsWith('.jpeg')) return url.replace(/\.(jpe?g)$/i, '.png')
  return null
}

export function SmartImage({
  src,
  fallback,
  alt,
  className = '',
  style,
  aspectRatio,
  fill = false,
  placeholderIcon,
  onLoad,
  onFailed,
}: SmartImageProps) {
  const resolvedSrc = src ? resolveMediaUrl(src) : src
  const resolvedFallback = fallback ? resolveMediaUrl(fallback) : fallback
  const initial = resolvedSrc && !isPlaceholderImage(resolvedSrc) ? resolvedSrc : resolvedFallback
  const [url, setUrl] = useState(initial)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
    if (resolvedSrc && !isPlaceholderImage(resolvedSrc)) {
      setUrl(resolvedSrc)
      return
    }
    setUrl(resolvedFallback)
  }, [resolvedSrc, resolvedFallback])

  const handleError = () => {
    if (!url) {
      setFailed(true)
      onFailed?.()
      return
    }
    const swapped = swapExtension(url)
    if (swapped && swapped !== url) {
      setUrl(swapped)
      return
    }
    if (resolvedFallback && url !== resolvedFallback) {
      setUrl(resolvedFallback)
      return
    }
    setFailed(true)
    onFailed?.()
  }

  const fillClass = fill ? 'absolute inset-0 w-full h-full object-cover' : ''
  const wrapperStyle = aspectRatio ? { aspectRatio, ...style } : style

  if (failed || !url) {
    return (
      <div
        className={`overflow-hidden bg-gradient-to-br from-surface-container-high to-surface-container flex items-center justify-center ${fill ? 'absolute inset-0' : 'relative'} ${className}`}
        style={wrapperStyle}
        role="img"
        aria-label={alt}
      >
        {placeholderIcon ?? (
          <span className="text-on-surface-variant/40 text-4xl material-symbols-outlined" aria-hidden>
            image
          </span>
        )}
      </div>
    )
  }

  return (
    <img
      src={url}
      alt={alt}
      className={`${fillClass} ${className}`.trim()}
      style={fill ? style : wrapperStyle}
      onLoad={onLoad}
      onError={handleError}
      draggable={false}
    />
  )
}
