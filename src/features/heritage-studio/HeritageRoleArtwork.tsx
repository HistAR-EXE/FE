import { MaterialIcon } from '../../components/ui/MaterialIcon'
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
      />

      <div
        className={`${thumbnail ? 'hidden' : 'grid'} absolute z-[1] place-items-center rounded-[48%] border border-[#e9c879]/70 bg-[radial-gradient(circle_at_50%_38%,#8d7250_0%,#4e3b28_58%,#21170f_100%)] text-[#f4dfad] shadow-[0_0_24px_rgba(236,196,105,0.2)]`}
        style={{
          left: `${anchor.x * 100}%`,
          top: `${anchor.y * 100}%`,
          width: `${anchor.width * 100}%`,
          height: `${anchor.height * 100}%`,
          transform: `rotate(${template.calibration.faceRotationDeg}deg)`,
        }}
        aria-hidden="true"
      >
        <MaterialIcon name="face" className="text-[clamp(1rem,4vw,2.25rem)] opacity-75" />
      </div>

      <img
        src={template.assets.overlay.url}
        alt={`${template.title} ${template.roleVariant === 'nam' ? 'nam' : 'nữ'} tại ${template.stationName}`}
        loading={eager ? 'eager' : 'lazy'}
        className={`absolute inset-0 z-[2] h-full w-full ${thumbnail ? 'object-contain object-bottom' : 'object-cover'}`}
      />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-1/3 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

      {showFaceGuide && (
        <div className="absolute inset-x-3 bottom-3 z-[4] rounded-lg border border-[#efd58f]/35 bg-[#100c08]/78 px-3 py-2 text-center text-xs font-bold text-[#fff4d2] backdrop-blur-sm">
          Chọn ảnh chân dung để đặt khuôn mặt của bạn vào vai diễn
        </div>
      )}
    </div>
  )
}
