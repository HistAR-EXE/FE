import { useState } from 'react'
import { useSavedCreationImage } from './useSavedCreationImage'

export function SavedCreationImage({ ownerId, creationId, alt, className = '' }: { ownerId: string; creationId: string; alt: string; className?: string }) {
  const image = useSavedCreationImage(ownerId, creationId)
  const [failed, setFailed] = useState('')
  if (image.url && failed !== image.url) return <img className={className} src={image.url} alt={alt} loading="lazy" onError={() => setFailed(image.url)} />
  return <div className={`pf-image-fallback ${className}`} role="status" aria-label={alt}>
    {image.error || failed === image.url && !!image.url ? <><p>Chưa tải được ảnh</p><button type="button" className="pf-text-button" onClick={event => { event.preventDefault(); setFailed(''); image.retry() }}>Thử tải lại ảnh</button></> : <span>Đang tải ảnh…</span>}
  </div>
}
