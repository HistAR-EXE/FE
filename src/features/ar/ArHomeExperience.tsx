import { useEffect, useState, useSyncExternalStore } from 'react'
import QRCode from 'qrcode'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import { phoneExperiencePath, type ArArtifact } from './arExperience'
import { ArCardEmail } from './ArCardEmail'

const deviceQuery = '(pointer: coarse) and (max-width: 1024px)'
const subscribe = (callback: () => void) => {
  const query = window.matchMedia(deviceQuery); query.addEventListener('change', callback)
  return () => query.removeEventListener('change', callback)
}
export function ArHomeExperience({ artifact, includeReview, onOpenCamera }: { artifact: ArArtifact; includeReview: boolean; onOpenCamera: () => void }) {
  const mobile = useSyncExternalStore(subscribe, () => window.matchMedia(deviceQuery).matches, () => false)
  const [qr, setQr] = useState('')
  const [qrError, setQrError] = useState(false)
  const [copied, setCopied] = useState(false)
  const phoneUrl = new URL(phoneExperiencePath(artifact.id, includeReview), window.location.origin).href
  const localOnly = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(window.location.hostname)
  useEffect(() => {
    let active = true
    QRCode.toDataURL(phoneUrl, { width: 240, margin: 2, errorCorrectionLevel: 'M', color: { dark: '#0F1B33', light: '#FFFFFF' } })
      .then(value => { if (active) { setQr(value); setQrError(false) } })
      .catch(() => { if (active) setQrError(true) })
    return () => { active = false }
  }, [phoneUrl])
  const review = includeReview ? '&review=1' : ''
  return <section className="ar-handoff ar-surface">
    <div className="ar-target-display">
      <span className="ar-target-label">ẢNH NHẬN DIỆN / {artifact.name.toUpperCase()}</span>
      <img src={artifact.target} alt={`Thẻ nhận diện ${artifact.name}`} />
      <p>{artifact.targetCaption}. {artifact.recognitionCard}</p>
      <div className="ar-image-actions">
        <a aria-label="Tải ảnh nhận diện" className="ar-button ar-button-blue" href={artifact.target} download={artifact.targetPhoto.replace(/\.JPG$/i, '.jpg')}><MaterialIcon name="download" />Tải ảnh nhận diện</a>
        <a className="ar-text-link" href={`/ar-experience?artifact=${artifact.id}&view=target${review}`} target="_blank" rel="noopener noreferrer"><MaterialIcon name="print" />Mở ảnh lớn / In ảnh ↗</a>
        <a className="ar-text-link" href={artifact.targetOriginal} target="_blank" rel="noopener noreferrer">Mở ảnh gốc · {artifact.targetPhoto} ↗</a>
      </div>
      <small className="ar-photo-help">Ảnh màu đầy đủ khung hình. Không cắt ảnh khi in hoặc đưa trước camera.</small>
    </div>
    <div className="ar-handoff-guide">
      <p className="ar-eyebrow">{mobile ? 'TRẢI NGHIỆM TRÊN ĐIỆN THOẠI' : 'LAPTOP HIỂN THỊ · ĐIỆN THOẠI QUÉT'}</p>
      <h2>{mobile ? 'Sẵn sàng ảnh. Bắt đầu quét AR.' : 'Từ ảnh trên laptop, đến hiện vật trên điện thoại.'}</h2>
      <p className="ar-flow-summary">QR mở trang AR. Ảnh màu làm hiện mô hình.</p>
      {mobile && <div className="ar-device-note"><p>Mở ảnh trên màn hình khác hoặc in ảnh; điện thoại không tự quét ảnh trên chính màn hình của nó.</p><button aria-label="Bắt đầu quét AR" className="ar-button ar-button-blue" onClick={onOpenCamera}><MaterialIcon name="photo_camera" />Bắt đầu quét AR</button></div>}
      <ol className="ar-numbered-steps">
        <li><span>1</span><div><strong>{mobile ? "Chuẩn bị ảnh trên màn hình khác hoặc bản in" : "Quét QR để mở trang trên điện thoại"}</strong><p>{mobile ? "Mở ảnh tương ứng trên laptop, một thiết bị khác hoặc in màu trước khi bắt đầu." : "Dùng camera thông thường của điện thoại quét QR bên dưới. QR mở đúng hiện vật; mô hình chưa xuất hiện ở bước này."}</p></div></li>
        <li><span>2</span><div><strong>Chọn “Bật camera AR” trên điện thoại</strong><p>Trong trang vừa mở, cho phép trình duyệt truy cập camera. Không cần cài ứng dụng.</p></div></li>
        <li><span>3</span><div><strong>Quét ảnh màu để hiện mô hình</strong><p>Hướng camera AR vào toàn bộ ảnh trên laptop hoặc bản in. Mô hình xuất hiện trên màn hình điện thoại; bạn có thể xoay, đổi kích thước và bật chuyển động.</p></div></li>
      </ol>
      <div className="ar-qr-row">
        {qr ? <img src={qr} alt="QR mở AR trên điện thoại" /> : <span role="status">{qrError ? 'Chưa tạo được QR. Dùng đường dẫn bên cạnh.' : 'Đang tạo QR…'}</span>}
        <div><strong>{mobile ? "Mở AR trên điện thoại khác" : "QR mở đúng trang AR"}</strong><button className="ar-text-link" onClick={async () => { try { await navigator.clipboard.writeText(phoneUrl); setCopied(true) } catch { setCopied(false) } }}>{copied ? 'Đã sao chép đường dẫn' : 'Sao chép đường dẫn ↗'}</button><a className="ar-phone-link" href={phoneUrl}>{phoneUrl}</a></div>
      </div>
      {localOnly && <p className="ar-error">Bạn đang chạy trên localhost. QR chưa mở được website của laptop từ điện thoại. Hãy dùng đường dẫn HTTPS truy cập được hoặc cấu hình kết nối local theo hướng dẫn.</p>}
      {!mobile && <details className="ar-webcam-option"><summary>Dùng camera trên laptop?</summary><p>Webcam cần ảnh in hoặc ảnh mở trên điện thoại, đặt trước camera.</p><p>Webcam không nhìn thấy ảnh trên chính màn hình laptop. Nếu chỉ có laptop, bạn có thể chọn Khám phá 3D.</p><button aria-label="Dùng webcam laptop" className="ar-button ar-button-blue" onClick={onOpenCamera}><MaterialIcon name="videocam" />Dùng webcam laptop</button></details>}
      <ArCardEmail artifact={artifact} />
    </div>
  </section>
}
