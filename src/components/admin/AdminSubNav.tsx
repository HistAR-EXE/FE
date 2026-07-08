import { Link, useLocation } from 'react-router-dom'
import { MaterialIcon } from '../ui/MaterialIcon'

const ADMIN_TABS = [
  { to: '/admin/content', label: 'Nội dung', icon: 'inventory_2' as const },
  { to: '/admin/analytics', label: 'Thống kê', icon: 'analytics' as const },
  { to: '/admin/users', label: 'Người dùng', icon: 'group' as const },
  { to: '/admin/organizations', label: 'Tổ chức', icon: 'business' as const },
  { to: '/admin/billing', label: 'Billing', icon: 'payments' as const },
]

export function AdminSubNav() {
  const { pathname } = useLocation()

  return (
    <nav
      className="flex flex-wrap gap-2 mb-md pb-md border-b border-outline-variant/40"
      aria-label="Điều hướng quản trị"
    >
      {ADMIN_TABS.map((tab) => {
        const active = pathname === tab.to || pathname.startsWith(`${tab.to}/`)
        return (
          <Link
            key={tab.to}
            to={tab.to}
            className={`inline-flex items-center gap-1 px-md py-sm text-sm rounded-lg border transition-colors ${
              active
                ? 'border-primary/40 text-primary bg-primary/10'
                : 'border-outline-variant text-on-surface-variant hover:border-primary/30 hover:text-primary hover:bg-primary/5'
            }`}
          >
            <MaterialIcon name={tab.icon} className="text-sm" />
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
