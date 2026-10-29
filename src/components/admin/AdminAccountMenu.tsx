import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../shared/auth/useAuth'
import { MaterialIcon } from '../ui/MaterialIcon'

export function AdminAccountMenu({ avatarSrc }: { avatarSrc: string }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); triggerRef.current?.focus() }
      if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && rootRef.current?.contains(document.activeElement)) {
        const items = Array.from(rootRef.current.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'))
        if (!items.length) return
        event.preventDefault()
        const current = items.indexOf(document.activeElement as HTMLButtonElement)
        const next = event.key === 'ArrowDown'
          ? (current + 1) % items.length
          : (current < 0 ? items.length - 1 : current + items.length - 1) % items.length
        items[next].focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const go = (path: string) => { setOpen(false); navigate(path) }
  const signOut = () => { setOpen(false); logout(); navigate('/login') }
  const links = [
    { label: 'Hồ sơ cá nhân', icon: 'person', path: '/profile' },
    { label: 'Cài đặt', icon: 'settings', path: '/settings' },
    { label: 'Đổi chế độ và trợ lý AI', icon: 'tune', path: '/mode-select' },
  ]

  return (
    <div className="admin-account relative" ref={rootRef}>
      <button ref={triggerRef} type="button" aria-label="Tài khoản quản trị" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((value) => !value)} className="admin-account-trigger flex items-center gap-2 rounded-xl border border-outline-variant bg-white px-1.5 py-1 text-left shadow-sm hover:border-primary">
        <img src={avatarSrc} alt="" className="h-8 w-8 rounded-lg object-cover" />
        <span className="hidden max-w-32 truncate text-sm font-semibold text-on-surface lg:block">{user?.displayName ?? 'Quản trị viên'}</span>
        <MaterialIcon name="expand_more" className="hidden text-base text-outline lg:block" />
      </button>
      {open && (
        <div role="menu" aria-label="Tài khoản quản trị" className="admin-account-popover absolute right-0 z-[80] mt-2 w-72 overflow-hidden rounded-2xl border border-outline-variant bg-white p-2 shadow-xl">
          <div className="border-b border-outline-variant px-3 py-3">
            <p className="truncate text-sm font-bold text-on-surface">{user?.displayName ?? 'Quản trị viên'}</p>
            <p className="truncate text-sm text-on-surface-variant">{user?.email ?? '—'}</p>
            <span className="mt-2 inline-flex rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">Quản trị viên TimeLens</span>
          </div>
          <div className="py-1">
            {links.map((link) => (
              <button key={link.path} type="button" role="menuitem" onClick={() => go(link.path)} className="admin-account-item flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-on-surface-variant hover:bg-surface-container-high hover:text-primary">
                <MaterialIcon name={link.icon} className="text-lg text-primary" />{link.label}
              </button>
            ))}
          </div>
          <div className="border-t border-outline-variant pt-1">
            <button type="button" role="menuitem" onClick={signOut} className="admin-account-item flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-error hover:bg-error-container">
              <MaterialIcon name="logout" className="text-lg" />Đăng xuất
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
