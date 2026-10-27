import { useState, type ReactNode } from 'react'
import { avatarInitials, safeProfileImage } from './profileState'
import type { ProfileResource } from './useProfileResource'

export function ProfileIcon({ name }: { name: string }) { return <span className="material-symbols-outlined" aria-hidden="true">{name}</span> }

export function ProfileAvatar({ name, src }: { name: string; src: string | null }) {
  const image = safeProfileImage(src)
  const [failed, setFailed] = useState<string | null>(null)
  return <div className="pf-avatar">{image && failed !== image ? <img src={image} alt={`Ảnh đại diện của ${name}`} onError={() => setFailed(image)} /> : <span aria-label={`Chữ viết tắt của ${name}`}>{avatarInitials(name)}</span>}</div>
}

export function ProfileImage({ src, alt, className = '' }: { src: string | null; alt: string; className?: string }) {
  const image = safeProfileImage(src)
  const [failed, setFailed] = useState<string | null>(null)
  return image && failed !== image ? <img className={className} src={image} alt={alt} loading="lazy" onError={() => setFailed(image)} /> : <div className={`pf-image-fallback ${className}`} role="img" aria-label={alt}><ProfileIcon name="museum" /></div>
}

export function ProfileResourceState<T>({ resource, label, children }: { resource: ProfileResource<T>; label: string; children: (data: T) => ReactNode }) {
  if (resource.status === 'error') return <div className="pf-notice error" role="alert"><ProfileIcon name="cloud_off" /><div><strong>Chưa tải được {label}</strong><p>Dữ liệu ở khu vực này chưa sẵn sàng. Các phần còn lại vẫn có thể sử dụng.</p><button type="button" className="pf-text-button" onClick={() => void resource.reload()}>Thử lại</button></div></div>
  if (!resource.data) return <div className="pf-loading" role="status"><span className="pf-skeleton" /><p>Đang tải {label}…</p></div>
  return <>{resource.status === 'loading' && <p className="pf-updating" role="status">Đang cập nhật…</p>}{children(resource.data)}</>
}

export function ProfileFact({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return <div className="pf-fact"><dt>{label}</dt><dd>{value}</dd>{hint && <small>{hint}</small>}</div>
}
