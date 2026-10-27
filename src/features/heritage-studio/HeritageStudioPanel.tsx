import type { RefObject } from 'react'
import { ReportContentButton } from '../../components/feedback/ReportContentModal'
import type { LowLightOptions } from '../../lib/heritageImage'
import { HeritageStudio, type HeritagePreviewState, type HeritageStudioHandle } from './HeritageStudio'
import { PortraitPicker } from './PortraitPicker'
import type { FacePlacement } from './facePlacement'
import type { HeritageStationCode, PublishedHeritageRoleTemplate } from './types'

type Props = {
  studioRef: RefObject<HeritageStudioHandle | null>
  canvasRef: RefObject<HTMLCanvasElement | null>
  file: File | null
  siteCode: string
  stationCode?: HeritageStationCode
  reportStationCode?: string
  selectedRole: PublishedHeritageRoleTemplate | null
  placement: FacePlacement | null
  lowLight: LowLightOptions
  cameraLocked: boolean
  preservePlacementOnDetection?: boolean
  onRoleChange: (role: PublishedHeritageRoleTemplate) => void
  onPlacementChange: (placement: FacePlacement) => void
  onFileChange: (file: File | null) => void
  onPreviewStateChange: (state: HeritagePreviewState) => void
}

export function HeritageStudioPanel({ studioRef, canvasRef, file, siteCode, stationCode, reportStationCode, selectedRole, placement, lowLight, cameraLocked, preservePlacementOnDetection, onRoleChange, onPlacementChange, onFileChange, onPreviewStateChange }: Props) {
  return <>
    <HeritageStudio ref={studioRef} file={file} siteCode={siteCode} stationCode={stationCode} selectedRole={selectedRole} placement={placement} variant="story" lowLight={lowLight} previewCanvasRef={canvasRef} preservePlacementOnDetection={preservePlacementOnDetection} onRoleChange={onRoleChange} onPlacementChange={onPlacementChange} onPreviewStateChange={onPreviewStateChange} />
    {selectedRole && <div className="flex min-w-0 flex-col gap-md">
      <h3 className="font-title-md">Bước 2 · Ảnh chân dung</h3>
      <PortraitPicker file={file} cameraLocked={cameraLocked} onChange={onFileChange} />
      <p className="text-xs text-on-surface-variant">Xử lý riêng trên thiết bị · không tải ảnh gốc lên máy chủ.</p>
    </div>}
    <ReportContentButton stationCode={reportStationCode} context="photo_frame" />
  </>
}
