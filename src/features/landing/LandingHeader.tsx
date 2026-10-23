import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../shared/auth/useAuth'

export function LandingHeader() {
  const { isAuthenticated, user, logout } = useAuth()
  const { pathname } = useLocation()
  const [menu, setMenu] = useState(false)
  const [account, setAccount] = useState(false)
  const ref = useRef<HTMLElement>(null)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const accountRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const close = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) { setMenu(false); setAccount(false) } }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && (menu || account)) { event.preventDefault(); (account ? accountRef : toggleRef).current?.focus(); setMenu(false); setAccount(false) } }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', escape) }
  }, [menu, account])
  const close = () => { setMenu(false); setAccount(false) }
  return <header className="tl-header" ref={ref}>
    <div className="tl-header-inner">
      <Link to="/" className="tl-brand" aria-label="TimeLens — Trang chủ" onClick={close}>
        <img src="/brand/icon-192.png" alt="" width="48" height="48" />
        <span><strong>TimeLens<span className="tl-brand-dot">✦</span></strong><small>BY HISTAR TEAM</small></span>
      </Link>
      <nav className={`tl-navigation ${menu ? 'is-open' : ''}`} id="landing-navigation" aria-label="Điều hướng trang chủ">
        <Link to="/" aria-current={pathname === '/' ? 'page' : undefined} onClick={close}>Trang chủ</Link><Link to="/about" aria-current={pathname === '/about' ? 'page' : undefined} onClick={close}>Về HistAR</Link><Link to="/pricing" aria-current={pathname === '/pricing' ? 'page' : undefined} onClick={close}>Gói trải nghiệm</Link>
      </nav>
      <div className="tl-header-actions">
        {isAuthenticated ? <div className="tl-account"><button ref={accountRef} className="tl-account-toggle" aria-label="Mở tài khoản cá nhân" aria-expanded={account} aria-controls="landing-account" onClick={() => { setAccount(!account); setMenu(false) }}>
          {user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : <span className="tl-initial">{(user?.displayName || 'T').slice(0, 1)}</span>}<span className="tl-account-name">{user?.displayName || 'Tài khoản'}</span><span aria-hidden="true">⌄</span>
        </button>{account && <div id="landing-account" className="tl-account-menu"><strong>{user?.displayName || 'Thành viên TimeLens'}</strong><small>{user?.tier === 'PREMIUM' ? 'Premium' : 'Thành viên'}</small><Link to="/profile" onClick={close}>Hồ sơ cá nhân</Link><Link to="/settings" onClick={close}>Cài đặt</Link><Link to="/settings" onClick={close}>Lịch sử thanh toán</Link><button onClick={() => { void logout(); close() }}>Đăng xuất</button></div>}</div> : <Link className="tl-header-login" to="/login">Đăng nhập <span aria-hidden="true">↗</span></Link>}
        <button className="tl-menu-toggle" ref={toggleRef} aria-label={menu ? 'Đóng điều hướng' : 'Mở điều hướng'} aria-expanded={menu} aria-controls="landing-navigation" onClick={() => { setMenu(!menu); setAccount(false) }}>{menu ? '✕' : '☰'}</button>
      </div>
    </div>
  </header>
}
