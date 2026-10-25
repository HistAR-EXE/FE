import { clampPlacement, initialPlacement, type FacePlacement } from './facePlacement'
import type { HeritageRoleTemplate } from './types'

type FaceAdjustControlsProps = {
  placement: FacePlacement
  template: HeritageRoleTemplate
  onChange: (placement: FacePlacement) => void
}

export function FaceAdjustControls({ placement, template, onChange }: FaceAdjustControlsProps) {
  const update = (patch: Partial<FacePlacement>) => onChange(clampPlacement({ ...placement, ...patch }, template))
  return (
    <fieldset className="grid gap-sm rounded-xl border border-outline-variant bg-surface p-md">
      <legend className="px-2 text-sm font-bold text-on-surface">Căn khuôn mặt</legend>
      <label className="grid gap-1 text-xs text-on-surface-variant">Ngang
        <input aria-label="Di chuyển ngang" type="range" min={0} max={100} value={Math.round(placement.x * 100)} onChange={(e) => update({ x: Number(e.target.value) / 100 })} />
      </label>
      <label className="grid gap-1 text-xs text-on-surface-variant">Dọc
        <input aria-label="Di chuyển dọc" type="range" min={0} max={100} value={Math.round(placement.y * 100)} onChange={(e) => update({ y: Number(e.target.value) / 100 })} />
      </label>
      <label className="grid gap-1 text-xs text-on-surface-variant">Phóng to
        <input aria-label="Phóng to khuôn mặt" type="range" min={35} max={400} value={Math.round(placement.scale * 100)} onChange={(e) => update({ scale: Number(e.target.value) / 100 })} />
      </label>
      <label className="grid gap-1 text-xs text-on-surface-variant">Xoay
        <input aria-label="Xoay khuôn mặt" type="range" min={-20} max={20} value={Math.round(placement.rotationDeg)} onChange={(e) => update({ rotationDeg: Number(e.target.value) })} />
      </label>
      <button type="button" className="rounded-lg border border-outline-variant px-sm py-xs text-sm" onClick={() => onChange(initialPlacement(null, template))}>Đặt lại</button>
    </fieldset>
  )
}

