import { useEffect, useMemo, useState } from 'react'
import type { LowLightOptions } from '../../lib/heritageImage'
import { composeHeritagePortrait, HERITAGE_REENACTMENT_LABEL, type HeritageOutputVariant } from './compositor'
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
}

export function HeritageStudio({ file, siteCode, stationCode, initialRoleId, templates, variant, lowLight, onComposite }: HeritageStudioProps) {
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
      return
    }
    if (typeof createImageBitmap !== 'function') {
      setCandidates([])
      setSelectedFaceId(undefined)
      return
    }
    let cancelled = false
    void createImageBitmap(file)
      .then(async (bitmap) => {
        try {
          const found = await detectFaceCandidates(bitmap)
          if (!cancelled) {
            setCandidates(found)
            setSelectedFaceId(found.length === 1 ? found[0].id : undefined)
          }
        } finally {
          bitmap.close()
        }
      })
      .catch(() => {
        if (!cancelled) setCandidates([])
      })
    return () => { cancelled = true }
  }, [file])

  const selectRole = (role: HeritageRoleTemplate) => {
    if (!role.published) return
    setSelected(role)
    setPlacement(initialPlacement(null, role))
  }

  const createComposite = async () => {
    if (!file || !selected || !placement) return
    let candidate: FaceCandidate | null
    try {
      candidate = chooseFaceCandidate(candidates, selectedFaceId)
    } catch {
      return
    }
    setRendering(true)
    try {
      const blob = await composeHeritagePortrait({ photo: file, template: selected, candidate, placement, lowLight, variant })
      onComposite(new File([blob], `timelens-${selected.id}-${variant}.jpg`, { type: 'image/jpeg' }), selected)
    } finally {
      setRendering(false)
    }
  }

  return (
    <section className="grid gap-md" data-testid="heritage-studio">
      <HeritageRolePicker siteCode={siteCode} stationCode={stationCode} templates={published} selectedId={selected?.id} onSelect={selectRole} />
      {selected && placement && (
        <>
          {candidates.length > 1 && (
            <label className="grid gap-1 text-sm text-on-surface-variant">Chọn khuôn mặt cần dùng
              <select value={selectedFaceId ?? ''} onChange={(e) => setSelectedFaceId(e.target.value || undefined)} className="rounded-lg border border-outline-variant bg-surface px-sm py-xs">
                <option value="">Chọn khuôn mặt</option>
                {candidates.map((candidate, index) => <option key={candidate.id} value={candidate.id}>Khuôn mặt {index + 1}</option>)}
              </select>
            </label>
          )}
          <FaceAdjustControls placement={placement} template={selected} onChange={setPlacement} />
          <p className="text-xs text-on-surface-variant">Ảnh chỉ được xử lý trong trình duyệt. {HERITAGE_REENACTMENT_LABEL}.</p>
          <button type="button" disabled={!file || rendering || (candidates.length > 1 && !selectedFaceId)} onClick={() => void createComposite()} className="rounded-lg bg-primary px-md py-sm font-bold text-on-primary disabled:opacity-50">
            {rendering ? 'Đang dựng ảnh…' : 'Tạo ảnh hóa thân'}
          </button>
        </>
      )}
    </section>
  )
}
