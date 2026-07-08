import { Link } from 'react-router-dom'
import { Button } from '../ui/Button'
import { MaterialIcon } from '../ui/MaterialIcon'

type EraLockedModalProps = {
  open: boolean
  onClose: () => void
  pricingHref?: string
  onUpgradeClick?: () => void
  /** e.g. "1948" — used in conversion headline */
  eraLabel?: string | number
  xpBonus?: number
  title?: string
  message?: string
}

export function EraLockedModal({
  open,
  onClose,
  pricingHref = '/pricing',
  onUpgradeClick,
  eraLabel = 1948,
  xpBonus = 50,
  title,
  message,
}: EraLockedModalProps) {
  if (!open) return null

  const headline =
    title ?? `Mở khoá thần tốc Era ${eraLabel} để tiếp tục mạch truyện và nhận +${xpBonus} XP`
  const body =
    message ??
    `Xem Củ Chi qua 3 thời kỳ 1948 · 1968 · 2026 — Era ${eraLabel} và các mốc Premium mở khoá ngay sau khi nâng cấp.`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-md bg-black/60" role="dialog" aria-modal="true">
      <div className="bg-surface-container border border-outline-variant rounded-xl p-lg max-w-md w-full space-y-md text-center shadow-xl">
        <MaterialIcon name="history" className="text-primary text-4xl mx-auto" />
        <div>
          <h3 className="font-title-md text-on-surface">{headline}</h3>
          <p className="text-sm text-on-surface-variant mt-xs">{body}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-sm justify-center">
          <Button type="button" variant="outline" onClick={onClose}>
            Để sau
          </Button>
          <Link to={pricingHref} onClick={onUpgradeClick}>
            <Button type="button">Nâng cấp ngay</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
