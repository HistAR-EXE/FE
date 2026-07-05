type Props = {
  onLogout: () => void
}

export function SettingsLogoutSection({ onLogout }: Props) {
  return (
    <section className="bg-surface-container border border-outline-variant rounded-xl p-lg">
      <h2 className="font-title-md mb-sm">Phiên đăng nhập</h2>
      <button
        type="button"
        onClick={onLogout}
        className="px-md py-sm border border-error text-error rounded-lg hover:bg-error/5"
      >
        Đăng xuất
      </button>
    </section>
  )
}
