import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '../features/auth/api'
import { useAuth } from '../shared/auth/useAuth'
import { appEnv } from '../shared/config/env'

export function DemoAdminSessionPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { acceptSession } = useAuth()
  const [error, setError] = useState('')
  const attempted = useRef(false)

  useEffect(() => {
    if (attempted.current) return
    attempted.current = true
    const ticket = params.get('ticket')
    if (!appEnv.demoMode || !ticket) {
      setError('Liên kết quản trị demo không hợp lệ.')
      return
    }
    authApi.exchangeDemoAdminSession(ticket)
      .then((payload) => {
        acceptSession(payload)
        navigate('/admin', { replace: true })
      })
      .catch(() => setError('Liên kết đã hết hạn hoặc không hợp lệ. Hãy tạo lại từ trang quản trị production.'))
  }, [acceptSession, navigate, params])

  return (
    <main className="grid min-h-screen place-items-center bg-background p-6">
      <div className="max-w-md rounded-xl border border-outline-variant bg-surface p-6 text-center shadow-lg">
        <h1 className="text-xl font-bold">Đang mở quản trị demo</h1>
        <p className="mt-3 text-on-surface-variant">{error || 'Đang xác minh phiên ngắn hạn…'}</p>
      </div>
    </main>
  )
}
