import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { MaterialIcon } from '../ui/MaterialIcon'

const pageMeta: Record<string, { title: string; eyebrow: string }> = {
  '/admin': { title: 'Bàn điều hành', eyebrow: 'HISTAR / ADMIN OVERVIEW' },
  '/admin/content': { title: 'Quản trị nội dung', eyebrow: 'VẬN HÀNH / CONTENT' },
  '/admin/narrative-pilots': { title: 'Narrative pilots', eyebrow: 'VẬN HÀNH / REVIEW & ROLLOUT' },
  '/admin/trash': { title: 'Thùng rác', eyebrow: 'VẬN HÀNH / SOFT DELETE' },
  '/admin/users': { title: 'Người dùng', eyebrow: 'QUẢN LÝ / ACCESS' },
  '/admin/organizations': { title: 'Tổ chức', eyebrow: 'QUẢN LÝ / ORGANIZATIONS' },
  '/admin/billing': { title: 'Billing', eyebrow: 'QUẢN LÝ / BILLING' },
  '/admin/analytics': { title: 'Analytics', eyebrow: 'GIÁM SÁT / ANALYTICS' },
  '/admin/audit': { title: 'Lịch sử audit', eyebrow: 'GIÁM SÁT / DURABLE AUDIT' },
}

const groups = [
  {
    label: 'Vận hành',
    links: [
      ['Nội dung', '/admin/content', 'inventory_2'],
      ['Narrative pilots', '/admin/narrative-pilots', 'account_tree'],
      ['Thùng rác', '/admin/trash', 'restore_from_trash'],
    ],
  },
  {
    label: 'Quản lý',
    links: [
      ['Người dùng', '/admin/users', 'group'],
      ['Tổ chức', '/admin/organizations', 'business'],
      ['Billing', '/admin/billing', 'payments'],
    ],
  },
  {
    label: 'Giám sát',
    links: [
      ['Analytics', '/admin/analytics', 'analytics'],
      ['Audit', '/admin/audit', 'fact_check'],
    ],
  },
] as const

export function AdminConsoleLayout() {
  const { pathname } = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const routeKey = Object.keys(pageMeta)
    .sort((a, b) => b.length - a.length)
    .find((path) => pathname === path || (path !== '/admin' && pathname.startsWith(`${path}/`))) ?? '/admin'
  const { title, eyebrow } = pageMeta[routeKey]

  const navigation = (
    <nav aria-label="Điều hướng Admin Console" className="space-y-7">
      {groups.map((group) => (
        <section key={group.label}>
          <p className="px-3 mb-2 text-[10px] font-black tracking-[0.16em] uppercase text-slate-500">{group.label}</p>
          <div className="space-y-1">
            {group.links.map(([label, to, icon]) => {
              const active = pathname === to || (to !== '/admin/content' && pathname.startsWith(`${to}/`))
              return (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                    active
                      ? 'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                  }`}
                >
                  <MaterialIcon name={icon} className="text-lg" />
                  {label}
                </Link>
              )
            })}
          </div>
        </section>
      ))}
    </nav>
  )

  return (
    <div className="admin-console min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 h-[4.5rem] border-b border-slate-200 bg-white px-4 xl:px-8">
        <div className="mx-auto flex h-full max-w-[1680px] items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 md:hidden"
              aria-label="Mở menu quản trị"
            >
              <MaterialIcon name="menu" />
            </button>
            <Link to="/admin" className="flex items-center gap-2 font-black tracking-tight text-slate-950">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-amber-400 text-amber-950 shadow-sm">
                <MaterialIcon name="admin_panel_settings" className="text-xl" filled />
              </span>
              <span>Admin Console</span>
            </Link>
            <span className="hidden rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[10px] font-black tracking-widest text-amber-800 sm:inline">DEV</span>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
            <MaterialIcon name="shield_person" className="text-base text-emerald-600" />
            <span className="hidden sm:inline">ADMIN</span>
            <Link to="/home" className="ml-2 rounded-lg border border-slate-200 px-3 py-1.5 text-slate-700 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-900">Về app</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-[1680px]">
        <aside className="sticky top-[4.5rem] hidden h-[calc(100vh-4.5rem)] w-64 shrink-0 overflow-y-auto border-r border-slate-200 bg-white px-4 py-7 md:block">
          {navigation}
        </aside>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu quản trị">
            <button type="button" aria-label="Đóng menu quản trị" className="absolute inset-0 w-full bg-black/70" onClick={() => setMobileOpen(false)} />
            <aside className="relative h-full w-72 overflow-y-auto border-r border-slate-200 bg-white px-4 py-7 shadow-2xl">
              <div className="mb-8 flex items-center justify-between"><span className="font-black text-slate-950">Admin Console</span><button type="button" onClick={() => setMobileOpen(false)} aria-label="Đóng" className="text-slate-700"><MaterialIcon name="close" /></button></div>
              {navigation}
            </aside>
          </div>
        )}
        <main className="min-w-0 flex-1 px-4 py-7 sm:px-7 lg:px-10">
          <div className="mb-8 border-b border-slate-200 pb-5">
            <p className="mb-2 text-[11px] font-black tracking-[0.16em] text-amber-700">{eyebrow}</p>
            <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
