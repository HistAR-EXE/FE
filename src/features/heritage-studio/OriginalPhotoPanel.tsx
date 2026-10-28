import { MaterialIcon } from '../../components/ui/MaterialIcon'
import { ReportContentButton } from '../../components/feedback/ReportContentModal'
import { UpgradePrompt } from '../../components/monetization/UpgradePrompt'
import type { PhotoFrame } from '../viral/api'
import { PortraitPicker } from './PortraitPicker'

type Props = {
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

export function OriginalPhotoPanel({ file, cameraLocked, onFileChange, reportStationCode, framesLoading, frames, frameId, onFrameChange, selectedLocked, variant, onVariantChange }: Props) {
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
      <select value={frameId} onChange={(event) => onFrameChange(event.target.value)} className="min-w-0 rounded-lg border border-outline-variant bg-surface px-sm py-sm">
        <option value="">Không dùng khung</option>
        {frames.map((frame) => <option key={frame.id} value={frame.id}>{frame.name} ({frame.era}){frame.requiresPremium ? ' · Premium' : ''}</option>)}
      </select>
      {selectedLocked && <UpgradePrompt compact message="Khung ảnh này dành cho gói Premium. Nâng cấp để sử dụng toàn bộ theme." />}
      <div className="flex min-w-0 gap-sm">
        <button type="button" aria-pressed={variant === 'square'} className={`ph-format min-w-0 flex-1 rounded-lg border p-sm ${variant === 'square' ? 'border-primary bg-surface-variant text-primary' : 'border-outline-variant text-on-surface-variant'}`} onClick={() => onVariantChange('square')}><MaterialIcon name="crop_square" /><strong>Bài đăng · 1:1</strong><small>1080 × 1080</small></button>
        <button type="button" aria-pressed={variant === 'story'} className={`ph-format min-w-0 flex-1 rounded-lg border p-sm ${variant === 'story' ? 'border-primary bg-surface-variant text-primary' : 'border-outline-variant text-on-surface-variant'}`} onClick={() => onVariantChange('story')}><MaterialIcon name="crop_portrait" /><strong>Story · 9:16</strong><small>1080 × 1920</small></button>
      </div>
    </div>
  </div>
}
