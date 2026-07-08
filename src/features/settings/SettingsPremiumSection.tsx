import { Link } from 'react-router-dom'
import type { B2cBillingStatus, B2cSubscriptionHistoryItem } from '../billing/api'

type Props = {
  upgrading: boolean
  onUpgrade: () => void
  billingStatus: B2cBillingStatus | null
  history: B2cSubscriptionHistoryItem[]
  cancelling: boolean
  onCancel: () => void
}

export function SettingsPremiumSection({ upgrading, onUpgrade, billingStatus, history, cancelling, onCancel }: Props) {
  return (
    <section className="bg-surface-container border border-outline-variant rounded-xl p-lg space-y-md">
      <h2 className="font-title-md mb-sm">Gói Premium</h2>
      <p className="text-sm text-on-surface-variant">Mở khóa nội dung cao cấp bằng thanh toán SePay QR tự xác nhận.</p>
      {billingStatus?.isActive ? (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-md text-sm space-y-1">
          <p className="font-medium text-primary">Gói Premium đang hoạt động</p>
          <p className="text-on-surface-variant">Hết hạn: {billingStatus.endDate ?? 'Chưa xác định'}</p>
          {billingStatus.daysUntilExpiry != null &&
            [7, 3, 1].includes(billingStatus.daysUntilExpiry) && (
              <p className="text-warning">Nhắc gia hạn: còn {billingStatus.daysUntilExpiry} ngày đến hạn.</p>
            )}
        </div>
      ) : (
        <div className="rounded-lg border border-outline-variant bg-surface-container-high p-md text-sm text-on-surface-variant">
          Bạn đang ở gói FREE. Nâng cấp để mở khóa đầy đủ 3 era và chat AI không giới hạn.
        </div>
      )}
      <div className="flex flex-wrap gap-sm">
        <Link
          to="/pricing"
          className="inline-flex items-center gap-1 px-md py-sm border border-outline-variant text-on-surface rounded-lg hover:bg-surface-container-high"
        >
          Xem bảng giá
        </Link>
        <button
          type="button"
          onClick={onUpgrade}
          disabled={upgrading || billingStatus?.isActive}
          className="inline-flex items-center gap-1 px-md py-sm border border-primary text-primary rounded-lg hover:bg-primary/10 disabled:opacity-60"
        >
          {billingStatus?.isActive ? 'Đã kích hoạt' : upgrading ? 'Đang chuyển hướng...' : 'Nâng cấp Premium'}
        </button>
        {billingStatus?.isActive && (
          <button
            type="button"
            onClick={onCancel}
            disabled={cancelling}
            className="inline-flex items-center gap-1 px-md py-sm border border-outline-variant text-on-surface rounded-lg hover:bg-surface-container-high disabled:opacity-60"
          >
            {cancelling ? 'Đang hủy...' : 'Hủy Premium'}
          </button>
        )}
      </div>
      <div className="space-y-sm">
        <h3 className="font-medium">Lịch sử gói B2C</h3>
        {history.length ? (
          <div className="space-y-sm">
            {history.map((item) => (
              <div key={item.id} className="rounded-lg border border-outline-variant p-md text-sm">
                <div className="flex flex-wrap items-center justify-between gap-sm">
                  <span className="font-medium">{item.isActive ? 'Đang hoạt động' : 'Đã kết thúc'}</span>
                  <span className="text-on-surface-variant">{item.priceVnd.toLocaleString('vi-VN')}đ</span>
                </div>
                <p className="text-on-surface-variant mt-1">
                  {item.startDate} {'->'} {item.endDate} · {item.paymentMethod}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-on-surface-variant">Chưa có lịch sử thanh toán B2C.</p>
        )}
      </div>
    </section>
  )
}
