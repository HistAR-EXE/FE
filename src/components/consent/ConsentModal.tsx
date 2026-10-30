import { useEffect, useRef, useState } from 'react'
import { getConsent, saveConsent } from '../../lib/consent'
import { emitEvent } from '../../lib/pilotEvents'
import { MaterialIcon } from '../ui/MaterialIcon'
import './consent.css'

type ToggleKey = 'analytics' | 'camera' | 'gps'
const ITEMS: { key: ToggleKey; icon: string; title: string; description: string; note: string }[] = [
  { key: 'analytics', icon: 'monitoring', title: 'Phân tích sử dụng', description: 'Cho phép ghi nhận sự kiện sử dụng, như phiên trải nghiệm và trạm đã đến, để cải thiện TimeLens.', note: 'Tắt lựa chọn này để ngừng các sự kiện phân tích của ứng dụng.' },
  { key: 'camera', icon: 'photo_camera', title: 'Camera cho QR & AR', description: 'Hỗ trợ quét mã QR tại trạm và trải nghiệm thực tế tăng cường (AR / Time Portal).', note: 'Trình duyệt sẽ hỏi quyền khi bạn mở tính năng cần camera.' },
  { key: 'gps', icon: 'location_on', title: 'Vị trí (GPS)', description: 'Hỗ trợ xác minh vị trí khi bạn trải nghiệm tại di tích.', note: 'Bạn vẫn có thể check-in bằng mã QR khi không có GPS.' },
]

/** Browser-local preferences; camera/GPS browser permissions remain independently controlled. */
export function ConsentModal() {
  const [open, setOpen] = useState(() => getConsent() === null)
  const [choices, setChoices] = useState<Record<ToggleKey, boolean>>({ analytics: true, camera: true, gps: true })
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.current?.showModal()
    dialog.current?.querySelector<HTMLElement>('#consent-title')?.focus({ preventScroll: true })
    if (dialog.current) dialog.current.scrollTop = 0
    return () => { document.body.style.overflow = overflow; previous?.focus() }
  }, [open])
  const close = (next: Record<ToggleKey, boolean>) => {
    saveConsent(next)
    emitEvent('consent_updated', { payload: { purposes: Object.entries(next).filter(([, v]) => v).map(([k]) => k) } })
    setOpen(false)
  }
  if (!open) return null
  return <dialog ref={dialog} aria-labelledby="consent-title" aria-describedby="consent-description" data-testid="consent-modal" className="tl-consent" onCancel={event => event.preventDefault()}>
    <header className="tl-consent-heading">
      <div className="tl-consent-brand"><span className="tl-consent-mark"><MaterialIcon name="verified_user" /></span><span>TIMELENS <span>/ QUYỀN RIÊNG TƯ</span></span></div>
      <h2 id="consent-title" tabIndex={-1}>Trải nghiệm của bạn.<br /><em>Lựa chọn trong tay bạn.</em></h2>
      <p id="consent-description">Chọn những tiện ích bạn muốn cho phép khi khám phá di sản. Bạn có thể lưu lựa chọn riêng hoặc từ chối tất cả.</p>
    </header>
    <section className="tl-consent-body" aria-label="Tùy chọn quyền riêng tư">
      <div className="tl-consent-section-title"><h3>Quyền riêng tư & quyền truy cập</h3><span>3 mục tùy chọn</span></div>
      <ul className="tl-consent-options">{ITEMS.map(item => <li key={item.key}><label className={`tl-consent-option ${choices[item.key] ? 'is-selected' : ''}`}>
        <span className="tl-consent-icon"><MaterialIcon name={item.icon} /></span>
        <span className="tl-consent-option-copy"><strong id={`consent-label-${item.key}`}>{item.title}</strong><span id={`consent-description-${item.key}`}>{item.description}</span><small>{item.note}</small></span>
        <input type="checkbox" role="switch" aria-labelledby={`consent-label-${item.key}`} aria-describedby={`consent-description-${item.key}`} checked={choices[item.key]} onChange={e => setChoices(prev => ({ ...prev, [item.key]: e.target.checked }))} data-testid={`consent-${item.key}`} />
      </label></li>)}</ul>
      <div className="tl-consent-info"><MaterialIcon name="info" /><p>Lựa chọn được lưu trên <strong>trình duyệt này</strong>. Camera/GPS vẫn do trình duyệt quản lý; lưu lựa chọn ở đây không tự cấp hoặc thu hồi quyền truy cập.</p></div>
      <p className="tl-consent-help">Thay đổi lựa chọn tại <strong>Cài đặt → Quyền riêng tư & phiên</strong>. Để quản lý quyền camera/GPS thực tế, dùng biểu tượng cạnh thanh địa chỉ trình duyệt.</p>
    </section>
    <footer className="tl-consent-footer"><div className="tl-consent-actions"><button type="button" data-testid="consent-save" onClick={() => close(choices)}>Lưu lựa chọn <span aria-hidden="true">✓</span></button><button type="button" data-testid="consent-decline" onClick={() => close({ analytics: false, camera: false, gps: false })}>Từ chối tất cả</button></div><a href="/privacy" target="_blank" rel="noopener noreferrer">Đọc chính sách quyền riêng tư <span aria-hidden="true">↗</span><span className="tl-consent-sr"> (mở trong thẻ mới)</span></a></footer>
  </dialog>
}
