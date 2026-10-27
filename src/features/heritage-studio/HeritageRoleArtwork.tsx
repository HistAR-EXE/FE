import { useState } from 'react'
import type { PublishedHeritageRoleTemplate } from './types'

type HeritageRoleArtworkProps = {
  template: PublishedHeritageRoleTemplate
  className?: string
  eager?: boolean
  showFaceGuide?: boolean
  presentation?: 'portrait' | 'thumbnail'
}

export function HeritageRoleArtwork({
  template,
  className = '',
  eager = false,
  showFaceGuide = false,
  presentation = 'portrait',
}: HeritageRoleArtworkProps) {
  const anchor = template.calibration.faceAnchor
  const thumbnail = presentation === 'thumbnail'
  const [assetError, setAssetError] = useState(false)

  return (
    <div
      className={`relative isolate overflow-hidden bg-[#20170f] ${thumbnail ? 'aspect-[4/3]' : 'aspect-[9/16]'} ${className}`}
      data-testid={`heritage-artwork-${template.id}`}
    >
      <img
        src={template.assets.background.url}
        alt=""
        aria-hidden="true"
        loading={eager ? 'eager' : 'lazy'}
        className="absolute inset-0 h-full w-full object-cover"
        onError={() => setAssetError(true)}
      />

      {!thumbnail && !assetError && <div
        className="absolute z-[1] rounded-[48%] border-2 border-dashed border-[#e9c879]/85"
        style={{
          left: `${anchor.x * 100}%`,
          top: `${anchor.y * 100}%`,
          width: `${anchor.width * 100}%`,
          height: `${anchor.height * 100}%`,
          transform: `rotate(${template.calibration.faceRotationDeg}deg)`,
        }}
        aria-label="Vòng guide khuôn mặt"
      />}

      <img
        src={template.assets.overlay.url}
        alt={`${template.title} ${template.roleVariant === 'nam' ? 'nam' : 'nữ'} tại ${template.stationName}`}
        loading={eager ? 'eager' : 'lazy'}
        className={`absolute inset-0 z-[2] h-full w-full ${thumbnail ? 'object-contain object-bottom' : 'object-cover'}`}
        onError={() => setAssetError(true)}
      />

      {assetError && <div className="absolute inset-0 z-[4] grid place-items-center bg-[#20170f] p-6 text-center text-sm font-bold text-amber-100">Không tải được artwork. Hãy thử lại khi có mạng.</div>}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-1/3 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

      {showFaceGuide && (
        <div className="absolute inset-x-3 bottom-3 z-[4] rounded-lg border border-[#efd58f]/35 bg-[#100c08]/78 px-3 py-2 text-center text-xs font-bold text-[#fff4d2] backdrop-blur-sm">
          Chọn ảnh chân dung để đặt khuôn mặt của bạn vào vai diễn
        </div>
      )}
    </div>
  )
}
