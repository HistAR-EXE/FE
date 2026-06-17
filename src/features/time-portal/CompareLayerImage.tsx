import { useEffect, useState } from 'react'
import { images } from '../../assets/images'

type CompareLayerImageProps = {
  src?: string
  fallback: string
  alt: string
  className?: string
  style?: React.CSSProperties
  onLoad?: () => void
  onFailed?: () => void
}

/** Ảnh so sánh với fallback khi URL DB (.png) không tồn tại. */
export function CompareLayerImage({ src, fallback, alt, className, style, onLoad, onFailed }: CompareLayerImageProps) {
  const [url, setUrl] = useState(src || fallback)

  useEffect(() => {
    setUrl(src || fallback)
  }, [src, fallback])

  const onError = () => {
    if (url.endsWith('.png')) {
      setUrl(url.replace(/\.png$/i, '.jpg'))
      return
    }
    if (url.endsWith('.jpg')) {
      setUrl(url.replace(/\.jpg$/i, '.png'))
      return
    }
    if (url !== fallback) setUrl(fallback)
    else {
      onFailed?.()
      if (fallback !== images.timePortalPast) setUrl(images.timePortalPast)
    }
  }

  return (
    <img
      src={url}
      alt={alt}
      className={className}
      style={style}
      onLoad={onLoad}
      onError={onError}
      draggable={false}
    />
  )
}
