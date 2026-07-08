import { Button } from '../ui/Button'
import { MaterialIcon } from '../ui/MaterialIcon'

type OrgQuotaModalProps = {
  open: boolean
  onClose: () => void
  upgradePackage?: string | null
}

export function OrgQuotaModal({ open, onClose, upgradePackage }: OrgQuotaModalProps) {
  if (!open) return null

  const upsell =
    upgradePackage === 'PREMIUM'
      ? 'Liên hệ giáo viên để nâng lên gói Premium (AI không giới hạn).'
      : 'Liên hệ giáo viên để nâng lên gói Standard (30.000 queries/tháng).'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-md bg-black/60" role="dialog" aria-modal="true">
      <div className="bg-surface-container border border-outline-variant rounded-xl p-lg max-w-md w-full space-y-md text-center shadow-xl">
        <MaterialIcon name="school" className="text-secondary text-4xl mx-auto" />
        <div>
          <h3 className="font-title-md text-on-surface">Hết lượt AI của trường</h3>
          <p className="text-sm text-on-surface-variant mt-xs">
            Trường bạn đã dùng hết AI Pool tháng này. Tour 360°, Time Portal và Quest vẫn dùng bình thường — chỉ chat AI tạm
            khóa.
          </p>
          <p className="text-sm text-on-surface mt-sm">{upsell}</p>
        </div>
        <Button type="button" onClick={onClose}>
          Đã hiểu
        </Button>
      </div>
    </div>
  )
}
