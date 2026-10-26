import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { LowLightOptions } from '../../lib/heritageImage'
import { composeHeritagePortrait, type HeritageOutputVariant } from './compositor'
import { chooseFaceCandidate, detectFaceCandidates, initialPlacement, type FaceCandidate, type FacePlacement } from './facePlacement'
import { FaceAdjustControls } from './FaceAdjustControls'
import { HeritageRolePicker } from './HeritageRolePicker'
import { getPublishedRoleTemplates } from './roleTemplates'
import type { HeritageRoleTemplate, HeritageStationCode, PublishedHeritageRoleTemplate } from './types'

type HeritageStudioProps = {
  file: File | null
  siteCode: string
  stationCode?: HeritageStationCode
  initialRoleId?: string | null
  templates?: readonly HeritageRoleTemplate[]
  variant: HeritageOutputVariant
  lowLight: LowLightOptions
  onComposite: (file: File, template: PublishedHeritageRoleTemplate) => void
  onRoleChange?: (template: PublishedHeritageRoleTemplate) => void
}

export function HeritageStudio({ file, siteCode, stationCode, initialRoleId, templates, variant, lowLight, onComposite, onRoleChange }: HeritageStudioProps) {
  const published = useMemo(
    () => templates
      ? templates.filter((role): role is PublishedHeritageRoleTemplate => role.published && role.siteCode === siteCode && (!stationCode || role.stationCode === stationCode))
      : getPublishedRoleTemplates(siteCode, stationCode),
    [siteCode, stationCode, templates],
  )
  const initialRole = published.find((role) => role.id === initialRoleId) ?? published[0] ?? null
  const [selected, setSelected] = useState<PublishedHeritageRoleTemplate | null>(initialRole)
  const [candidates, setCandidates] = useState<FaceCandidate[]>([])
  const [selectedFaceId, setSelectedFaceId] = useState<string | undefined>()
  const [placement, setPlacement] = useState<FacePlacement | null>(selected ? initialPlacement(null, selected) : null)
  const [rendering, setRendering] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [renderError, setRenderError] = useState<string | null>(null)
  const renderSequence = useRef(0)
  const onCompositeRef = useRef(onComposite)

  useEffect(() => {
    onCompositeRef.current = onComposite
  }, [onComposite])

  useEffect(() => {
    const next = published.find((role) => role.id === selected?.id)
      ?? published.find((role) => role.id === initialRoleId)
      ?? published[0]
      ?? null
    setSelected(next)
    setPlacement(next ? initialPlacement(null, next) : null)
  }, [initialRoleId, published, selected?.id])

  useEffect(() => {
    if (!file) {
      setCandidates([])
      setSelectedFaceId(undefined)
      setDetecting(false)
      setRenderError(null)
      return
    }
    if (typeof createImageBitmap !== 'function') {
      setCandidates([])
      setSelectedFaceId(undefined)
      return
    }
    let cancelled = false
    setDetecting(true)
    void createImageBitmap(file)
      .then(async (bitmap) => {
        try {
          const found = await detectFaceCandidates(bitmap)
          if (!cancelled) {
            setCandidates(found)
            setSelectedFaceId(found.length === 1 ? found[0].id : undefined)
            setDetecting(false)
          }
        } finally {
          bitmap.close()
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCandidates([])
          setDetecting(false)
        }
      })
    return () => { cancelled = true }
  }, [file])

  const selectRole = (role: HeritageRoleTemplate) => {
    if (!role.published) return
    setSelected(role)
    setPlacement(initialPlacement(null, role))
    onRoleChange?.(role)
  }

  const createComposite = useCallback(async () => {
    if (!file || !selected || !placement) return
    let candidate: FaceCandidate | null
    try {
      candidate = chooseFaceCandidate(candidates, selectedFaceId)
    } catch {
      setRenderError('Ảnh có nhiều khuôn mặt. Hãy chọn đúng khuôn mặt cần ghép.')
      return
    }
    const sequence = ++renderSequence.current
    setRendering(true)
    setRenderError(null)
    try {
      const blob = await composeHeritagePortrait({ photo: file, template: selected, candidate, placement, lowLight, variant })
      if (sequence === renderSequence.current) {
        onCompositeRef.current(new File([blob], `timelens-${selected.id}-${variant}.jpg`, { type: 'image/jpeg' }), selected)
      }
    } catch {
      if (sequence === renderSequence.current) setRenderError('Không thể ghép ảnh. Hãy thử chọn lại ảnh chân dung.')
    } finally {
      if (sequence === renderSequence.current) setRendering(false)
    }
  }, [candidates, file, lowLight, placement, selected, selectedFaceId, variant])

  useEffect(() => {
    if (!file || !selected || !placement || detecting || (candidates.length > 1 && !selectedFaceId)) return
    const timer = window.setTimeout(() => void createComposite(), 220)
    return () => window.clearTimeout(timer)
  }, [candidates.length, createComposite, detecting, file, placement, selected, selectedFaceId])

  return (
    <section className="grid gap-md" data-testid="heritage-studio">
      <div>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#d9ae58]">Bước 2</p>
            <h3 className="mt-1 text-base font-extrabold text-on-surface">Chọn vai diễn</h3>
          </div>
          <span className="shrink-0 rounded-full border border-[#d9ae58]/35 bg-[#d9ae58]/10 px-2.5 py-1 text-[11px] font-bold text-[#e9c879]">{published.length} lựa chọn</span>
        </div>
        <HeritageRolePicker siteCode={siteCode} stationCode={stationCode} templates={published} selectedId={selected?.id} onSelect={selectRole} />
      </div>
      {selected && placement && (
        <>
          {file && (
            <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold ${renderError ? 'border-red-400/40 bg-red-500/10 text-red-200' : 'w-fit border-[#d9ae58]/35 bg-[#d9ae58]/10 text-[#f3d38b]'}`} role={renderError ? 'alert' : 'status'} aria-live="polite">
              {renderError
                ? renderError
                : detecting
                  ? 'Đang nhận diện…'
                  : candidates.length > 1 && !selectedFaceId
                    ? 'Chọn khuôn mặt cần ghép'
                    : rendering
                      ? 'Đang ghép…'
                      : 'Đã ghép tự động'}
            </div>
          )}
          {candidates.length > 1 && (
            <label className="grid gap-1 text-sm text-on-surface-variant">Chọn khuôn mặt cần dùng
              <select value={selectedFaceId ?? ''} onChange={(e) => setSelectedFaceId(e.target.value || undefined)} className="rounded-lg border border-outline-variant bg-surface px-sm py-xs">
                <option value="">Chọn khuôn mặt</option>
                {candidates.map((candidate, index) => <option key={candidate.id} value={candidate.id}>Khuôn mặt {index + 1}</option>)}
              </select>
            </label>
          )}
          <details className="group rounded-xl border border-outline-variant bg-surface">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold text-on-surface marker:content-none">
              Tinh chỉnh khuôn mặt <span className="float-right text-on-surface-variant group-open:rotate-180">⌄</span>
            </summary>
            <div className="border-t border-outline-variant p-3">
              <FaceAdjustControls placement={placement} template={selected} onChange={setPlacement} />
            </div>
          </details>
        </>
      )}
    </section>
  )
}
