import { useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../shared/auth/useAuth'
import { buildLoginRedirect } from '../shared/router/returnTo'

export function JoinPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const code = searchParams.get('code')?.trim() ?? ''

  useEffect(() => {
    if (!code) {
      return
    }
    if (!user) {
      navigate(buildLoginRedirect('/join', `?code=${encodeURIComponent(code)}`), { replace: true })
      return
    }
    navigate(`/settings?joinCode=${encodeURIComponent(code)}&autoJoin=1`, { replace: true })
  }, [code, navigate, user])

  if (!code) {
    return (
      <main className="min-h-screen flex items-center justify-center p-md">
        <div className="max-w-md text-center space-y-md">
          <h1 className="font-title-md text-on-surface">Link mời không hợp lệ</h1>
          <p className="text-sm text-on-surface-variant">
            Không tìm thấy mã mời trong liên kết. Hãy nhờ giáo viên gửi lại email hoặc nhập mã 6 ký tự tại Cài
            đặt → Lớp học.
          </p>
          <Link to="/login" className="text-secondary underline text-sm">
            Đăng nhập
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-md">
      <p className="text-on-surface-variant text-sm">Đang chuyển đến tham gia lớp học...</p>
    </main>
  )
}
