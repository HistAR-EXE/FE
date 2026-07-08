import { Link } from 'react-router-dom'
import { Button } from '../ui/Button'
import { MaterialIcon } from '../ui/MaterialIcon'

type QuotaExceededModalProps = {
  open: boolean
  onClose: () => void
  onUpgrade?: () => void
  pricingHref?: string
  dailyLimit?: number
  priceVnd?: number
}

export function QuotaExceededModal({
  open,
  onClose,
  onUpgrade,
  pricingHref = '/pricing',
  dailyLimit = 10,
  priceVnd = 49_000,
}: QuotaExceededModalProps) {
  if (!open) return null

  const priceLabel = `${priceVnd.toLocaleString('vi-VN')}đ/tháng`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-md bg-black/60" role="dialog" aria-modal="true">
      <div className="bg-surface-container border border-outline-variant rounded-xl p-lg max-w-md w-full space-y-md text-center shadow-xl">
        <MaterialIcon name="forum" className="text-primary text-4xl mx-auto" />
        <div>
          <h3 className="font-title-md text-on-surface">Hết lượt chat hôm nay</h3>
          <p className="text-sm text-on-surface-variant mt-xs">
            Bạn đã dùng hết {dailyLimit} lượt chat miễn phí. Nâng cấp Premium để chat không giới hạn và xem nguồn trích dẫn
            chính thống.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-sm justify-center">
          <Button type="button" variant="outline" onClick={onClose}>
            Quay lại sau
          </Button>
          {onUpgrade ? (
            <Button type="button" onClick={onUpgrade}>
              Nâng cấp {priceLabel}
            </Button>
          ) : (
            <Link to={pricingHref}>
              <Button type="button">Nâng cấp {priceLabel}</Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
