import { MaterialIcon } from '../../components/ui/MaterialIcon'

type PortalViewMode = 'compare' | 'ar'

type TimePortalViewSwitchProps = {
  mode: PortalViewMode
  onChange: (mode: PortalViewMode) => void
  arAvailable: boolean
  className?: string
}

export function TimePortalViewSwitch({ mode, onChange, arAvailable, className }: TimePortalViewSwitchProps) {
  if (!arAvailable) return null

  return (
    <div
      className={`inline-flex rounded-full p-1 bg-surface-container border border-outline-variant backdrop-blur-md ${className ?? ''}`}
      role="tablist"
      aria-label="Chế độ Cổng thời gian"
    >
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'compare'}
        onClick={() => onChange('compare')}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs md:text-sm font-label-sm transition-colors ${
          mode === 'compare' ? 'bg-surface-container-high text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
        }`}
      >
        <MaterialIcon name="compare" className="text-base" />
        So sánh ảnh
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={mode === 'ar'}
        onClick={() => onChange('ar')}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs md:text-sm font-label-sm transition-colors ${
          mode === 'ar'
            ? 'bg-primary/20 text-primary border border-primary/40 shadow-[0_0_12px_rgba(242,191,80,0.25)]'
            : 'text-on-surface-variant hover:text-primary'
        }`}
      >
        <MaterialIcon name="view_in_ar" className="text-base" />
        Cổng AR
        <span className="text-[9px] uppercase tracking-wide px-1 py-0.5 rounded bg-primary/25 text-primary">Mới</span>
      </button>
    </div>
  )
}

export type { PortalViewMode }
