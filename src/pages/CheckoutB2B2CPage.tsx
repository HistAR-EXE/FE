import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { SimpleTopNav } from '../components/layout/TopNav'
import { Button } from '../components/ui/Button'
import { billingApi } from '../features/billing/api'
import { getFriendlyErrorMessage } from '../shared/api/errorMessages'
import { useToast } from '../shared/ui/toast/useToast'

export function CheckoutB2B2CPage() {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({
    siteName: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    packageType: 'ONE_TIME' as 'ONE_TIME' | 'OPEX',
    message: '',
  })

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      await billingApi.submitB2b2cInquiry({
        siteName: form.siteName.trim(),
        contactName: form.contactName.trim(),
        contactEmail: form.contactEmail.trim(),
        contactPhone: form.contactPhone.trim() || undefined,
        packageType: form.packageType,
        message: form.message.trim() || undefined,
      })
      setSubmitted(true)
      showToast({ message: 'Đã gửi yêu cầu số hóa di tích', type: 'success' })
    } catch (err) {
      showToast({ message: getFriendlyErrorMessage(err, 'quest'), type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLayout activeBorder="left" topNav={<SimpleTopNav title="B2B2C — Số hóa di tích" backTo="/pricing" />}>
      <main className="mt-14 md:mt-16 p-md md:p-lg max-w-lg mx-auto w-full">
        <section className="bg-surface-container border border-outline-variant rounded-xl p-lg space-y-md">
          <h1 className="font-title-md">Đăng ký gói số hóa di tích</h1>
          <p className="text-sm text-on-surface-variant">
            One-time từ 50.000.000đ/site hoặc OpEx 250.000.000đ/năm — đội HistAR liên hệ trong 2 ngày làm việc.
          </p>
          {submitted ? (
            <p className="text-sm text-secondary">Cảm ơn bạn! Chúng tôi đã nhận yêu cầu và sẽ phản hồi qua email.</p>
          ) : (
            <form onSubmit={(e) => void onSubmit(e)} className="space-y-md">
              <label className="block text-sm space-y-1">
                Tên di tích / museum
                <input
                  required
                  value={form.siteName}
                  onChange={(e) => setForm((f) => ({ ...f, siteName: e.target.value }))}
                  className="w-full rounded-lg border border-outline-variant bg-surface px-md py-sm"
                />
              </label>
              <label className="block text-sm space-y-1">
                Người liên hệ
                <input
                  required
                  value={form.contactName}
                  onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))}
                  className="w-full rounded-lg border border-outline-variant bg-surface px-md py-sm"
                />
              </label>
              <label className="block text-sm space-y-1">
                Email
                <input
                  required
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                  className="w-full rounded-lg border border-outline-variant bg-surface px-md py-sm"
                />
              </label>
              <label className="block text-sm space-y-1">
                Gói
                <select
                  value={form.packageType}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, packageType: e.target.value as 'ONE_TIME' | 'OPEX' }))
                  }
                  className="w-full rounded-lg border border-outline-variant bg-surface px-md py-sm"
                >
                  <option value="ONE_TIME">One-time — từ 50.000.000đ/site</option>
                  <option value="OPEX">OpEx — 250.000.000đ/năm</option>
                </select>
              </label>
              <label className="block text-sm space-y-1">
                Ghi chú
                <textarea
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  className="w-full rounded-lg border border-outline-variant bg-surface px-md py-sm min-h-24"
                />
              </label>
              <div className="flex gap-sm">
                <Link to="/pricing" className="flex-1">
                  <Button type="button" variant="outline" className="w-full">
                    Quay lại
                  </Button>
                </Link>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? 'Đang gửi...' : 'Gửi yêu cầu'}
                </Button>
              </div>
            </form>
          )}
        </section>
      </main>
    </AppLayout>
  )
}
