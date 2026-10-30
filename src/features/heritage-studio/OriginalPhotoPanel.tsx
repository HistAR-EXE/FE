import { MaterialIcon } from '../../components/ui/MaterialIcon'
import { ReportContentButton } from '../../components/feedback/ReportContentModal'
import { UpgradePrompt } from '../../components/monetization/UpgradePrompt'
import type { PhotoFrame } from '../viral/api'
import { isLocalPhotoFrame } from '../photo-flow/localPhotoFrames'
import { resolveMediaUrl } from '../../shared/config/env'
import { PortraitPicker } from './PortraitPicker'

type PhotoOptions = { zoom: number; offsetX: number; offsetY: number; removeBackground: boolean }
type Props = {
  options: PhotoOptions
  onOptionsChange: (options: PhotoOptions) => void
  file: File | null
  cameraLocked: boolean
  onFileChange: (file: File | null) => void
  reportStationCode?: string
  framesLoading: boolean
  frames: readonly PhotoFrame[]
  frameId: string
  onFrameChange: (id: string) => void
  selectedLocked: boolean | undefined
  variant: 'square' | 'story'
  onVariantChange: (variant: 'square' | 'story') => void
}

export function OriginalPhotoPanel({ file, cameraLocked, onFileChange, reportStationCode, framesLoading, frames, frameId, onFrameChange, selectedLocked, variant, onVariantChange, options, onOptionsChange }: Props) {
  return <div className="grid min-w-0 gap-xl">
    <div className="flex min-w-0 flex-col gap-md">
      <h3 className="font-title-md">1. Chọn ảnh của bạn</h3>
      <p className="text-sm text-on-surface-variant">{cameraLocked ? 'Camera tạm khóa tại trạm. Bạn vẫn có thể chọn ảnh đã chụp.' : 'Ảnh rõ mặt, đủ sáng sẽ cho thành phẩm đẹp hơn.'}</p>
      <PortraitPicker file={file} cameraLocked={cameraLocked} onChange={onFileChange} />
      {!cameraLocked && <div className="flex items-start gap-sm rounded-lg border border-outline-variant bg-surface p-sm text-sm text-on-surface-variant" role="note"><MaterialIcon name="flashlight_on" className="shrink-0 text-base text-primary" /><p>Nơi thiếu sáng (địa đạo, hầm)? Bật đèn pin của điện thoại hoặc nút flash trong ứng dụng camera, giữ máy thật vững rồi chụp. Có thể tăng sáng bên dưới nếu ảnh vẫn tối.</p></div>}
      <ReportContentButton stationCode={reportStationCode} context="photo_frame" />
    </div>
    <div className="flex min-w-0 flex-col gap-md">
      <h3 className="font-title-md">2. Khung & kích thước</h3>
      {framesLoading && <p role="status" className="text-sm text-on-surface-variant">Đang tải khung ảnh… Bạn có thể chọn ảnh trước.</p>}
      {!framesLoading && frames.length === 0 && <p className="ph-frame-note"><MaterialIcon name="check_circle" /> Bạn vẫn có thể tạo và lưu ảnh không khung.</p>}
      <div className="ph-frame-grid" role="group" aria-label="Chọn khung ảnh">
        <button type="button" aria-pressed={!frameId} onClick={() => onFrameChange('')}><span className="ph-frame-none"><MaterialIcon name="crop_free" /></span><strong>Không dùng khung</strong></button>
        {frames.map(frame => <button type="button" key={frame.id} aria-pressed={frameId === frame.id} onClick={() => onFrameChange(frame.id)}><img src={isLocalPhotoFrame(frame.id) ? frame.imageUrl : resolveMediaUrl(frame.imageUrl)} alt="" loading="lazy" /><strong>{frame.name}</strong>{frame.requiresPremium && <small>Premium</small>}</button>)}
      </div>
      {selectedLocked && <UpgradePrompt compact message="Khung ảnh này dành cho gói Premium. Nâng cấp để sử dụng toàn bộ theme." />}
      <div className="flex min-w-0 gap-sm">
        <button type="button" aria-pressed={variant === 'square'} className={`ph-format min-w-0 flex-1 rounded-lg border p-sm ${variant === 'square' ? 'border-primary bg-surface-variant text-primary' : 'border-outline-variant text-on-surface-variant'}`} onClick={() => onVariantChange('square')}><MaterialIcon name="crop_square" /><strong>Bài đăng · 1:1</strong><small>1080 × 1080</small></button>
        <button type="button" aria-pressed={variant === 'story'} className={`ph-format min-w-0 flex-1 rounded-lg border p-sm ${variant === 'story' ? 'border-primary bg-surface-variant text-primary' : 'border-outline-variant text-on-surface-variant'}`} onClick={() => onVariantChange('story')}><MaterialIcon name="crop_portrait" /><strong>Story · 9:16</strong><small>1080 × 1920</small></button>
      </div>
      {file && <div className="ph-photo-adjust" role="group" aria-label="Điều chỉnh ảnh trong khung">
        <h3 className="font-title-md">3. Căn chỉnh ảnh</h3>
        <label className="ph-cutout-option"><input type="checkbox" checked={options.removeBackground} onChange={e => onOptionsChange({...options, removeBackground: e.target.checked})} />Tách nền ảnh cá nhân</label>
        <p className="text-sm text-on-surface-variant">Tách nền được xử lý trên thiết bị. Ảnh một người, rõ nét cho kết quả tốt hơn. Bạn có thể giữ nền ảnh gốc nếu muốn.</p>
        {([{key:'zoom',label:'Phóng to',min:1,max:3,step:0.05},{key:'offsetX',label:'Vị trí ngang',min:-1,max:1,step:0.02},{key:'offsetY',label:'Vị trí dọc',min:-1,max:1,step:0.02}] as const).map(control => <label key={control.key}>{control.label}<input type="range" aria-label={control.label} min={control.min} max={control.max} step={control.step} value={options[control.key]} onChange={e => onOptionsChange({...options,[control.key]:Number(e.target.value)})} /></label>)}
        <button type="button" className="pf-button secondary" onClick={() => onOptionsChange({zoom:1,offsetX:0,offsetY:0,removeBackground:false})}>Đặt lại ảnh</button>
      </div>}
    </div>
  </div>
}
