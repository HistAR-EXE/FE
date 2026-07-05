type Props = {
  upgrading: boolean
  onUpgrade: () => void
}

export function SettingsPremiumSection({ upgrading, onUpgrade }: Props) {
  return (
    <section className="bg-surface-container border border-outline-variant rounded-xl p-lg">
      <h2 className="font-title-md mb-sm">Gói Premium</h2>
      <p className="text-sm text-on-surface-variant mb-md">Mở khóa nội dung cao cấp (demo — không có thanh toán thật).</p>
      <button
        type="button"
        onClick={onUpgrade}
        disabled={upgrading}
        className="inline-flex items-center gap-1 px-md py-sm border border-primary text-primary rounded-lg hover:bg-primary/10 disabled:opacity-60"
      >
        {upgrading ? 'Đang xử lý...' : 'Nâng cấp Premium (demo)'}
      </button>
    </section>
  )
}
