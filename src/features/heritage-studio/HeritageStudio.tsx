import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type RefObject } from 'react'
import type { LowLightOptions } from '../../lib/heritageImage'
import { heritageCanvasToBlob } from '../../lib/heritageImage'
import { loadHeritageResources, releaseHeritageResources, renderHeritagePortrait, type HeritageBitmaps, type HeritageOutputVariant } from './compositor'
import { detectFaceGeometries, initialPlacement, type FaceCandidate, type FacePlacement } from './facePlacement'
import { placementFromGeometry } from './faceAlignment'
import { FaceAdjustControls } from './FaceAdjustControls'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import { FaceChoicePicker, SourceFacePicker } from './SourceFacePicker'
import { HeritageRolePicker } from './HeritageRolePicker'
import { getPublishedRoleTemplates } from './roleTemplates'
import type { FaceGeometry, HeritageRoleTemplate, HeritageStationCode, PublishedHeritageRoleTemplate } from './types'

export type HeritagePreviewState = { ready: boolean; error: string | null }
export type HeritageStudioHandle = { exportFullResolution: () => Promise<File> }

type HeritageStudioProps = {
  file: File | null
  siteCode: string
  stationCode?: HeritageStationCode
  templates?: readonly HeritageRoleTemplate[]
  selectedRole: PublishedHeritageRoleTemplate | null
  placement: FacePlacement | null
  variant: HeritageOutputVariant
  lowLight: LowLightOptions
  previewCanvasRef: RefObject<HTMLCanvasElement | null>
  onRoleChange: (template: PublishedHeritageRoleTemplate) => void
  onPlacementChange: (placement: FacePlacement) => void
  onPreviewStateChange: (state: HeritagePreviewState) => void
  preservePlacementOnDetection?: boolean
}

