import { useMemo } from 'react'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import { getPublishedRoleTemplates, heritageRoleTemplates } from './roleTemplates'
import type { HeritageRoleTemplate, HeritageStationCode } from './types'

type HeritageRolePickerProps = {
  siteCode: string
  stationCode?: HeritageStationCode
  publishedOnly?: boolean
  templates?: readonly HeritageRoleTemplate[]
  selectedId?: string | null
  onSelect: (template: HeritageRoleTemplate) => void
}

export function HeritageRolePicker({
  siteCode,
  stationCode,
  publishedOnly = true,
  templates,
  selectedId,
  onSelect,
}: HeritageRolePickerProps) {
  const roles = useMemo(() => {
    if (!templates && publishedOnly) return getPublishedRoleTemplates(siteCode, stationCode)
    const source = templates ?? heritageRoleTemplates
    return source.filter((role) =>
      (!publishedOnly || role.published) &&
      role.siteCode === siteCode && (!stationCode || role.stationCode === stationCode))
  }, [publishedOnly, siteCode, stationCode, templates])

  if (roles.length === 0) {
    return (
      <div className="rounded-xl border border-outline-variant bg-surface p-md text-sm text-on-surface-variant" role="status" data-testid="heritage-role-unavailable">
        <p className="font-bold text-on-surface">Vai hóa thân đang được duyệt sử liệu.</p>
        <p className="mt-1">Bạn vẫn có thể lưu ảnh kỷ niệm gốc; TimeLens sẽ không hiển thị template chưa được duyệt.</p>
      </div>
    )
  }

  return (
    <div className="grid gap-sm sm:grid-cols-2" role="list" aria-label="Chọn vai hóa thân năm 1968">
      {roles.map((role) => {
        const selected = selectedId === role.id
        return (
          <div key={role.id} role="listitem">
            <button
              type="button"
              data-testid={`heritage-role-${role.id}`}
              aria-pressed={selected}
              onClick={() => onSelect(role)}
              className={`h-full w-full rounded-xl border p-sm text-left transition-colors ${selected ? 'border-primary bg-primary/10' : 'border-outline-variant bg-surface hover:border-primary/60'}`}
            >
              <span className="flex items-center justify-between gap-2">
                <strong className="text-sm text-on-surface">{role.stationCode} · {role.stationName}</strong>
                <MaterialIcon name={selected ? 'check_circle' : 'person'} className={selected ? 'text-primary' : 'text-on-surface-variant'} />
              </span>
              <span className="mt-1 block text-sm text-on-surface">{role.title} · {role.roleVariant === 'nam' ? 'Nam' : 'Nữ'}</span>
              <span className="mt-1 block text-xs text-on-surface-variant">{role.actionLabel}</span>
            </button>
          </div>
        )
      })}
    </div>
  )
}
