import { useMemo } from 'react'
import { MaterialIcon } from '../../components/ui/MaterialIcon'
import { HeritageRoleArtwork } from './HeritageRoleArtwork'
import { getPublishedRoleTemplates, heritageRoleTemplates } from './roleTemplates'
import type { HeritageRoleTemplate, HeritageStationCode } from './types'

type HeritageRolePickerProps = {
  siteCode: string
  stationCode?: HeritageStationCode
  publishedOnly?: boolean
  templates?: readonly HeritageRoleTemplate[]
  selectedId?: string | null
  onSelect: (template: HeritageRoleTemplate) => void
  variant?: 'compact' | 'gallery'
}

export function HeritageRolePicker({
  siteCode,
  stationCode,
  publishedOnly = true,
  templates,
  selectedId,
  onSelect,
  variant = 'compact',
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
    <div
      className={variant === 'gallery'
        ? 'grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4'
        : 'grid grid-cols-2 gap-3'}
      role="list"
      aria-label="Chọn vai hóa thân năm 1968"
    >
      {roles.map((role) => {
        const selected = selectedId === role.id
        return (
          <div key={role.id} role="listitem">
            <button
              type="button"
              data-testid={`heritage-role-${role.id}`}
              aria-pressed={selected}
              onClick={() => onSelect(role)}
              className={`group h-full w-full overflow-hidden rounded-2xl border text-left transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2c867] ${selected ? 'border-[#f2c867] bg-[#2b2115] shadow-[0_10px_32px_rgba(222,169,67,0.2)]' : 'border-white/15 bg-[#111827] hover:-translate-y-0.5 hover:border-[#d8af58]/70 hover:shadow-xl'}`}
            >
              {role.published && (
                <HeritageRoleArtwork
                  template={role}
                  presentation="thumbnail"
                  className="w-full"
                />
              )}
              <span className="block p-3">
                <span className="flex items-start justify-between gap-2">
                  <span>
                    <strong className="block text-[11px] font-black uppercase tracking-[0.12em] text-[#e3bb67]">{role.stationCode} · {role.stationName}</strong>
                    <span className="mt-1 block text-sm font-extrabold leading-snug text-white">{role.title} · {role.roleVariant === 'nam' ? 'Nam' : 'Nữ'}</span>
                  </span>
                  <MaterialIcon name={selected ? 'check_circle' : 'person'} className={selected ? 'text-[#f2c867]' : 'text-slate-400'} />
                </span>
                <span className="mt-1.5 line-clamp-2 block text-xs leading-relaxed text-slate-300">{role.actionLabel}</span>
              </span>
            </button>
          </div>
        )
      })}
    </div>
  )
}