export const HeritageStudio = forwardRef<HeritageStudioHandle, HeritageStudioProps>(function HeritageStudio({
  file, siteCode, stationCode, templates, selectedRole, placement, variant, lowLight, previewCanvasRef,
  onRoleChange, onPlacementChange, onPreviewStateChange, preservePlacementOnDetection = false,
}, ref) {
  const published = useMemo(() => templates
    ? templates.filter((role): role is PublishedHeritageRoleTemplate => role.published && role.siteCode === siteCode && (!stationCode || role.stationCode === stationCode))
    : getPublishedRoleTemplates(siteCode, stationCode), [siteCode, stationCode, templates])
  const [faces, setFaces] = useState<FaceGeometry[]>([])
  const [selectedFaceId, setSelectedFaceId] = useState<string | undefined>()
  const [manualFace, setManualFace] = useState<FaceCandidate | null>(null)
  const [detecting, setDetecting] = useState(false)
  const [resources, setResources] = useState<HeritageBitmaps | null>(null)
  const [resourceError, setResourceError] = useState<string | null>(null)
  const [renderError, setRenderError] = useState<string | null>(null)
  const [editingManualFace, setEditingManualFace] = useState(false)
  const [ready, setReady] = useState(false)
  const [renderRevision, setRenderRevision] = useState(0)
  const resourceRef = useRef<HeritageBitmaps | null>(null)
  const readyRef = useRef(false)
  const frame = useRef<number | null>(null)
  const reportRef = useRef(onPreviewStateChange)
  useEffect(() => { reportRef.current = onPreviewStateChange }, [onPreviewStateChange])

  useEffect(() => {
    setFaces([]); setSelectedFaceId(undefined); setManualFace(null); setEditingManualFace(false)
    if (!file) { setDetecting(false); return }
    let cancelled = false
    setDetecting(true)
    void createImageBitmap(file).then(async (bitmap) => {
      try {
        const found = await detectFaceGeometries(bitmap)
        if (!cancelled) {
          setFaces(found)
          setSelectedFaceId(found.length === 1 ? found[0].id : undefined)
        }
      } finally { bitmap.close() }
    }).catch((error: unknown) => {
      if (!cancelled) {
        console.error('[heritage-studio]', 'detect', error instanceof Error ? error.name : 'unknown')
        setFaces([])
      }
    }).finally(() => { if (!cancelled) setDetecting(false) })
    return () => { cancelled = true }
  }, [file])

  useEffect(() => {
    if (selectedRole && faces.length === 1 && !preservePlacementOnDetection) onPlacementChange(placementFromGeometry(faces[0], selectedRole))
  }, [faces, selectedRole, onPlacementChange, preservePlacementOnDetection])

  useEffect(() => {
    const canvas = previewCanvasRef.current
    if (!canvas) return
    const onLost = (event: Event) => {
      event.preventDefault()
      readyRef.current = false
      setReady(false)
      setRenderError('Vùng xem trước bị gián đoạn. Chạm thử lại để ghép ảnh.')
      reportRef.current({ ready: false, error: 'Vùng xem trước bị gián đoạn. Chạm thử lại để ghép ảnh.' })
    }
    const onRestored = () => setRenderRevision((value) => value + 1)
    canvas.addEventListener('contextlost', onLost)
    canvas.addEventListener('contextrestored', onRestored)
    return () => { canvas.removeEventListener('contextlost', onLost); canvas.removeEventListener('contextrestored', onRestored) }
  }, [previewCanvasRef, selectedRole])

  useEffect(() => {
    setResources(null); setResourceError(null); resourceRef.current = null
    if (!file || !selectedRole) return
    let cancelled = false
    let loaded: HeritageBitmaps | null = null
    void loadHeritageResources({ photo: file, template: selectedRole }).then((value) => {
      if (cancelled) { releaseHeritageResources(value); return }
      loaded = value
      resourceRef.current = value
      setResources(value)
    }).catch((error: unknown) => {
      if (!cancelled) {
        console.error('[heritage-studio]', 'assets', error instanceof Error ? error.name : 'unknown')
        setResourceError('Không tải được ảnh vai diễn. Hãy thử lại khi có mạng.')
      }
    })
    return () => { cancelled = true; if (loaded) releaseHeritageResources(loaded); if (resourceRef.current === loaded) resourceRef.current = null }
  }, [file, selectedRole])

  const selectedFace = faces.find((face) => face.id === selectedFaceId) ?? null
  const candidate = faces.length ? selectedFace : manualFace
  useEffect(() => {
    readyRef.current = false
    setReady(false)
    reportRef.current({ ready: false, error: resourceError })
    if (frame.current !== null) window.cancelAnimationFrame(frame.current)
    if (!file || !selectedRole || !placement || !candidate || !resources || detecting || resourceError) return
    frame.current = window.requestAnimationFrame(() => {
      const canvas = previewCanvasRef.current
      if (!canvas) return
      canvas.width = 540
      canvas.height = 960
      try {
        renderHeritagePortrait(canvas, { photo: file, template: selectedRole, candidate, placement, lowLight, variant }, resources)
        const pixels = canvas.getContext('2d')?.getImageData(100, 100, 1, 1).data
        if (!pixels || pixels[3] === 0) throw new Error('heritage_preview_blank')
        setRenderError(null)
        setReady(true)
        readyRef.current = true
        reportRef.current({ ready: true, error: null })
      } catch (error) {
        console.error('[heritage-studio]', 'render', error instanceof Error ? error.name : 'unknown')
        const message = 'Không thể ghép ảnh. Hãy thử chọn lại ảnh chân dung.'
        setRenderError(message)
        reportRef.current({ ready: false, error: message })
      }
    })
    return () => { if (frame.current !== null) window.cancelAnimationFrame(frame.current) }
  }, [candidate, detecting, file, lowLight, placement, previewCanvasRef, renderRevision, resourceError, resources, selectedRole, variant])

  useImperativeHandle(ref, () => ({
    async exportFullResolution() {
      const current = resourceRef.current
      if (!file || !selectedRole || !placement || !candidate || !current || !readyRef.current) throw new Error('heritage_preview_not_ready')
      const canvas = document.createElement('canvas')
      canvas.width = 1080
      canvas.height = 1920
      renderHeritagePortrait(canvas, { photo: file, template: selectedRole, candidate, placement, lowLight, variant }, current)
      const blob = await heritageCanvasToBlob(canvas, 'image/jpeg', 0.92)
      return new File([blob], `timelens-${selectedRole.id}-story.jpg`, { type: 'image/jpeg' })
    },
  }), [candidate, file, lowLight, placement, selectedRole, variant])

  const selectFace = useCallback((id: string) => {
    setSelectedFaceId(id)
    const face = faces.find((item) => item.id === id)
    if (face && selectedRole) onPlacementChange(placementFromGeometry(face, selectedRole))
  }, [faces, onPlacementChange, selectedRole])

  const status = resourceError || renderError || (detecting ? 'Đang nhận diện…' : !file ? 'Chọn ảnh chân dung để bắt đầu' : faces.length > 1 && !selectedFace ? 'Chọn khuôn mặt cần ghép' : faces.length === 0 && !manualFace ? 'Không nhận được khuôn mặt — hãy chọn vùng mặt trong ảnh nguồn' : ready ? 'Đã ghép tự động' : 'Đang ghép…')
  return <section className="grid min-w-0 gap-md" data-testid="heritage-studio">
    <div>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div><p className="heritage-step-label text-[11px] font-black uppercase tracking-[0.16em] text-[#d9ae58]">Bước 1</p><h3 className="mt-1 text-base font-extrabold text-on-surface">Chọn vai diễn</h3></div>
        <span className="heritage-role-count shrink-0 rounded-full border border-[#d9ae58]/35 bg-[#d9ae58]/10 px-2.5 py-1 text-[11px] font-bold text-[#e9c879]">{published.length} lựa chọn</span>
      </div>
      <HeritageRolePicker siteCode={siteCode} stationCode={stationCode} templates={published} selectedId={selectedRole?.id} onSelect={(role) => { if (role.published) onRoleChange(role) }} />
    </div>
    {file && selectedRole && <>
      <p className={`min-w-0 break-words rounded-lg border px-3 py-2 text-sm ${resourceError || renderError ? 'border-red-400/40 bg-red-500/10 text-red-200' : 'border-[#d9ae58]/35 bg-[#d9ae58]/10 text-[#f3d38b]'}`} role={resourceError || renderError ? 'alert' : 'status'} aria-live="polite">{status}</p>
      {!detecting && faces.length > 1 && <FaceChoicePicker file={file} faces={faces} selectedId={selectedFaceId} onSelect={selectFace} />}
      {!detecting && faces.length === 0 && (!manualFace || editingManualFace) && <SourceFacePicker file={file} initialCandidate={manualFace} onConfirm={(next) => { setManualFace(next); setEditingManualFace(false); onPlacementChange(initialPlacement(next, selectedRole)) }} />}
      {manualFace && !editingManualFace && <button type="button" className="w-fit rounded-lg border border-outline-variant px-3 py-2 text-sm" onClick={() => setEditingManualFace(true)}>Sửa vùng mặt nguồn</button>}
      {candidate && placement && <div className="grid gap-2">
        <p className="text-xs text-on-surface-variant">Kéo trên ảnh xem trước · chụm hai ngón để phóng to · xoay hai ngón để chỉnh góc.</p>
        <button type="button" className="w-fit rounded-lg border border-outline-variant px-3 py-2 text-sm" onClick={() => onPlacementChange(selectedFace ? placementFromGeometry(selectedFace, selectedRole) : initialPlacement(manualFace, selectedRole))}>Tự động căn lại</button>
        <details className="group min-w-0 overflow-hidden rounded-xl border border-blue-300 bg-surface"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-900 hover:bg-blue-100 [&::-webkit-details-marker]:hidden"><span>Tinh chỉnh bằng thanh trượt</span><MaterialIcon name="expand_more" className="text-xl transition-transform duration-200 group-open:rotate-180" /></summary><div className="border-t border-blue-200 p-3"><FaceAdjustControls placement={placement} template={selectedRole} onChange={onPlacementChange} /></div></details>
      </div>}
      {renderError && <button type="button" className="w-fit rounded-lg border border-primary px-3 py-2 text-sm text-primary" onClick={() => setRenderRevision((value) => value + 1)}>Thử ghép lại</button>}
    </>}
  </section>
})
