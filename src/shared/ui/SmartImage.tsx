import { useEffect, useState, type ReactNode } from 'react'
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
  const initial = src && !isPlaceholderImage(src) ? src : fallback
  const [url, setUrl] = useState(initial)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
    if (src && !isPlaceholderImage(src)) {
      setUrl(src)
      return
    }
    setUrl(fallback)
  }, [src, fallback])

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
    if (fallback && url !== fallback) {
      setUrl(fallback)
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
